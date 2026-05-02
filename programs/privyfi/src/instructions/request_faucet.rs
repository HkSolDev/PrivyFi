use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};

#[derive(Accounts)]
pub struct RequestFaucet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: PDA for faucet authority
    #[account(
        seeds = [b"faucet", mint.key().as_ref()],
        bump
    )]
    pub faucet_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = faucet_authority,
        associated_token::token_program = token_program
    )]
    pub faucet_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn request_faucet(ctx: Context<RequestFaucet>, amount: u64) -> Result<()> {
    let mint_key = ctx.accounts.mint.key();
    let bump = ctx.bumps.faucet_authority;
    let signer_seeds: &[&[&[u8]]] = &[&[b"faucet", mint_key.as_ref(), &[bump]]];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.faucet_vault.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.faucet_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.key();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    Ok(())
}
