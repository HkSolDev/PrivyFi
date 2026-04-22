pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;
pub use state::*;

declare_id!("Czmhx4o5349ugHqTjNEArm6eoakk2btihu4bcBCvdt36");

#[program]
pub mod privyfi {
    use super::*;

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        create_user(ctx)?;
        Ok(())
    }

    pub fn initialize_pool(ctx: Context<InitializePool>, name: String, apy_bps: u64) -> Result<()> {
        create_pool(ctx, name, apy_bps)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        deposit_handler(ctx, amount)
    }

    // pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    //     instructions::withdraw::handler(ctx)
    // }

    // pub fn toggle_private(ctx: Context<TogglePrivate>) -> Result<()> {
    //     instructions::toggle_private::handler(ctx)
    // }

    // pub fn record_action(ctx: Context<RecordAction>) -> Result<()> {
    //     instructions::record_action::handler(ctx)
    // }
}
