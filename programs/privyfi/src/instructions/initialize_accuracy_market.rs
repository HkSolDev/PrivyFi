use anchor_lang::prelude::*;
use crate::state::AccuracyMarket;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct InitializeAccuracyMarket<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + AccuracyMarket::INIT_SPACE,
        seeds = [b"accuracy_market", oracle_feed.key().as_ref()],
        bump
    )]
    pub market: Box<Account<'info, AccuracyMarket>>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = market,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// The Pyth price feed account (PriceUpdateV2)
    /// CHECK: This is just used as a seed and reference
    pub oracle_feed: UncheckedAccount<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
}

pub fn initialize_accuracy_market_handler(
    ctx: Context<InitializeAccuracyMarket>,
    base_price: u64,
    precision_step: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.oracle_feed = ctx.accounts.oracle_feed.key();
    market.vault = ctx.accounts.vault.key();
    market.base_price = base_price;
    market.precision_step = precision_step;
    market.total_pool_amount = 0;
    market.total_participants = 0;
    market.is_resolved = false;
    market.final_price = 0;
    market.bump = ctx.bumps.market;
    
    // Histogram fields
    market.entry_fee = 10_000_000; // e.g., 10 USDC (assuming 6 decimals)
    market.prediction_histogram = [0; 100];
    market.actual_bucket = None;
    market.median_error = None;
    market.total_winning_weight = None;

    Ok(())
}
