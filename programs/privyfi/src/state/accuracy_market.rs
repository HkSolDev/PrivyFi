use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AccuracyMarket {
    pub oracle_feed: Pubkey,
    pub vault: Pubkey,
    pub base_price: u64,
    pub precision_step: u64,
    pub total_pool_amount: u64,
    pub total_participants: u32,
    pub is_resolved: bool,
    pub final_price: u64,
    pub round_id: u64,
    pub bump: u8,
    pub entry_fee: u64,
    pub prediction_histogram: [u64; 100],
    pub betting_deadline: i64,
    pub actual_bucket: Option<u8>,
    pub median_error: Option<u8>,
    pub total_winning_weight: Option<u128>,
}

#[account]
#[derive(InitSpace)]
pub struct UserPrediction {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub predicted_bucket: u8,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}
