use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct UserReward{
    pub owner: Pubkey,
    /// How much the user earn the reward
    pub total_reward_points: u64,
    pub bump: u8,
}