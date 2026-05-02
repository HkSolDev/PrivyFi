use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::state::{MockPool, UserPosition, UserProfile};
use crate::PrivyFiError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// On full withdrawal (amount reaches 0) Anchor will automatically:
    ///   1. Zero-fill the account data (prevents discriminator staleness)
    ///   2. Transfer rent lamports back to `user`
    ///   3. Mark the account as closed
    /// This is the safe pattern that allows `init_if_needed` in deposit to
    /// re-create the PDA cleanly on the next deposit.
    #[account(
        mut,
        seeds = [b"position", user.key().as_ref(), pool.key().as_ref()],
        bump = user_position.bump,
        close = user,
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(
        mut,
        seeds = [b"pool", pool.vault_name.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, MockPool>,

    pub mint_token: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_token,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, address = pool.supply_vault)]
    pub pool_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn withdraw_handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let user_position = &mut ctx.accounts.user_position;
    let pool_vault = &ctx.accounts.pool_vault;

    // Guards
    require_gt!(amount, 0, PrivyFiError::InvalidAmount);
    require_gte!(pool_vault.amount, amount, PrivyFiError::InsufficientBalance);
    require_gte!(
        user_position.amount,
        amount,
        PrivyFiError::InsufficientBalance
    );

    let decimals = ctx.accounts.mint_token.decimals;

    // ── 1. Transfer tokens: pool vault → user token account ────────────────
    let cpi_accounts = TransferChecked {
        mint: ctx.accounts.mint_token.to_account_info(),
        from: ctx.accounts.pool_vault.to_account_info(),
        to: ctx.accounts.user_token.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };

    let bump = ctx.accounts.pool.bump;
    let vault_name = ctx.accounts.pool.vault_name.clone();
    let seeds: &[&[u8]] = &[b"pool", vault_name.as_bytes(), &[bump]];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        cpi_accounts,
        signer_seeds,
    );
    token_interface::transfer_checked(cpi_context, amount, decimals)?;

    // ── 2. Update pool total ────────────────────────────────────────────────
    let pool = &mut ctx.accounts.pool;
    pool.total_staked = pool
        .total_staked
        .checked_sub(amount)
        .ok_or(PrivyFiError::Overflow)?;

    // ── 3. Update position ─────────────────────────────────────────────────
    // Note: if this brings amount to 0, the `close = user` constraint on the
    // account struct will close the PDA automatically after this instruction
    // completes — no manual lamport manipulation needed.
    let user_position = &mut ctx.accounts.user_position;
    user_position.amount = user_position
        .amount
        .checked_sub(amount)
        .ok_or(PrivyFiError::Overflow)?;

    // ── 4. Update user global profile ──────────────────────────────────────
    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.total_staked = user_profile
        .total_staked
        .checked_sub(amount)
        .ok_or(PrivyFiError::Overflow)?;

    Ok(())
}

