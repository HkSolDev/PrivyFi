use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::{AccuracyMarket, UserPrediction};
use crate::errors::PrivyFiError;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct CrankPayouts<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,

    #[account(
        mut,
        seeds = [b"accuracy_market", market.oracle_feed.as_ref(), round_id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.is_resolved @ PrivyFiError::MarketNotResolved
    )]
    pub market: Box<Account<'info, AccuracyMarket>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = market,
    )]
    pub market_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = cranker,
        associated_token::mint = mint,
        associated_token::authority = cranker,
        associated_token::token_program = token_program
    )]
    pub cranker_vault: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
    
    // REMAINING ACCOUNTS:
    // The bot will pass an array of accounts in pairs via the frontend/script:
    // [UserPrediction PDA 1, User Token Account 1, UserPrediction PDA 2, User Token Account 2, ...]
}

pub fn crank_payouts_handler<'info>(ctx: Context<'info, CrankPayouts<'info>>, _round_id: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    let cranker = &mut ctx.accounts.cranker;
    let mut total_cranker_usdc_bounty: u64 = 0;

    // Grab the dynamic list of users the bot passed in
    let account_info_iter = &mut ctx.remaining_accounts.iter();

    // Loop through the users in pairs (Prediction PDA + User Token Account)
    while account_info_iter.len() >= 2 {
        let prediction_info = next_account_info(account_info_iter)?;
        let user_vault_info = next_account_info(account_info_iter)?;

        // 1. Safely deserialize the prediction account manually
        // We do this manually to save massive amounts of Compute Units (CUs)
        let prediction = {
            let data = prediction_info.try_borrow_data()?;
            UserPrediction::try_deserialize(&mut &data[..])?
        };

        // Security: Ensure the PDA belongs to THIS market and hasn't been claimed
        require_keys_eq!(prediction.market, market.key(), PrivyFiError::InvalidMarket);
        if prediction.claimed { 
            continue; // Skip if already processed
        }

        // 2. Trepa Convex Math (Using the Median Error)
        let actual_bucket = market.actual_bucket.ok_or(PrivyFiError::MarketNotResolved)?;
        let calc_median = market.median_error.ok_or(PrivyFiError::MarketNotResolved)?;
        let calc_weight = market.total_winning_weight.ok_or(PrivyFiError::NoPayout)?;

        let error = (prediction.predicted_bucket as i32 - actual_bucket as i32).abs() as u8;
        
        let mut user_payout: u64 = 0;
        let mut cranker_fee: u64 = 0;

        // User wins if their error is strictly less than the median
        if error < calc_median || (calc_median == 0 && error == 0) {
            let weight = if calc_median == 0 { 
                1u128 
            } else { 
                ((calc_median - error) as u128).pow(2) 
            };

            // Safe Math: (Weight * User Amount * Total Liquidity) / Total Winning Weight
            let my_total_weight = weight * (prediction.amount as u128);
            let gross_payout = my_total_weight
                .checked_mul(market.total_pool_amount as u128)
                .ok_or(PrivyFiError::Overflow)?
                .checked_div(calc_weight)
                .ok_or(PrivyFiError::Overflow)? as u64;

            // Take a 1% bounty for the cranker from the winnings
            cranker_fee = gross_payout
                .checked_mul(1)
                .ok_or(PrivyFiError::Overflow)?
                .checked_div(100)
                .ok_or(PrivyFiError::Overflow)?;
            user_payout = gross_payout
                .checked_sub(cranker_fee)
                .ok_or(PrivyFiError::Overflow)?;
        }

        // 3. Transfer USDC to the User (if they won)
        if user_payout > 0 {
            let seeds = &[
                b"accuracy_market",
                market.oracle_feed.as_ref(),
                &market.round_id.to_le_bytes(),
                &[market.bump],
            ];
            let signer_seeds = &[&seeds[..]];

            let cpi_accounts = TransferChecked {
                from: ctx.accounts.market_vault.to_account_info(),
                to: user_vault_info.clone(), // The user's token account passed by the bot
                mint: ctx.accounts.mint.to_account_info(),
                authority: market.to_account_info(),
            };
            
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.key(), 
                cpi_accounts, 
                signer_seeds
            );
            
            token_interface::transfer_checked(cpi_ctx, user_payout, ctx.accounts.mint.decimals)?;

            // Accumulate the cranker's USDC fee
            total_cranker_usdc_bounty = total_cranker_usdc_bounty
                .checked_add(cranker_fee)
                .ok_or(PrivyFiError::Overflow)?;
        }

        // 4. THE SOLANA RENT BOUNTY: Burn the PDA and give the SOL to the Cranker!
        // This transfers the ~0.002 SOL storage rent directly to the bot.
        let lamports = prediction_info.lamports();
        **prediction_info.lamports.borrow_mut() = 0;
        **cranker.lamports.borrow_mut() = cranker
            .lamports()
            .checked_add(lamports)
            .ok_or(PrivyFiError::Overflow)?;

        // Zero out data to securely delete the account state
        let mut dest_data = prediction_info.try_borrow_mut_data()?;
        for byte in dest_data.iter_mut() {
            *byte = 0;
        }
    }

    // 5. Transfer the accumulated USDC bounty to the cranker in one bulk transfer
    if total_cranker_usdc_bounty > 0 {
        let seeds = &[
            b"accuracy_market",
            market.oracle_feed.as_ref(),
            &market.round_id.to_le_bytes(),
            &[market.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.market_vault.to_account_info(),
            to: ctx.accounts.cranker_vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: market.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(), 
            cpi_accounts, 
            signer_seeds
        );
        token_interface::transfer_checked(cpi_ctx, total_cranker_usdc_bounty, ctx.accounts.mint.decimals)?;
    }

    msg!("Crank completed! Total cranker bounty: {} USDC", total_cranker_usdc_bounty);

    Ok(())
}
