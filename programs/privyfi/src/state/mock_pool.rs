use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct MockPool {
    pub mint_token: Pubkey,
    pub supply_vault: Pubkey,
    #[max_len(50)]
    pub vault_name: String,
    pub apy_bps: u64,
    pub total_staked: u64,
    pub bump: u8,
}
