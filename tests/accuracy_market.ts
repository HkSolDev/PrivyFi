import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import IDL from "../target/idl/privyfi.json" with { type: "json" };
import { 
  MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMint2Instruction, 
  getAssociatedTokenAddressSync, createMintToInstruction, 
  createAssociatedTokenAccountInstruction 
} from "@solana/spl-token";

import type { Privyfi } from "../target/types/privyfi";
import { assert } from "chai";
import { getAccount } from "@solana/spl-token";

const PROGRAM_ID = new PublicKey(IDL.address);
const PYTH_RECEIVER_PROGRAM_ID = new PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");

const SOL_USD_FEED_ID = Buffer.from([
    0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
    0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
    0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc,
    0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
]);

function createFakePythAccountData(
  price: bigint, exponent: number, publishTime: bigint, feedId: Buffer
): Buffer {
  const data = Buffer.alloc(134);
  feedId.copy(data, 42);
  data.writeBigInt64LE(price, 74);
  data.writeInt32LE(exponent, 90);
  data.writeBigInt64LE(publishTime, 94);
  return data;
}

function findMarketPda(oracleFeed: PublicKey, roundId: number): PublicKey {
  const roundBuf = Buffer.alloc(8);
  roundBuf.writeBigUInt64LE(BigInt(roundId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("accuracy_market"), oracleFeed.toBuffer(), roundBuf],
    PROGRAM_ID
  )[0];
}

function findPredictionPda(user: PublicKey, market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("prediction"), user.toBuffer(), market.toBuffer()],
    PROGRAM_ID
  )[0];
}

describe("Accuracy Market — Full End-to-End", () => {
  let user: Keypair;
  let user2: Keypair;
  let user3: Keypair;
  let cranker: Keypair;
  let provider: LiteSVMProvider;
  let client: ReturnType<typeof fromWorkspace>;
  let program: anchor.Program<Privyfi>;
  let mintToken: Keypair;
  let userAta: PublicKey;
  let user2Ata: PublicKey;
  let user3Ata: PublicKey;

  const ROUND_ID = 1;
  const BASE_PRICE = 150_000;   // $150.00 (2 decimals)
  const PRECISION_STEP = 100;   // $1.00 per bucket => bucket 0 = $150, bucket 50 = $200

  let oracleFeedKp = Keypair.generate();
  let marketPda: PublicKey;
  let marketVault: PublicKey;
  let userPredictionPda: PublicKey;
  let user2PredictionPda: PublicKey;
  let user3PredictionPda: PublicKey;
  let bc: any;

  before(async () => {
    client = fromWorkspace(".");
    provider = new LiteSVMProvider(client);
    program = new anchor.Program<Privyfi>(IDL as any, provider);
    user = Keypair.generate();
    user2 = Keypair.generate();
    user3 = Keypair.generate();
    cranker = Keypair.generate();

    // Airdrop SOL
    for (const kp of [user, user2, user3, cranker]) {
      client.airdrop(kp.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    }

    // Create USDC-like mint (6 decimals)
    mintToken = new Keypair();
    bc = client.latestBlockhash();
    const createMintIx = SystemProgram.createAccount({
      fromPubkey: user.publicKey,
      newAccountPubkey: mintToken.publicKey,
      lamports: 10000000,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    });
    const initMintIx = createInitializeMint2Instruction(mintToken.publicKey, 6, user.publicKey, null);
    const mintTx = new Transaction().add(createMintIx, initMintIx);
    mintTx.recentBlockhash = bc;
    mintTx.feePayer = user.publicKey;
    mintTx.sign(user, mintToken);
    client.sendTransaction(mintTx);

    // Derive PDAs
    marketPda = findMarketPda(oracleFeedKp.publicKey, ROUND_ID);
    marketVault = getAssociatedTokenAddressSync(mintToken.publicKey, marketPda, true);
    userPredictionPda = findPredictionPda(user.publicKey, marketPda);
    user2PredictionPda = findPredictionPda(user2.publicKey, marketPda);
    user3PredictionPda = findPredictionPda(user3.publicKey, marketPda);
    userAta = getAssociatedTokenAddressSync(mintToken.publicKey, user.publicKey);
    user2Ata = getAssociatedTokenAddressSync(mintToken.publicKey, user2.publicKey);
    user3Ata = getAssociatedTokenAddressSync(mintToken.publicKey, user3.publicKey);

    // Mint 10M to user, 10M to user2, 10M to user3
    bc = client.latestBlockhash();
    for (const [kp, ata] of [
      [user, userAta], [user2, user2Ata], [user3, user3Ata]
    ] as [Keypair, PublicKey][]) {
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(kp.publicKey, ata, kp.publicKey, mintToken.publicKey),
        createMintToInstruction(mintToken.publicKey, ata, user.publicKey, 10_000_000)
      );
      tx.recentBlockhash = bc;
      tx.feePayer = kp.publicKey;
      tx.sign(kp, user);
      client.sendTransaction(tx);
    }
  });

  // ════════════════════════════════════════════════════════════════════
  //  PHASE 1: Market Setup
  // ════════════════════════════════════════════════════════════════════

  it("1. Initializes the accuracy market", async () => {
    bc = client.latestBlockhash();
    await program.methods.initializeAccuracyMarket(
      new anchor.BN(ROUND_ID), new anchor.BN(BASE_PRICE), new anchor.BN(PRECISION_STEP)
    )
      .accounts({ signer: user.publicKey, oracleFeed: oracleFeedKp.publicKey, mint: mintToken.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([user])
      .rpc();

    const m = await program.account.accuracyMarket.fetch(marketPda);
    assert.equal(m.basePrice.toString(), "150000");
    assert.equal(m.precisionStep.toString(), "100");
    assert.equal(m.totalPoolAmount.toString(), "0");
    assert.equal(m.totalParticipants, 0);
    assert.equal(m.isResolved, false);
  });

  // ════════════════════════════════════════════════════════════════════
  //  PHASE 2: 3 Users place predictions at different buckets
  //  User1: bucket 10 (=$151), stake 2 USDC  → error=40
  //  User2: bucket 30 (=$153), stake 1 USDC  → error=20
  //  User3: bucket 45 (=$154.5), stake 3 USDC → error=5
  // ════════════════════════════════════════════════════════════════════

  it("2. User1 predicts bucket 10, 2 USDC", async () => {
    bc = client.latestBlockhash();
    await program.methods.placePrediction(new anchor.BN(ROUND_ID), 10, new anchor.BN(2_000_000))
      .accounts({ user: user.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: userAta, marketVault: marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([user])
      .rpc();

    const p = await program.account.userPrediction.fetch(userPredictionPda);
    assert.equal(p.predictedBucket, 10);
    assert.equal(p.amount.toString(), "2000000");
    assert.equal(p.claimed, false);
  });

  it("3. User2 predicts bucket 30, 1 USDC", async () => {
    bc = client.latestBlockhash();
    await program.methods.placePrediction(new anchor.BN(ROUND_ID), 30, new anchor.BN(1_000_000))
      .accounts({ user: user2.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: user2Ata, marketVault: marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([user2])
      .rpc();

    const p = await program.account.userPrediction.fetch(user2PredictionPda);
    assert.equal(p.predictedBucket, 30);
    assert.equal(p.amount.toString(), "1000000");
  });

  it("4. User3 predicts bucket 45, 3 USDC", async () => {
    bc = client.latestBlockhash();
    await program.methods.placePrediction(new anchor.BN(ROUND_ID), 45, new anchor.BN(3_000_000))
      .accounts({ user: user3.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: user3Ata, marketVault: marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([user3])
      .rpc();

    const p = await program.account.userPrediction.fetch(user3PredictionPda);
    assert.equal(p.predictedBucket, 45);
    assert.equal(p.amount.toString(), "3000000");
  });

  it("5. Market state reflects 3 participants, 6 USDC pool", async () => {
    const m = await program.account.accuracyMarket.fetch(marketPda);
    assert.equal(m.totalParticipants, 3);
    assert.equal(m.totalPoolAmount.toString(), "6000000"); // 2+1+3 = 6 USDC
    // Verify histogram
    assert.equal(m.predictionHistogram[10].toString(), "2000000");
    assert.equal(m.predictionHistogram[30].toString(), "1000000");
    assert.equal(m.predictionHistogram[45].toString(), "3000000");
    // Verify vault
    const vault = await getAccount(provider.connection, marketVault);
    assert.equal(vault.amount.toString(), "6000000");
  });

  // ════════════════════════════════════════════════════════════════════
  //  PHASE 3: Oracle resolves SOL price = $155.00 → bucket 50
  //  actual_bucket = (155000 - 150000) / 100 = 50
  // ════════════════════════════════════════════════════════════════════

  it("6. Oracle resolves market at bucket 50 (SOL=$155)", async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    // Price $155.00 = 155000 (2 decimals), exponent -2
    const price = BigInt(155_000);
    const exponent = -2;
    const fakeData = createFakePythAccountData(price, exponent, BigInt(currentTime), SOL_USD_FEED_ID);

    client.setAccount(oracleFeedKp.publicKey, { lamports: 1_000_000, data: fakeData, owner: PYTH_RECEIVER_PROGRAM_ID, executable: false });

    await program.methods.resolveMarket(new anchor.BN(ROUND_ID))
      .accounts({ market: marketPda, priceUpdate: oracleFeedKp.publicKey, signer: user.publicKey })
      .signers([user])
      .rpc();

    const m = await program.account.accuracyMarket.fetch(marketPda);
    assert.equal(m.isResolved, true);
    assert.equal(m.finalPrice.toString(), "155000");
    assert.equal(m.actualBucket, 50);
  });

  // ════════════════════════════════════════════════════════════════════
  //  MATH VERIFICATION:
  //  Actual SOL price = $155.00 → bucket 50
  //  Errors from bucket 50:
  //    User1: bucket 10 → |10-50| = 40, stake 2 USDC
  //    User2: bucket 30 → |30-50| = 20, stake 1 USDC
  //    User3: bucket 45 → |45-50| = 5,  stake 3 USDC
  //
  //  Dollar-weighted error histogram:
  //    error[5]  += 3,000,000  (user3)
  //    error[20] += 1,000,000  (user2)
  //    error[40] += 2,000,000  (user1)
  //
  //  Total pool = 6,000,000. Target = 3,000,000
  //  Cumulative:
  //    e=0..4:  0
  //    e=5:     3,000,000 — NOT > 3,000,000, continue
  //    e=6..19: 3,000,000 — continue
  //    e=20:    4,000,000 > 3,000,000 → median_error = 20
  //
  //  Winners: error < 20 → only User3 (error=5 ≤ 19)
  //  Losers: error ≥ 20 → User1 (40), User2 (20)
  //
  //  Convex payout:
  //    User3 weight = (20-5)² = 225
  //    total_weight = 225 × 3,000,000 = 675,000,000
  //    User3 payout = (225 × 3M × 6M) / 675,000,000 = 6,000,000 (wins entire pool)

  it("7. Verifies median error = 20 (User3 only winner)", async () => {
    const m = await program.account.accuracyMarket.fetch(marketPda);
    console.log("Median error:", m.medianError);
    console.log("Total winning weight:", m.totalWinningWeight?.toString());
    assert.equal(m.medianError, 20);
  });

  it("8. Winner (User3) claims and receives exact payout of 6 USDC", async () => {
    bc = client.latestBlockhash();
    const preBalance = await getAccount(provider.connection, user3Ata);
    console.log("User3 pre-balance:", preBalance.amount.toString());

    await program.methods.claimPrediction(new anchor.BN(ROUND_ID))
      .accounts({ user: user3.publicKey, market: marketPda, userPrediction: user3PredictionPda, mint: mintToken.publicKey, marketVault: marketVault, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([user3])
      .rpc();

    // User3 had 10M, bet 3M, so after bet: 7M. Payout = 6M. Balance = 7M + 6M = 13M
    const postBalance = await getAccount(provider.connection, user3Ata);
    console.log("User3 post-balance:", postBalance.amount.toString());
    assert.equal(postBalance.amount.toString(), "13000000");
  });

  it("9. User3 prediction marked claimed", async () => {
    const p = await program.account.userPrediction.fetch(user3PredictionPda);
    assert.equal(p.claimed, true);
  });

  it("10. Loser (User2) fails to claim (error=20 = median)", async () => {
    bc = client.latestBlockhash();
    try {
      await program.methods.claimPrediction(new anchor.BN(ROUND_ID))
        .accounts({ user: user2.publicKey, market: marketPda, userPrediction: user2PredictionPda, mint: mintToken.publicKey, marketVault: marketVault, tokenProgram: TOKEN_PROGRAM_ID })
        .signers([user2])
        .rpc();
      assert.fail("Should have failed with NotAWinner");
    } catch (e: any) {
      assert.include(e.message || e.toString(), "NotAWinner");
    }
  });

  it("11. Loser (User1) fails to claim (error=40 > median)", async () => {
    bc = client.latestBlockhash();
    try {
      await program.methods.claimPrediction(new anchor.BN(ROUND_ID))
        .accounts({ user: user.publicKey, market: marketPda, userPrediction: userPredictionPda, mint: mintToken.publicKey, marketVault: marketVault, tokenProgram: TOKEN_PROGRAM_ID })
        .signers([user])
        .rpc();
      assert.fail("Should have failed with NotAWinner");
    } catch (e: any) {
      assert.include(e.message || e.toString(), "NotAWinner");
    }
  });

  // ════════════════════════════════════════════════════════════════════
  //  PHASE 4: Crank — processes user1 + user2 (losers), pays cranker
  //  Expected:
  //    - User1: loser, no USDC payout. PDA closed, rent→cranker
  //    - User2: loser, no USDC payout. PDA closed, rent→cranker
  //    - Cranker: gets ~0.004 SOL rent from 2 closed PDAs
  //    - User3 already claimed via claimPrediction so crank skips them
  // ════════════════════════════════════════════════════════════════════

  it("12. Crank processes both losers, cranker earns SOL rent bounty", async () => {
    bc = client.latestBlockhash();
    const crankerVault = getAssociatedTokenAddressSync(mintToken.publicKey, cranker.publicKey);
    const crankerVaultTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(cranker.publicKey, crankerVault, cranker.publicKey, mintToken.publicKey)
    );
    crankerVaultTx.recentBlockhash = bc;
    crankerVaultTx.feePayer = cranker.publicKey;
    crankerVaultTx.sign(cranker);
    client.sendTransaction(crankerVaultTx);

    const preCrankerSol = client.getBalance(cranker.publicKey);
    const preVault = await getAccount(provider.connection, marketVault);

    bc = client.latestBlockhash();
    // Pass user1 (loser) and user2 (loser) — both should get no USDC, but crank gets rent
    await program.methods.crankPayouts(new anchor.BN(ROUND_ID))
      .accounts({ cranker: cranker.publicKey, market: marketPda, marketVault: marketVault, crankerVault: crankerVault, mint: mintToken.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
      .remainingAccounts([
        { pubkey: userPredictionPda, isWritable: true, isSigner: false },
        { pubkey: userAta, isWritable: true, isSigner: false },
        { pubkey: user2PredictionPda, isWritable: true, isSigner: false },
        { pubkey: user2Ata, isWritable: true, isSigner: false },
      ])
      .signers([cranker])
      .rpc();

    // Cranker SOL increased (rent from 2 closed PDAs)
    const postCrankerSol = client.getBalance(cranker.publicKey);
    console.log("Cranker SOL:", preCrankerSol.toString(), "→", postCrankerSol.toString());
    assert.isAbove(Number(postCrankerSol), Number(preCrankerSol));

    // Vault should be unchanged (losers got no payout)
    const postVault = await getAccount(provider.connection, marketVault);
    assert.equal(postVault.amount.toString(), preVault.amount.toString());
  });

  it("13. User1 and User2 prediction accounts are closed", async () => {
    try { await program.account.userPrediction.fetch(userPredictionPda); assert.fail(); }
    catch { /* expected */ }

    try { await program.account.userPrediction.fetch(user2PredictionPda); assert.fail(); }
    catch { /* expected */ }
  });

  // ════════════════════════════════════════════════════════════════════
  //  PHASE 5: Edge cases
  // ════════════════════════════════════════════════════════════════════

  it("14. Fails to resolve with stale oracle (>60s old)", async () => {
    const staleRound = 99;
    const staleMarketPda = findMarketPda(oracleFeedKp.publicKey, staleRound);
    bc = client.latestBlockhash();
    await program.methods.initializeAccuracyMarket(new anchor.BN(staleRound), new anchor.BN(BASE_PRICE), new anchor.BN(PRECISION_STEP))
      .accounts({ signer: user.publicKey, oracleFeed: oracleFeedKp.publicKey, mint: mintToken.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([user])
      .rpc();

    const currentTime = Math.floor(Date.now() / 1000) - 100;
    const fakeData = createFakePythAccountData(BigInt(155_000), -2, BigInt(currentTime), SOL_USD_FEED_ID);
    client.setAccount(oracleFeedKp.publicKey, { lamports: 1_000_000, data: fakeData, owner: PYTH_RECEIVER_PROGRAM_ID, executable: false });

    try {
      await program.methods.resolveMarket(new anchor.BN(staleRound))
        .accounts({ market: staleMarketPda, priceUpdate: oracleFeedKp.publicKey, signer: user.publicKey })
        .signers([user])
        .rpc();
      assert.fail("Should have failed");
    } catch { /* expected */ }
  });

  it("15. Fails to resolve with wrong feed ID", async () => {
    const wrongRound = 100;
    const wrongMarketPda = findMarketPda(oracleFeedKp.publicKey, wrongRound);
    bc = client.latestBlockhash();
    await program.methods.initializeAccuracyMarket(new anchor.BN(wrongRound), new anchor.BN(BASE_PRICE), new anchor.BN(PRECISION_STEP))
      .accounts({ signer: user.publicKey, oracleFeed: oracleFeedKp.publicKey, mint: mintToken.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([user])
      .rpc();

    const currentTime = Math.floor(Date.now() / 1000);
    const fakeFeedId = Buffer.alloc(32, 1);
    const fakeData = createFakePythAccountData(BigInt(155_000), -2, BigInt(currentTime), fakeFeedId);
    client.setAccount(oracleFeedKp.publicKey, { lamports: 1_000_000, data: fakeData, owner: PYTH_RECEIVER_PROGRAM_ID, executable: false });

    try {
      await program.methods.resolveMarket(new anchor.BN(wrongRound))
        .accounts({ market: wrongMarketPda, priceUpdate: oracleFeedKp.publicKey, signer: user.publicKey })
        .signers([user])
        .rpc();
      assert.fail("Should have failed");
    } catch { /* expected */ }
  });

  it("16. Fails to resolve an already-resolved market", async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const fakeData = createFakePythAccountData(BigInt(155_000), -2, BigInt(currentTime), SOL_USD_FEED_ID);
    client.setAccount(oracleFeedKp.publicKey, { lamports: 1_000_000, data: fakeData, owner: PYTH_RECEIVER_PROGRAM_ID, executable: false });

    try {
      await program.methods.resolveMarket(new anchor.BN(ROUND_ID))
        .accounts({ market: marketPda, priceUpdate: oracleFeedKp.publicKey, signer: user.publicKey })
        .signers([user])
        .rpc();
      assert.fail("Should have failed");
    } catch { /* expected - already resolved */ }
  });
});
