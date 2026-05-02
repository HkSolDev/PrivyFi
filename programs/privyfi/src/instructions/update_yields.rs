use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program::ID as SYSTEM_PROGRAM_ID;
use crate::state::yield_store::*;

pub fn update_yields_handler(ctx: Context<UpdateYields>, strategies: Vec<YieldData>) -> Result<()> {
    let yield_store = &mut ctx.accounts.yield_store;
    yield_store.authority = ctx.accounts.authority.key();
    yield_store.last_updated = Clock::get()?.unix_timestamp;
    yield_store.strategies = strategies;
    Ok(())
}

pub fn initialize_yield_store_handler(ctx: Context<InitializeYieldStore>) -> Result<()> {
    let yield_store = &mut ctx.accounts.yield_store;
    yield_store.authority = ctx.accounts.authority.key();
    yield_store.last_updated = 0;
    yield_store.strategies = vec![];
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeYieldStore<'info> {
    #[account(
        init,
        payer = authority,
        space = YieldStore::MAX_SIZE,
        seeds = [b"yield-store"],
        bump
    )]
    pub yield_store: Account<'info, YieldStore>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateYields<'info> {
    #[account(
        mut,
        seeds = [b"yield-store"],
        bump,
        has_one = authority @ crate::errors::PrivyFiError::Unauthorized
    )]
    pub yield_store: Account<'info, YieldStore>,
    pub authority: Signer<'info>,
}
