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
}
