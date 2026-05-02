use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
/// UserPosition is like a bank receipt — it records how much the user deposited,
/// when they started, and is re-initialized cleanly each time they open a new position.
pub struct UserPosition {
    pub owner: Pubkey,
    pub pool: Pubkey,
    /// Timestamp of the very first deposit into this position slot
    pub start_time: i64,
    /// Timestamp updated on every subsequent deposit
    pub last_deposit_time: i64,
    pub amount: u64,
    pub bump: u8,
}
