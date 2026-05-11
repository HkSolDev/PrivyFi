use anchor_lang::prelude::*;
use crate::state::AccuracyMarket;
use crate::errors::PrivyFiError;

pub const PYTH_RECEIVER_PROGRAM_ID: Pubkey = pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");

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
#[instruction(round_id: u64)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [b"accuracy_market", market.oracle_feed.as_ref(), round_id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = !market.is_resolved @ PrivyFiError::MarketAlreadyResolved
    )]
    pub market: Box<Account<'info, AccuracyMarket>>,

    /// CHECK: Manually verified for Pyth owner and data layout in handler.
    pub price_update: UncheckedAccount<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,
}

pub fn resolve_market_handler(ctx: Context<ResolveMarket>, _round_id: u64) -> Result<()> {
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

    // 6. Normalize Price to 2-decimal format (like USDC cents)
    let scale = 10_u64.pow((exponent.unsigned_abs()).saturating_sub(2));
    let oracle_price = if scale > 0 {
        (raw_price.unsigned_abs()) / scale
    } else {
        raw_price.unsigned_abs()
    };

    let market = &mut ctx.accounts.market;

    // Map oracle price to bucket (0-99) based on base_price and precision_step
    let actual_bucket_calc: u64 = if oracle_price >= market.base_price {
        (oracle_price - market.base_price) / market.precision_step
    } else {
        0
    };
    let actual_bucket = std::cmp::min(actual_bucket_calc, 99) as u8;

    market.actual_bucket = Some(actual_bucket);
    market.final_price = oracle_price;

    // STEP 1: Build the Error Histogram (weighted by dollar amounts)
    let mut error_hist = [0u64; 100];
    for i in 0..100 {
        let count = market.prediction_histogram[i];
        if count > 0 {
            let error = (i as i32 - actual_bucket as i32).abs() as usize;
            error_hist[error] = error_hist[error]
                .checked_add(count)
                .ok_or(PrivyFiError::Overflow)?;
        }
    }

    // STEP 2: Find the Median Error Cutoff using dollar amounts
    let target_median_count = market.total_pool_amount / 2;
    let mut cumulative_count = 0u64;
    let mut median_error = 0;

    for e in 0..100 {
        cumulative_count = cumulative_count
            .checked_add(error_hist[e])
            .ok_or(PrivyFiError::Overflow)?;
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

            if error < median_error {
                let weight_per_bet = ((median_error - error) as u128).pow(2);
                total_weight = total_weight
                    .checked_add(weight_per_bet * (count as u128))
                    .ok_or(PrivyFiError::Overflow)?;
            } else if median_error == 0 && error == 0 {
                total_weight = total_weight
                    .checked_add(1 * (count as u128))
                    .ok_or(PrivyFiError::Overflow)?;
            }
        }
    }

    market.total_winning_weight = Some(total_weight);
    market.is_resolved = true;

    msg!("Market Resolved! Round: {}, Bucket: {}, Price: {}, Median Error: {}",
        market.round_id, actual_bucket, oracle_price, median_error);

    Ok(())
}
