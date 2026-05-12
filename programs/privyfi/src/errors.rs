use anchor_lang::prelude::*;

#[error_code]
pub enum PrivyFiError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Arithmetic overflow — amount too large")]
    Overflow,
    #[msg("You are not authorized to update yields")]
    Unauthorized,
    #[msg("The oracle account is not owned by the Pyth Receiver program")]
    InvalidOracleOwner,
    #[msg("The oracle account data is invalid or too short")]
    InvalidOracleData,
    #[msg("The oracle price feed is stale")]
    StaleOracle,
    #[msg("The feed ID does not match the expected SOL/USD feed")]
    MismatchedFeedId,
    #[msg("Invalid predicted bucket")]
    InvalidBucket,
    #[msg("The betting window is closed")]
    BettingWindowClosed,
    #[msg("The market is already resolved")]
    MarketAlreadyResolved,
    #[msg("The market has not been resolved yet")]
    MarketNotResolved,
    #[msg("You have already claimed your rewards for this prediction")]
    AlreadyClaimed,
    #[msg("You are not a winner in this round")]
    NotAWinner,
    #[msg("Your payout is zero")]
    NoPayout,
    #[msg("Invalid market for this prediction")]
    InvalidMarket,
    #[msg("Cannot change predicted bucket for an existing prediction")]
    CannotChangeBucket,
    #[msg("Invalid prediction account PDA")]
    InvalidPredictionAccount,
    #[msg("Account is not owned by the program")]
    InvalidAccountOwner,
}
