use anchor_lang::prelude::*;
use crate::state::UserProfile;

#[derive(Accounts)]
pub struct TogglePrivate<'info>{
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [b"profile",user.key().as_ref()],bump = user_profile.bump, constraint = user_profile.owner == user.key())]
    pub user_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}

pub fn toggle_handler(ctx:Context<TogglePrivate>) ->Result<()>{
    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.private_mode = !user_profile.private_mode;
    Ok(())
}

