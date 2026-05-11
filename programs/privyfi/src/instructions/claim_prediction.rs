use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::{AccuracyMarket, UserPrediction};
use crate::errors::PrivyFiError;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct ClaimPrediction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"accuracy_market", market.oracle_feed.as_ref(), round_id.to_le_bytes().as_ref()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, AccuracyMarket>>,

    #[account(
        mut,
        seeds = [b"prediction", user.key().as_ref(), market.key().as_ref()],
        bump = user_prediction.bump
    )]
    pub user_prediction: Account<'info, UserPrediction>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = market,
    )]
    pub market_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_token: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn claim_prediction_handler(ctx: Context<ClaimPrediction>, _round_id: u64) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let user_prediction = &mut ctx.accounts.user_prediction;

    require!(market.is_resolved, PrivyFiError::MarketNotResolved);
    require!(!user_prediction.claimed, PrivyFiError::AlreadyClaimed);

    let actual_bucket = market.actual_bucket.ok_or(PrivyFiError::MarketNotResolved)?;
    let median_error = market.median_error.ok_or(PrivyFiError::MarketNotResolved)?;
    let total_weight = market.total_winning_weight.ok_or(PrivyFiError::NoPayout)?;

    let my_error = (user_prediction.predicted_bucket as i32 - actual_bucket as i32).abs() as u8;

    if median_error > 0 {
        require!(my_error < median_error, PrivyFiError::NotAWinner);
    } else {
        require!(my_error == 0, PrivyFiError::NotAWinner);
    }

    let my_weight = if median_error > 0 {
        ((median_error - my_error) as u128).pow(2)
    } else {
        1
    };

    let my_total_weight = my_weight * (user_prediction.amount as u128);
    let payout = my_total_weight
        .checked_mul(market.total_pool_amount as u128)
        .ok_or(PrivyFiError::Overflow)?
        .checked_div(total_weight)
        .ok_or(PrivyFiError::Overflow)? as u64;

    require!(payout > 0, PrivyFiError::NoPayout);
    user_prediction.claimed = true;

    let seeds = &[
        b"accuracy_market".as_ref(), 
        market.oracle_feed.as_ref(), 
        &market.round_id.to_le_bytes(),
        &[market.bump]
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.market_vault.to_account_info(),
        to: ctx.accounts.user_token.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: market.to_account_info(), 
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(), 
        cpi_accounts, 
        signer_seeds 
    );

    anchor_spl::token_interface::transfer_checked(cpi_ctx, payout, ctx.accounts.mint.decimals)?;

    Ok(())
}
