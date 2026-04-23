use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::errors::PrivyFiError;
use crate::state::{MockPool, UserPosition, UserProfile};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, MockPool>,

    /// Unique Receipt account for a user
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"position", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    // we need the user profile so the user check the total amount he staked
    #[account(mut, seeds=[b"profile", user.key().as_ref()], bump = user_profile.bump)]
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

    #[account(mut, address = pool.supply_vault)]
    pub pool_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn deposit_handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let decimals = ctx.accounts.mint_token.decimals;

    let cpi_accounts = TransferChecked {
        mint: ctx.accounts.mint_token.to_account_info(),
        from: ctx.accounts.user_token.to_account_info(),
        to: ctx.accounts.pool_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.key();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token_interface::transfer_checked(cpi_context, amount, decimals)?;

    // Update Pool State
    let pool = &mut ctx.accounts.pool;
    pool.total_staked = pool
        .total_staked
        .checked_add(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // Update User Position State
    let user_position = &mut ctx.accounts.user_position;
    if user_position.amount == 0 {
        user_position.owner = ctx.accounts.user.key();
        user_position.pool = ctx.accounts.pool.key();
        user_position.start_time = Clock::get()?.unix_timestamp;
        user_position.bump = ctx.bumps.user_position;
    }

    user_position.amount = user_position
        .amount
        .checked_add(amount)
        .ok_or(PrivyFiError::Overflow)?;

    //the global amount for the user need to increase too so the user can check from the one place
    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.total_staked = user_profile
        .total_staked
        .checked_add(amount)
        .ok_or(PrivyFiError::Overflow)?;

    Ok(())
}
