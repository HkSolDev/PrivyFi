use anchor_lang::prelude::*;

#[account]
pub struct YieldStore {
    pub authority: Pubkey,        // The wallet that can update yields (you)
    pub last_updated: i64,        // Timestamp of last update
    pub strategies: Vec<YieldData>, // The actual yield data
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct YieldData {
    pub protocol: u8,    // 0=Meteora, 1=Kamino, 2=Orca, 3=Raydium
    pub pool_type: u8,   // 0=DLMM, 1=AMM, 2=Lending, 3=Vault
    pub apy_bps: u32,    // APY in basis points (e.g. 745 = 7.45%)
    pub tvl_usd: u64,    // TVL in USD cents
    pub risk: u8,        // 0=Low, 1=Medium, 2=High
    pub address: Pubkey, // The pool address on-chain
}

impl YieldStore {
    // 8 discriminator + 32 authority + 8 timestamp + 4 (vec length) + (20 strategies * ~50 bytes each)
    pub const MAX_SIZE: usize = 8 + 32 + 8 + 4 + (20 * 52); 
}
