use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::{AccuracyMarket, UserPrediction};
use crate::errors::PrivyFiError;

#[derive(Accounts)]
pub struct PlacePrediction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"accuracy_market", market.oracle_feed.as_ref()],
        bump = market.bump
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
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_token: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = market,
    )]
    pub market_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
}

pub fn place_prediction_handler(
    ctx: Context<PlacePrediction>,
    predicted_bucket: u8,
    amount: u64,
) -> Result<()> {
    require_gt!(amount, 0, PrivyFiError::InvalidAmount);
    
    let market = &mut ctx.accounts.market;
    require!(!market.is_resolved, PrivyFiError::InvalidAmount); // Need a better error or use it for now
    require!(predicted_bucket < 100, PrivyFiError::InvalidAmount);
    require!(amount == market.entry_fee, PrivyFiError::InvalidAmount);

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
    market.total_pool_amount = market.total_pool_amount.checked_add(amount).ok_or(PrivyFiError::Overflow)?;
    
    // Histogram Logic
    market.prediction_histogram[predicted_bucket as usize] += 1;
    
    // Only increment participants if it's a new prediction for this user
    if ctx.accounts.user_prediction.amount == 0 {
        market.total_participants += 1;
    }

    // 3. Update User Prediction State
    let user_prediction = &mut ctx.accounts.user_prediction;
    user_prediction.owner = ctx.accounts.user.key();
    user_prediction.market = ctx.accounts.market.key();
    user_prediction.predicted_bucket = predicted_bucket;
    user_prediction.claimed = false;
    user_prediction.amount = user_prediction.amount.checked_add(amount).ok_or(PrivyFiError::Overflow)?;
    user_prediction.bump = ctx.bumps.user_prediction;

    Ok(())
}
