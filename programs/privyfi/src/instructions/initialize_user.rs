use crate::state::{UserProfile, UserReward};
use anchor_lang::prelude::*;

#[derive(Accounts)]
/// In this create the user_profile and the user_reward State for the user.
pub struct InitializeUser<'info> {
    /// The user have to be the signer and his key used to create the pda
    #[account(mut)]
    pub signer: Signer<'info>,
    /// The user profile account is created with the help of the signer key and the name of the user
    #[account(init_if_needed, payer = signer, space = 8 + UserProfile::INIT_SPACE, seeds = [b"profile",signer.key().as_ref()],bump)]
    pub user_profile: Account<'info, UserProfile>,

    /// Create the userReward Pda this will show all collectively all the reward earn by the user
    #[account(init_if_needed, payer = signer, space = 8 + UserReward::INIT_SPACE, seeds = [b"reward",signer.key().as_ref()], bump)]
    pub user_reward: Account<'info, UserReward>,

    pub system_program: Program<'info, System>,
}

pub fn create_user(ctx: Context<InitializeUser>) -> Result<()> {
    // Only initialize if the account is new (owner is default Pubkey)
    let user_profile = &mut ctx.accounts.user_profile;
    if user_profile.owner == Pubkey::default() {
        user_profile.owner = ctx.accounts.signer.key();
        user_profile.total_staked = 0;
        user_profile.total_reward_earn = 0;
        user_profile.private_mode = false;
        user_profile.bump = ctx.bumps.user_profile;
    }

    let user_reward = &mut ctx.accounts.user_reward;
    if user_reward.owner == Pubkey::default() {
        user_reward.owner = ctx.accounts.signer.key();
        user_reward.total_reward_points = 0;
        user_reward.bump = ctx.bumps.user_reward;
    }
    
    Ok(())
}
