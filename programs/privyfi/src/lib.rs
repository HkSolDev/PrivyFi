pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("FWNEG9fUyFNKs5qMLgGAZohuqhnT1Uex6sDVPKEdCKjA");

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

    pub fn record_action(ctx: Context<RecordAction>, amount: u64) -> Result<()> {
        reward_handler(ctx, amount)
    }

    pub fn initialize_accuracy_market(
        ctx: Context<InitializeAccuracyMarket>,
        round_id: u64,
        base_price: u64,
        precision_step: u64,
    ) -> Result<()> {
        initialize_accuracy_market_handler(ctx, round_id, base_price, precision_step)
    }

    pub fn place_prediction(
        ctx: Context<PlacePrediction>,
        round_id: u64,
        predicted_bucket: u8,
        amount: u64,
    ) -> Result<()> {
        place_prediction_handler(ctx, round_id, predicted_bucket, amount)
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, round_id: u64) -> Result<()> {
        resolve_market_handler(ctx, round_id)
    }

    pub fn claim_prediction(ctx: Context<ClaimPrediction>, round_id: u64) -> Result<()> {
        claim_prediction_handler(ctx, round_id)
    }

    pub fn crank_payouts<'info>(
        ctx: Context<'info, CrankPayouts<'info>>,
        round_id: u64,
    ) -> Result<()> {
        crank_payouts_handler(ctx, round_id)
    }

    pub fn initialize_faucet(ctx: Context<InitializeFaucet>) -> Result<()> {
        initialize_faucet_handler(ctx)
    }

    pub fn request_faucet(ctx: Context<RequestFaucet>, amount: u64) -> Result<()> {
        request_faucet_handler(ctx, amount)
    }

    pub fn initialize_yield_store(ctx: Context<InitializeYieldStore>) -> Result<()> {
        instructions::update_yields::initialize_yield_store_handler(ctx)
    }

    pub fn update_yields(ctx: Context<UpdateYields>, strategies: Vec<YieldData>) -> Result<()> {
        instructions::update_yields::update_yields_handler(ctx, strategies)
    }
}
