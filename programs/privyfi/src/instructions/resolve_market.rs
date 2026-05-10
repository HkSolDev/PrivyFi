use anchor_lang::prelude::*;
use crate::state::AccuracyMarket;
use crate::errors::PrivyFiError;

/// The official Pyth Solana Receiver program ID.
pub const PYTH_RECEIVER_PROGRAM_ID: Pubkey = pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");

/// The SOL/USD Feed ID.
pub const SOL_USD_FEED_ID: [u8; 32] = [
    0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
    0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
    0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc,
    0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
];

pub const MAX_PRICE_AGE_SECONDS: i64 = 60;

const OFFSET_FEED_ID:      usize = 42;
const OFFSET_PRICE:        usize = 74;
const OFFSET_EXPONENT:     usize = 90;
const OFFSET_PUBLISH_TIME: usize = 94;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [b"accuracy_market", market.oracle_feed.as_ref()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, AccuracyMarket>>,

    /// The Pyth PriceUpdateV2 account.
    /// CHECK: Manually verified below.
    pub price_update: UncheckedAccount<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,
}

pub fn resolve_market_handler(ctx: Context<ResolveMarket>) -> Result<()> {
    // 1. Verify Owner
    require_keys_eq!(
        *ctx.accounts.price_update.owner,
        PYTH_RECEIVER_PROGRAM_ID,
        PrivyFiError::InvalidOracleOwner
    );

    // 2. Decode Data
    let data = ctx.accounts.price_update.try_borrow_data()?;
    require!(data.len() >= OFFSET_PUBLISH_TIME + 8, PrivyFiError::InvalidOracleData);

    // 3. Verify Feed ID
    let feed_id: [u8; 32] = data[OFFSET_FEED_ID..OFFSET_FEED_ID + 32]
        .try_into()
        .map_err(|_| PrivyFiError::InvalidOracleData)?;
    require!(feed_id == SOL_USD_FEED_ID, PrivyFiError::MismatchedFeedId);

    // 4. Decode Price & Exponent
    let raw_price = i64::from_le_bytes(
        data[OFFSET_PRICE..OFFSET_PRICE + 8].try_into().map_err(|_| PrivyFiError::InvalidOracleData)?
    );
    let exponent = i32::from_le_bytes(
        data[OFFSET_EXPONENT..OFFSET_EXPONENT + 4].try_into().map_err(|_| PrivyFiError::InvalidOracleData)?
    );

    // 5. Staleness Check
    let publish_time = i64::from_le_bytes(
        data[OFFSET_PUBLISH_TIME..OFFSET_PUBLISH_TIME + 8].try_into().map_err(|_| PrivyFiError::InvalidOracleData)?
    );
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp - publish_time <= MAX_PRICE_AGE_SECONDS,
        PrivyFiError::StaleOracle
    );

    drop(data);

    // 6. Normalize Price (Scale to 2 decimals like octa-dex, or 6 decimals for USDC precision)
    // For now, let's just store the absolute value as u64 and handle decimals in frontend.
    // Or scale it to a standard (e.g., 9 decimals).
    let scale = 10_u64.pow((exponent.unsigned_abs()).saturating_sub(2));
    let oracle_price = if scale > 0 {
        (raw_price.unsigned_abs()) / scale
    } else {
        raw_price.unsigned_abs()
    };

    let market = &mut ctx.accounts.market;
    
    // Map oracle price to bucket (0-99). 
    // This is simplified: actual implementation should determine the actual bucket based on base_price and precision_step.
    // For this example, let's pretend bucket mapping is done like: actual_bucket = (oracle_price - base_price) / precision_step
    // And clamp it to 0-99.
    let mut actual_bucket_calc = 0;
    if oracle_price > market.base_price {
        let diff = oracle_price - market.base_price;
        actual_bucket_calc = (diff / market.precision_step) as u8;
    }
    let actual_bucket = std::cmp::min(actual_bucket_calc, 99);

    market.actual_bucket = Some(actual_bucket);
    market.final_price = oracle_price;

    // STEP 1: Build the Error Histogram
    let mut error_hist = [0u32; 100];
    for i in 0..100 {
        let count = market.prediction_histogram[i];
        if count > 0 {
            let error = (i as i32 - actual_bucket as i32).abs() as usize;
            error_hist[error] += count;
        }
    }

    // STEP 2: Find the Median Error Cutoff
    let target_median_count = market.total_participants / 2; // total_participants is total_bets here
    let mut cumulative_count = 0;
    let mut median_error = 0;

    for e in 0..100 {
        cumulative_count += error_hist[e];
        if cumulative_count > target_median_count {
            median_error = e as u8;
            break;
        }
    }
    market.median_error = Some(median_error);

    // STEP 3: Calculate the Total Convex Weight of all Winners
    let mut total_weight: u128 = 0;
    
    for i in 0..100 {
        let count = market.prediction_histogram[i];
        if count > 0 {
            let error = (i as i32 - actual_bucket as i32).abs() as u8;
            
            // Winners are those with an error strictly less than the median
            if error < median_error {
                // Convex Math: (Median - Error)^2
                let weight_per_bet = ((median_error - error) as u128).pow(2);
                total_weight += weight_per_bet * (count as u128);
            } 
            // Failsafe
            else if median_error == 0 && error == 0 {
                total_weight += 1 * (count as u128);
            }
        }
    }
    
    market.total_winning_weight = Some(total_weight);
    market.is_resolved = true;

    msg!("Market Resolved! Actual Bucket: {}", actual_bucket);

    Ok(())
}
