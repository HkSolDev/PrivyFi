import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import IDL from "../target/idl/privyfi.json" with { type: "json" };
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMint2Instruction, getAssociatedTokenAddressSync, createMintToInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

import type { Privyfi } from "../target/types/privyfi";
import { assert } from "chai";

const PROGRAM_ID = new PublicKey(IDL.address);

describe("privyfi", () => {
    // User who came to Privy
    let user: Keypair;
    let userProfilePda: PublicKey;
    let userRewardPda: PublicKey;
    let poolPda: PublicKey;
    let provider: BankrunProvider;
    let program: anchor.Program<Privyfi>;
    let mintToken: Keypair;
    let rent_exemption_account : Keypair;

    before(async () => {
        const context = await startAnchor("", [], []);
        provider = new BankrunProvider(context);
        program = new anchor.Program<Privyfi>(IDL as any, provider);
        const client = context.banksClient;
        user = context.payer; // Use the pre-funded Bankrun payer!
        mintToken = new Keypair();
        const rent = 10000000; // hardcode safe rent amount for mint

      /// Instruction to create the Mint 
          const inx1 = SystemProgram.createAccount({
                fromPubkey: user.publicKey,
                newAccountPubkey: mintToken.publicKey,
                lamports: rent,
                space: MINT_SIZE,
                programId: TOKEN_PROGRAM_ID,
            });
          const inx2 = createInitializeMint2Instruction(mintToken.publicKey, 6, user.publicKey, null);

   /// Get the latest blockhash for the tx 
     const [latestBlockhash] = await client.getLatestBlockhash();
     const tx = new Transaction().add(inx1, inx2);
     tx.recentBlockhash = latestBlockhash;
     tx.feePayer = user.publicKey;
     tx.sign(user, mintToken);
     await client.processTransaction(tx); 

        
        userProfilePda = PublicKey.findProgramAddressSync(
            [Buffer.from("profile"), user.publicKey.toBuffer()],
            PROGRAM_ID
        )[0];
        
        userRewardPda = PublicKey.findProgramAddressSync(
            [Buffer.from("reward"), user.publicKey.toBuffer()],
            PROGRAM_ID
        )[0];

        const poolName = "pool";
        poolPda = PublicKey.findProgramAddressSync(
            [Buffer.from("pool"), Buffer.from(poolName)],
            PROGRAM_ID
        )[0];
    });

  it("Initializes a user", async () => {
    await program.methods.initializeUser()
        .accounts({
            signer: user.publicKey,
        })
        .rpc();

    let userProfileAcc = await program.account.userProfile.fetch(userProfilePda);
    console.log("User Profile Account: ", userProfileAcc);
    
    let userRewardAcc = await program.account.userReward.fetch(userRewardPda);
    console.log("User Reward Account: ", userRewardAcc);

    assert.equal(userProfileAcc.owner.toString(), user.publicKey.toString());
    assert.equal(userRewardAcc.owner.toString(), user.publicKey.toString());
    assert.equal(userProfileAcc.totalStaked.toString(), "0");
    assert.equal(userProfileAcc.privateMode, false);
    assert.equal(userRewardAcc.totalRewardPoints.toString(), "0");
  });


  it("Create Pool", async () => {
    const supplyVault = getAssociatedTokenAddressSync(mintToken.publicKey, poolPda, true);

    await program.methods.initializePool("pool", new anchor.BN(500))
      .accounts({
        signer: user.publicKey,
        mintToken: mintToken.publicKey,
        supplyVault: supplyVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc()

      let poolAcc = await program.account.mockPool.fetch(poolPda);
      console.log("Pool Account: ", poolAcc);
      assert.equal(poolAcc.vaultName, "pool");
      assert.equal(poolAcc.apyBps.toString(), "500");
  })

  //Deposite Test
it("deposite", async() => {
   const supplyVault = getAssociatedTokenAddressSync(mintToken.publicKey, poolPda, true);

   // Derive the user's Associated Token Account (ATA) address
   const userAta = getAssociatedTokenAddressSync(mintToken.publicKey, user.publicKey);

   // Build transaction: create the ATA + mint 2_000_000 tokens into it
   const [latestBlockhash2] = await (provider.context.banksClient as any).getLatestBlockhash();
   const mintTx = new Transaction().add(
     createAssociatedTokenAccountInstruction(user.publicKey, userAta, user.publicKey, mintToken.publicKey),
     createMintToInstruction(mintToken.publicKey, userAta, user.publicKey, 2_000_000)
   );
   mintTx.recentBlockhash = latestBlockhash2;
   mintTx.feePayer = user.publicKey;
   mintTx.sign(user);
   await (provider.context.banksClient as any).processTransaction(mintTx);

    await program.methods.deposit(new anchor.BN(1000000))
      .accounts({
        user: user.publicKey,
        pool: poolPda,
        mintToken: mintToken.publicKey,
        poolVault: supplyVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc()

      let vaultAccountInfo = await (provider.context.banksClient as any).getAccount(supplyVault);
      // SPL Token account layout: bytes 64-72 hold the token amount (u64, little-endian)
      const vaultBalance = Buffer.from(vaultAccountInfo.data).readBigUInt64LE(64);
      console.log("Supply Vault Balance: ", vaultBalance.toString());
      assert.equal(vaultBalance.toString(), "1000000");
})
});
