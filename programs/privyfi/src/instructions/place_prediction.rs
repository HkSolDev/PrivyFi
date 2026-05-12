use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::{AccuracyMarket, UserPrediction};
use crate::errors::PrivyFiError;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct PlacePrediction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + AccuracyMarket::INIT_SPACE,
        seeds = [b"accuracy_market", oracle_feed.key().as_ref(), round_id.to_le_bytes().as_ref()],
        bump  
    )]
    pub market: Box<Account<'info, AccuracyMarket>>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserPrediction::INIT_SPACE,
        seeds = [b"prediction", user.key().as_ref(), market.key().as_ref()],
        bump
    )]
    pub user_prediction: Account<'info, UserPrediction>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = market,
        associated_token::token_program = token_program,
    )]
    pub market_vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: Oracle feed pubkey used as seed for PDA derivation. Not deserialized here.
    pub oracle_feed: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn place_prediction_handler(
    ctx: Context<PlacePrediction>,
    round_id: u64,
    predicted_bucket: u8,
    amount: u64,
) -> Result<()> {
    require_gt!(amount, 0, PrivyFiError::InvalidAmount);
    require!(predicted_bucket < 100, PrivyFiError::InvalidBucket);

    let market = &mut ctx.accounts.market;

    // If this is a freshly initialized market (auto-created), set up initial state
    if market.total_pool_amount == 0 && market.total_participants == 0 {
        let clock = Clock::get()?;
        market.oracle_feed = ctx.accounts.oracle_feed.key();
        market.round_id = round_id;
        market.bump = ctx.bumps.market;
        market.is_resolved = false;
        market.entry_fee = 10_000_000;
        market.prediction_histogram = [0; 100];
        market.betting_deadline = clock.unix_timestamp + 30;
        market.actual_bucket = None;
        market.median_error = None;
        market.total_winning_weight = None;
    } else if market.betting_deadline > 0 {
        // Only check betting deadline if market was initialized with one
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time < market.betting_deadline, PrivyFiError::BettingWindowClosed);
    }

    require!(!market.is_resolved, PrivyFiError::MarketAlreadyResolved);

    let decimals = ctx.accounts.mint.decimals;

    // 1. Transfer USDC from user to market vault
    let cpi_accounts = TransferChecked {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.user_token.to_account_info(),
        to: ctx.accounts.market_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_context = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
    token_interface::transfer_checked(cpi_context, amount, decimals)?;

    // 2. Update Market State
    market.total_pool_amount = market.total_pool_amount
        .checked_add(amount)
        .ok_or(PrivyFiError::Overflow)?;

    // Tally into histogram bucket by dollar amount
    market.prediction_histogram[predicted_bucket as usize] = market.prediction_histogram[predicted_bucket as usize]
        .checked_add(amount)
        .ok_or(PrivyFiError::Overflow)?;

    // Only increment participants if it's a new prediction for this user
    if ctx.accounts.user_prediction.amount == 0 {
        market.total_participants = market.total_participants
            .checked_add(1)
            .ok_or(PrivyFiError::Overflow)?;
    }

    // 3. Update User Prediction State
    let user_prediction = &mut ctx.accounts.user_prediction;

    if user_prediction.amount > 0 {
        require_eq!(
            user_prediction.predicted_bucket,
            predicted_bucket,
            PrivyFiError::CannotChangeBucket
        );
    }

    user_prediction.owner = ctx.accounts.user.key();
    user_prediction.market = ctx.accounts.market.key();
    user_prediction.predicted_bucket = predicted_bucket;
    user_prediction.claimed = false;
    user_prediction.amount = user_prediction.amount
        .checked_add(amount)
        .ok_or(PrivyFiError::Overflow)?;
    user_prediction.bump = ctx.bumps.user_prediction;

    Ok(())
}
