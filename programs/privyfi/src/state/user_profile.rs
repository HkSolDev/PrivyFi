use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub total_staked: u64,
    pub total_reward_earn: u64, //How much a user earn the reward
    pub private_mode: bool,
    pub bump: u8,
}
