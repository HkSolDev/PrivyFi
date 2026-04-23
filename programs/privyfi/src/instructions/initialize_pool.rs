use crate::state::MockPool;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + MockPool::INIT_SPACE,
        seeds = [b"pool", name.as_bytes()],
        bump
    )]
    pub pool: Account<'info, MockPool>,

    pub mint_token: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint_token,
        associated_token::authority = pool,
        associated_token::token_program = token_program
    )]
    pub pool_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn create_pool(ctx: Context<InitializePool>, name: String, apy_bps: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.mint_token = ctx.accounts.mint_token.key();
    pool.supply_vault = ctx.accounts.pool_vault.key();
    pool.vault_name = name;
    pool.apy_bps = apy_bps;
    pool.total_staked = 0;
    pool.bump = ctx.bumps.pool;
    Ok(())
}
