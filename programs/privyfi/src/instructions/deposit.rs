use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::errors::PrivyFiError;
use crate::state::{MockPool, UserPosition, UserProfile, UserReward};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, MockPool>,

    /// Receipt PDA — created on first deposit, updated on subsequent deposits.
    /// init_if_needed: If the account doesn't exist yet (first deposit or after a
    /// full withdrawal closed it), Anchor allocates it. If it already exists, it
    /// simply passes through. This is what allows multiple deposits.
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"position", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub mint_token: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint_token,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"reward", user.key().as_ref()],
        bump = user_reward.bump,
        constraint = user_reward.owner == user.key()
    )]
    pub user_reward: Account<'info, UserReward>,

    #[account(mut, address = pool.supply_vault)]
    pub pool_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn deposit_handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Guard: cannot deposit zero
    require_gt!(amount, 0, PrivyFiError::InvalidAmount);

    let decimals = ctx.accounts.mint_token.decimals;

    // ── 1. Transfer tokens from user → pool vault ──────────────────────────
    let cpi_accounts = TransferChecked {
        mint: ctx.accounts.mint_token.to_account_info(),
        from: ctx.accounts.user_token.to_account_info(),
        to: ctx.accounts.pool_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_context = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
    token_interface::transfer_checked(cpi_context, amount, decimals)?;

    // ── 2. Update pool total ────────────────────────────────────────────────
    let pool = &mut ctx.accounts.pool;
    pool.total_staked = pool
        .total_staked
        .checked_add(amount)
        .ok_or(PrivyFiError::Overflow)?;

    // ── 3. Update user position ─────────────────────────────────────────────
    // `amount == 0` means this is either the first ever deposit OR the account
    // was just re-created after a full withdrawal closed it. Both cases need
    // a fresh initialization of the identity fields.
    let now = Clock::get()?.unix_timestamp;
    let user_position = &mut ctx.accounts.user_position;

    if user_position.amount == 0 {
        // Fresh position: write identity fields
        user_position.owner = ctx.accounts.user.key();
        user_position.pool = ctx.accounts.pool.key();
        user_position.start_time = now;
        user_position.bump = ctx.bumps.user_position;
    }

    // Always update the last deposit time and accumulate
    user_position.last_deposit_time = now;
    user_position.amount = user_position
        .amount
        .checked_add(amount)
        .ok_or(PrivyFiError::Overflow)?;

    // ── 4. Update user global profile ──────────────────────────────────────
    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.total_staked = user_profile
        .total_staked
        .checked_add(amount)
        .ok_or(PrivyFiError::Overflow)?;

    // ── 5. Reward points ────────────────────────────────────────────────────
    ctx.accounts.user_reward.add_point(amount)?;

    Ok(())
}
