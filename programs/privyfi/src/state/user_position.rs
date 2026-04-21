use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
//User position is like a receipt in the bank account when you deposit into your bank account you get a receipt when you deposite and bank also know since when the bank have to give the intereset on the deposite amount
pub struct UserPosition{
pub owner: Pubkey,
pub pool: Pubkey,
pub start_time: i64,
pub amount: u64,
pub bump: u8
}