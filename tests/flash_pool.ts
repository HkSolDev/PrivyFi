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
    const data = Buffer.alloc(134);
    feedId.copy(data, 42);
    data.writeBigInt64LE(price, 74);
    data.writeInt32LE(exponent, 90);
    data.writeBigInt64LE(publishTime, 94);
    return data;
}

describe("Flash Pools Time Travel & Cranking", () => {
    let provider: LiteSVMProvider;
    let client: ReturnType<typeof fromWorkspace>;
    let program: anchor.Program<Privyfi>;
    
    let admin: Keypair;
    let cranker: Keypair;
    let mintToken: Keypair;
    
    let oracleFeedKp = Keypair.generate();
    let marketPda: PublicKey;
    let marketVault: PublicKey;
    
    const roundId = new anchor.BN(1);
    
    // Test users
    let users: { kp: Keypair, ata: PublicKey, pda: PublicKey }[] = [];

    before(async () => {
        client = fromWorkspace(".");
        provider = new LiteSVMProvider(client);
        program = new anchor.Program<Privyfi>(IDL as any, provider);
        admin = Keypair.generate();
        cranker = Keypair.generate();
        
        client.airdrop(admin.publicKey, BigInt(10 * LAMPORTS_PER_SOL)); 
        client.airdrop(cranker.publicKey, BigInt(10 * LAMPORTS_PER_SOL)); 

        mintToken = new Keypair();
        const rent = 10000000;

        const inx1 = SystemProgram.createAccount({
            fromPubkey: admin.publicKey,
            newAccountPubkey: mintToken.publicKey,
            lamports: rent,
            space: MINT_SIZE,
            programId: TOKEN_PROGRAM_ID,
        });
        const inx2 = createInitializeMint2Instruction(mintToken.publicKey, 6, admin.publicKey, null);

        const tx = new Transaction().add(inx1, inx2);
        tx.recentBlockhash = client.latestBlockhash();
        tx.feePayer = admin.publicKey;
        tx.sign(admin, mintToken);
        client.sendTransaction(tx);

        marketPda = PublicKey.findProgramAddressSync(
            [Buffer.from("accuracy_market"), oracleFeedKp.publicKey.toBuffer(), roundId.toBuffer("le", 8)],
            PROGRAM_ID
        )[0];
        
        marketVault = getAssociatedTokenAddressSync(mintToken.publicKey, marketPda, true);

        // Setup 5 users
        for (let i = 0; i < 5; i++) {
            const userKp = Keypair.generate();
            client.airdrop(userKp.publicKey, BigInt(1 * LAMPORTS_PER_SOL));
            
            const userAta = getAssociatedTokenAddressSync(mintToken.publicKey, userKp.publicKey);
            
            const mintTx = new Transaction().add(
                createAssociatedTokenAccountInstruction(userKp.publicKey, userAta, userKp.publicKey, mintToken.publicKey),
                createMintToInstruction(mintToken.publicKey, userAta, admin.publicKey, 10_000_000) // 10 USDC
            );
            mintTx.recentBlockhash = client.latestBlockhash();
            mintTx.feePayer = userKp.publicKey;
            mintTx.sign(userKp, admin);
            client.sendTransaction(mintTx);
            
            const userPda = PublicKey.findProgramAddressSync(
                [Buffer.from("prediction"), userKp.publicKey.toBuffer(), marketPda.toBuffer()],
                PROGRAM_ID
            )[0];
            
            users.push({ kp: userKp, ata: userAta, pda: userPda });
        }
    });

    it("1. Initializes the 1-Minute Flash Pool", async () => {
        const basePrice = new anchor.BN(150_000); // 150.00
        const precisionStep = new anchor.BN(100);

        await program.methods.initializeAccuracyMarket(roundId, basePrice, precisionStep)
            .accounts({
                signer: admin.publicKey,
                oracleFeed: oracleFeedKp.publicKey,
                mint: mintToken.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([admin])
            .rpc();

        const marketAcc = await program.account.accuracyMarket.fetch(marketPda);
        assert.equal(marketAcc.isResolved, false);
    });

    it("2. Places 5 different bets", async () => {
        // User 0 predicts bucket 0 (150.00)
        await program.methods.placePrediction(roundId, 0, new anchor.BN(2_000_000))
            .accounts({ user: users[0].kp.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: users[0].ata, marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
            .signers([users[0].kp]).rpc();
            
        // User 1 predicts bucket 50 (155.00)
        await program.methods.placePrediction(roundId, 50, new anchor.BN(2_000_000))
            .accounts({ user: users[1].kp.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: users[1].ata, marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
            .signers([users[1].kp]).rpc();
            
        // User 2 predicts bucket 50 (155.00)
        await program.methods.placePrediction(roundId, 50, new anchor.BN(2_000_000))
            .accounts({ user: users[2].kp.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: users[2].ata, marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
            .signers([users[2].kp]).rpc();
            
        // User 3 predicts bucket 100 (160.00) -> Cap at 99
        await program.methods.placePrediction(roundId, 99, new anchor.BN(2_000_000))
            .accounts({ user: users[3].kp.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: users[3].ata, marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
            .signers([users[3].kp]).rpc();
            
        // User 4 predicts bucket 20 (170.00)
        await program.methods.placePrediction(roundId, 20, new anchor.BN(2_000_000))
            .accounts({ user: users[4].kp.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: users[4].ata, marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
            .signers([users[4].kp]).rpc();

        const marketAcc = await program.account.accuracyMarket.fetch(marketPda);
        assert.equal(marketAcc.totalParticipants, 5);
        assert.equal(marketAcc.totalPoolAmount.toString(), "10000000"); // 10 USDC
    });

    it("3. Time Travels 61 seconds", async () => {
        // LiteSVM handles clock natively.
        const clock = await client.getClock();
        const newTimestamp = clock.unixTimestamp + BigInt(61);
        clock.unixTimestamp = newTimestamp;
        await client.setClock(clock);
        
        // Verify time travel worked
        const newClock = await client.getClock();
        assert.isTrue(newClock.unixTimestamp >= newTimestamp);
    });

    it("4. Rejects a late bet", async () => {
        try {
            await program.methods.placePrediction(roundId, 5, new anchor.BN(2_000_000))
                .accounts({ user: users[0].kp.publicKey, market: marketPda, mint: mintToken.publicKey, userToken: users[0].ata, marketVault, oracleFeed: oracleFeedKp.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
                .signers([users[0].kp]).rpc();
            assert.fail("Should have failed with BettingWindowClosed");
        } catch (e: any) {
            assert.include(e.toString(), "BettingWindowClosed");
        }
    });

    it("5. Resolves Market with Median Error", async () => {
        const newClock = await client.getClock();
        // Price is 155.00 -> Bucket 5
        const price = BigInt(155_000_000_000); 
        const exponent = -8;
        
        const fakeData = createFakePythAccountData(price, exponent, newClock.unixTimestamp, SOL_USD_FEED_ID);
        
        client.setAccount(oracleFeedKp.publicKey, {
            lamports: 1_000_000,
            data: fakeData,
            owner: PYTH_RECEIVER_PROGRAM_ID,
            executable: false,
        });

        await program.methods.resolveMarket(roundId)
            .accounts({
                market: marketPda,
                priceUpdate: oracleFeedKp.publicKey,
                signer: cranker.publicKey,
            })
            .signers([cranker])
            .rpc();

        const marketAcc = await program.account.accuracyMarket.fetch(marketPda);
        assert.equal(marketAcc.isResolved, true);
        assert.equal(marketAcc.actualBucket, 50);
        
        // Users: 0 (err:5), 1 (err:0), 2 (err:0), 3 (err:5), 4 (err:15)
        // Median error should be calculated properly
        assert.isNotNull(marketAcc.medianError);
        console.log("Median Error Cutoff:", marketAcc.medianError);
    });

    it("6. Cranks Payouts and earns rent", async () => {
        const crankerStartingBalance = await client.getBalance(cranker.publicKey);

        // Gather remaining accounts in pairs [user_prediction, user_token]
        const remainingAccounts = users.map(u => [
            { pubkey: u.pda, isWritable: true, isSigner: false },
            { pubkey: u.ata, isWritable: true, isSigner: false }
        ]).flat();

        await program.methods.crankPayouts(roundId)
            .accounts({
                cranker: cranker.publicKey,
                market: marketPda,
                mint: mintToken.publicKey,
                marketVault,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .remainingAccounts(remainingAccounts)
            .signers([cranker])
            .rpc();

        const crankerEndingBalance = await client.getBalance(cranker.publicKey);
        
        // Cranker earned SOL rent from closed user_prediction accounts!
        assert.isTrue(crankerEndingBalance > crankerStartingBalance);
        
        // Verify users 1 and 2 received payout
        const u1Token = await getAccount(provider.connection, users[1].ata);
        assert.isTrue(Number(u1Token.amount) > 8_000_000); // Put in 2, won big share of 10!
    });
});
