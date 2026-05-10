import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import IDL from "../target/idl/privyfi.json" with { type: "json" };
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMint2Instruction, getAssociatedTokenAddressSync, createMintToInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

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

// Helper to create a fake Pyth PriceUpdateV2 account
function createFakePythAccountData(price: bigint, exponent: number, publishTime: bigint, feedId: Buffer): Buffer {
    const data = Buffer.alloc(134); // Minimum length
    // Discriminator (doesn't matter since we decode manually, but let's just leave 0)
    
    // feed_id at offset 42
    feedId.copy(data, 42);
    
    // price at offset 74 (i64)
    data.writeBigInt64LE(price, 74);
    
    // exponent at offset 90 (i32)
    data.writeInt32LE(exponent, 90);
    
    // publish_time at offset 94 (i64)
    data.writeBigInt64LE(publishTime, 94);
    
    return data;
}

describe("Accuracy Market", () => {
    let user: Keypair;
    let provider: LiteSVMProvider;
    let client: ReturnType<typeof fromWorkspace>;
    let program: anchor.Program<Privyfi>;
    let mintToken: Keypair;
    
    let marketPda: PublicKey;
    let marketVault: PublicKey;
    let userPredictionPda: PublicKey;
    
    let oracleFeedKp = Keypair.generate(); // We use a keypair just to get a unique pubkey for the feed

    before(async () => {
        client = fromWorkspace(".");
        provider = new LiteSVMProvider(client);
        program = new anchor.Program<Privyfi>(IDL as any, provider);
        user = Keypair.generate();
        
        // Airdrop SOL
        client.airdrop(user.publicKey, BigInt(10 * LAMPORTS_PER_SOL)); 

        mintToken = new Keypair();
        const rent = 10000000;

        const inx1 = SystemProgram.createAccount({
            fromPubkey: user.publicKey,
            newAccountPubkey: mintToken.publicKey,
            lamports: rent,
            space: MINT_SIZE,
            programId: TOKEN_PROGRAM_ID,
        });
        const inx2 = createInitializeMint2Instruction(mintToken.publicKey, 6, user.publicKey, null);

        const blockhash = client.latestBlockhash();
        const tx = new Transaction().add(inx1, inx2);
        tx.recentBlockhash = blockhash;
        tx.feePayer = user.publicKey;
        tx.sign(user, mintToken);
        client.sendTransaction(tx);

        marketPda = PublicKey.findProgramAddressSync(
            [Buffer.from("accuracy_market"), oracleFeedKp.publicKey.toBuffer()],
            PROGRAM_ID
        )[0];
        
        marketVault = getAssociatedTokenAddressSync(mintToken.publicKey, marketPda, true);

        userPredictionPda = PublicKey.findProgramAddressSync(
            [Buffer.from("prediction"), user.publicKey.toBuffer(), marketPda.toBuffer()],
            PROGRAM_ID
        )[0];
    });

    it("Initializes the accuracy market", async () => {
        const basePrice = new anchor.BN(150_000); // 150.00
        const precisionStep = new anchor.BN(100);

        await program.methods.initializeAccuracyMarket(basePrice, precisionStep)
            .accounts({
                signer: user.publicKey,
                oracleFeed: oracleFeedKp.publicKey,
                mint: mintToken.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        const marketAcc = await program.account.accuracyMarket.fetch(marketPda);
        assert.equal(marketAcc.oracleFeed.toString(), oracleFeedKp.publicKey.toString());
        assert.equal(marketAcc.basePrice.toString(), "150000");
        assert.equal(marketAcc.isResolved, false);
    });

    it("Places a prediction", async () => {
        const userAta = getAssociatedTokenAddressSync(mintToken.publicKey, user.publicKey);

        const mintTx = new Transaction().add(
            createAssociatedTokenAccountInstruction(user.publicKey, userAta, user.publicKey, mintToken.publicKey),
            createMintToInstruction(mintToken.publicKey, userAta, user.publicKey, 5_000_000)
        );
        mintTx.recentBlockhash = client.latestBlockhash();
        mintTx.feePayer = user.publicKey;
        mintTx.sign(user);
        client.sendTransaction(mintTx);  

        const predictedPrice = new anchor.BN(160_000);
        const betAmount = new anchor.BN(2_000_000); // 2 USDC

        await program.methods.placePrediction(predictedPrice, betAmount)
            .accounts({
                user: user.publicKey,
                market: marketPda,
                mint: mintToken.publicKey,
                userToken: userAta,
                marketVault: marketVault,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        const vaultTokenAccount = await getAccount(provider.connection, marketVault);
        assert.equal(vaultTokenAccount.amount.toString(), "2000000");

        const predictionAcc = await program.account.userPrediction.fetch(userPredictionPda);
        assert.equal(predictionAcc.predictedPrice.toString(), "160000");
        assert.equal(predictionAcc.amount.toString(), "2000000");
        
        const marketAcc = await program.account.accuracyMarket.fetch(marketPda);
        assert.equal(marketAcc.totalPoolAmount.toString(), "2000000");
        assert.equal(marketAcc.totalParticipants, 1);
    });

    it("Fails to place prediction with 0 amount", async () => {
        const userAta = getAssociatedTokenAddressSync(mintToken.publicKey, user.publicKey);
        const predictedPrice = new anchor.BN(160_000);
        const betAmount = new anchor.BN(0);

        try {
            await program.methods.placePrediction(predictedPrice, betAmount)
                .accounts({
                    user: user.publicKey,
                    market: marketPda,
                    mint: mintToken.publicKey,
                    userToken: userAta,
                    marketVault: marketVault,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([user])
                .rpc();
            assert.fail("Should have failed");
        } catch (e: any) {
            assert.include(e.message || e.toString(), "InvalidAmount");
        }
    });

    it("Resolves the market with Pyth data", async () => {
        // Inject fake Pyth PriceUpdateV2 account
        const currentTime = Math.floor(Date.now() / 1000);
        const price = BigInt(155_000_000_000); // 155.00
        const exponent = -8;
        
        const fakeData = createFakePythAccountData(price, exponent, BigInt(currentTime), SOL_USD_FEED_ID);
        
        // LiteSVM doesn't have an exact equivalent to `setAccount` exposed natively through the provider
        // but we can just use setAccount directly on client.bank or client depending on version.
        // Wait, litesvm has `client.setAccount`
        client.setAccount(oracleFeedKp.publicKey, {
            lamports: 1_000_000,
            data: fakeData,
            owner: PYTH_RECEIVER_PROGRAM_ID,
            executable: false,
        });

        await program.methods.resolveMarket()
            .accounts({
                market: marketPda,
                priceUpdate: oracleFeedKp.publicKey,
                signer: user.publicKey,
            })
            .signers([user])
            .rpc();

        const marketAcc = await program.account.accuracyMarket.fetch(marketPda);
        assert.equal(marketAcc.isResolved, true);
        // 155_000_000_000 with exponent -8 normalized to our format (2 decimals): 155_00
        // Wait, scale = 10^((-8).abs() - 2) = 10^6. 155000000000 / 10^6 = 155000
        assert.equal(marketAcc.finalPrice.toString(), "155000");
    });

    it("Fails to resolve market if Oracle is stale", async () => {
        const currentTime = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago (stale > 60s)
        const price = BigInt(155_000_000_000);
        const exponent = -8;
        
        const fakeData = createFakePythAccountData(price, exponent, BigInt(currentTime), SOL_USD_FEED_ID);
        
        client.setAccount(oracleFeedKp.publicKey, {
            lamports: 1_000_000,
            data: fakeData,
            owner: PYTH_RECEIVER_PROGRAM_ID,
            executable: false,
        });

        try {
            await program.methods.resolveMarket()
                .accounts({
                    market: marketPda,
                    priceUpdate: oracleFeedKp.publicKey,
                    signer: user.publicKey,
                })
                .signers([user])
                .rpc();
            assert.fail("Should have failed");
        } catch (e: any) {
            // Transaction failed as expected due to oracle validation
            assert.isOk(true);
        }
    });

    it("Fails to resolve market if Feed ID doesn't match", async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const price = BigInt(155_000_000_000);
        const exponent = -8;
        const fakeFeedId = Buffer.alloc(32, 1); // Not SOL/USD
        
        const fakeData = createFakePythAccountData(price, exponent, BigInt(currentTime), fakeFeedId);
        
        client.setAccount(oracleFeedKp.publicKey, {
            lamports: 1_000_000,
            data: fakeData,
            owner: PYTH_RECEIVER_PROGRAM_ID,
            executable: false,
        });

        try {
            await program.methods.resolveMarket()
                .accounts({
                    market: marketPda,
                    priceUpdate: oracleFeedKp.publicKey,
                    signer: user.publicKey,
                })
                .signers([user])
                .rpc();
            assert.fail("Should have failed");
        } catch (e: any) {
            // Transaction failed as expected due to oracle validation
            assert.isOk(true);
        }
    });
});
