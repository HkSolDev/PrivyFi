pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use errors::*;
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

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        withdraw_handler(ctx, amount)
    }

    pub fn toggle_private(ctx: Context<TogglePrivate>) -> Result<()> {
        instructions::toggle_private::toggle_handler(ctx)
    }

    pub fn record_action(ctx: Context<RecordAction>, amount: u64) -> Result<()> {
        reward_handler(ctx, amount)
    }

    pub fn initialize_faucet(ctx: Context<InitializeFaucet>) -> Result<()> {
        instructions::initialize_faucet::initialize_faucet(ctx)
    }

    pub fn request_faucet(ctx: Context<RequestFaucet>, amount: u64) -> Result<()> {
        instructions::request_faucet::request_faucet(ctx, amount)
    }

    pub fn initialize_yield_store(ctx: Context<InitializeYieldStore>) -> Result<()> {
        instructions::update_yields::initialize_yield_store_handler(ctx)
    }

    pub fn update_yields(ctx: Context<UpdateYields>, strategies: Vec<YieldData>) -> Result<()> {
        instructions::update_yields::update_yields_handler(ctx, strategies)
    }
}
