use crate::state::{UserProfile, UserReward};
use anchor_lang::prelude::*;

#[derive(Accounts)]
/// In this create the user_profile and the user_reward State for the user.
pub struct InitializeUser<'info> {
    /// The user have to be the signer and his key used to create the pda
    #[account(mut)]
    pub signer: Signer<'info>,
    /// The user profile account is created with the help of the signer key and the name of the user
    #[account(init, payer = signer, space = 8 + UserProfile::INIT_SPACE, seeds = [b"profile",signer.key().as_ref()],bump)]
    pub user_profile: Account<'info, UserProfile>,

    /// Create the userReward Pda this will show all collectively all the reward earn by the user
    #[account(init, payer = signer, space = 8 + UserReward::INIT_SPACE, seeds = [b"reward",signer.key().as_ref()], bump)]
    pub user_reward: Account<'info, UserReward>,

    pub system_program: Program<'info, System>,
}

pub fn create_user(ctx: Context<InitializeUser>) -> Result<()> {
    /// Get the UserProfile Account & setting the value in the UserProfile State
    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.owner = ctx.accounts.signer.key();
    user_profile.total_staked = 0;
    user_profile.total_reward_earn = 0;
    user_profile.private_mode = false;
    user_profile.bump = ctx.bumps.user_profile;

    /// Get the UserRewaard Account and setting the value in the UserReward State
    let user_reward = &mut ctx.accounts.user_reward;
    user_reward.owner = ctx.accounts.signer.key();
    user_reward.total_reward_points = 0;
    user_reward.bump = ctx.bumps.user_reward;
    Ok(())
}
