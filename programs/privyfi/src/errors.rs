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
}
