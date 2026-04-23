use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{PrivyFiError, user_position};
use crate::state::{MockPool, UserProfile,UserPosition};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// needed for the use pool staked
    #[account(mut,seeds=[b"profile", user.key().as_ref()], bump = user_profile.bump)]
    pub user_profile: Account<'info, UserProfile>,

    //need to debit from the global pda for the user 
    #[account(mut, seeds = [b"position", user.key().as_ref(), pool.key().as_ref()], bump = user_position.bump)]
    pub user_position: Account<'info, UserPosition>,

    /// pool form which the debit happen
    #[account(mut, seeds = [b"pool", pool.vault_name.as_ref()], bump = pool.bump)]
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

// The withdraw amount cant be 0
    require_gt!(amount, 0, PrivyFiError::InvalidAmount);

    // Guard: user cannot withdraw more than they deposited
    require_gte!(user_position.amount,amount, PrivyFiError::InsufficientBalance);
    let decimals = ctx.accounts.mint_token.decimals;

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

    let cpi_program = ctx.accounts.token_program.key();
    let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

    token_interface::transfer_checked(cpi_context, amount, decimals)?;

    let pool = &mut ctx.accounts.pool;
    pool.total_staked = pool
        .total_staked
        .checked_sub(amount)
        .ok_or(PrivyFiError::Overflow)?;

let user_position = &mut ctx.accounts.user_position;
user_position.amount = user_position.amount.checked_sub(amount).ok_or(PrivyFiError::Overflow)?;

// Subtract form the user global profile in own program
    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.total_staked = user_profile
        .total_staked
        .checked_sub(amount)
        .ok_or(PrivyFiError::Overflow)?;



// close the user_position when the staked_amount become zero

if user_position.amount == 0 {
    let user_position_acc = user_position.to_account_info();
    let user_acc = ctx.accounts.user.to_account_info();

    let lamport = user_position_acc.lamports();
    **user_position_acc.try_borrow_mut_lamports()? -= lamport;
    **user_acc.try_borrow_mut_lamports()? += lamport; //why deference two time

    user_position_acc.data.borrow_mut().fill(0);
}

    Ok(())
}
