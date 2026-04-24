use anchor_lang::prelude::*;

use crate::{UserReward};

#[derive(Accounts)]
pub struct RecordAction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,



    #[account(
        mut, 
        seeds=[b"reward", user.key().as_ref()], 
        bump = user_reward.bump,
        constraint = user_reward.owner == user.key()
    )]
    pub user_reward: Account<'info, UserReward>,


    pub system_program: Program<'info, System>

}

pub fn reward_handler(ctx: Context<RecordAction>, amount:u64) -> Result<()> {
  ctx.accounts.user_reward.add_point(amount)?;
    Ok(())
}