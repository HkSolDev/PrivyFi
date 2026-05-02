use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct InitializeFaucet<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA for faucet authority
    #[account(
        seeds = [b"faucet", mint.key().as_ref()],
        bump
    )]
    pub faucet_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = faucet_authority,
        associated_token::token_program = token_program
    )]
    pub faucet_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_faucet(_ctx: Context<InitializeFaucet>) -> Result<()> {
    Ok(())
}
