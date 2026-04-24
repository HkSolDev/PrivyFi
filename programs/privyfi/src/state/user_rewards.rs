use anchor_lang::prelude::*;

use crate::errors::PrivyFiError;

#[derive(InitSpace)]
#[account]
pub struct UserReward {
    pub owner: Pubkey,
    /// How much the user earn the reward
    pub total_reward_points: u64,
    pub bump: u8,
}

impl UserReward {
    pub fn add_point(&mut self , amount:u64) -> Result<()> {
        self.total_reward_points = self.total_reward_points
            .checked_add(amount)
            .ok_or(PrivyFiError::Overflow)?;
        Ok(())
    }
}