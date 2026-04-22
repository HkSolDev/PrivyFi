use anchor_lang::prelude::*;

use anchor_spl::token_interface::{self,Mint, TokenAccount, TokenInterface, TransferChecked};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::{MockPool, UserProfile};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]    
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
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

pub fn withdraw_handler(ctx:Context<Withdraw>, amount:u64) -> Result<()> {
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
pool.total_staked = pool.total_staked.checked_sub(amount).ok_or(ProgramError::ArithmeticOverflow)?;

let user_profile = &mut ctx.accounts.user_profile;
user_profile.total_staked = user_profile.total_staked.checked_add(amount).ok_or(ProgramError::ArithmeticOverflow)?;


Ok(())
}