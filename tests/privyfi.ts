import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import IDL from "../target/idl/privyfi.json" with { type: "json" };
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMint2Instruction, getAssociatedTokenAddressSync, createMintToInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

import type { Privyfi } from "../target/types/privyfi";
import { assert } from "chai";
import { getAccount } from "@solana/spl-token";
const PROGRAM_ID = new PublicKey(IDL.address);

describe("privyfi", () => {
    // User who came to Privy
    let user: Keypair;
    let userProfilePda: PublicKey;
    let userPositionPda: PublicKey;
    let userRewardPda: PublicKey;
    let poolPda: PublicKey;
    let provider: LiteSVMProvider;
    let client: ReturnType<typeof fromWorkspace>;
    let program: anchor.Program<Privyfi>;
    let mintToken: Keypair;
    let rent_exemption_account : Keypair;

    before(async () => {
        client = fromWorkspace(".");
        provider = new LiteSVMProvider(client);
        program = new anchor.Program<Privyfi>(IDL as any, provider);
        user = Keypair.generate();
        client.airdrop(user.publicKey, BigInt(10_000_000_000)); // Fund the user with 10 SOL
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

   /// Get the latest blockhash for the tx — LiteSVM controls this internally
     const blockhash = client.latestBlockhash();
     const tx = new Transaction().add(inx1, inx2);
     tx.recentBlockhash = blockhash;
     tx.feePayer = user.publicKey;
     tx.sign(user, mintToken);
     client.sendTransaction(tx);

        
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
        .signers([user])
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

userPositionPda = await PublicKey.findProgramAddressSync(
    [Buffer.from("position"), user.publicKey.toBuffer() , poolPda.toBuffer()],
    PROGRAM_ID
)[0];

   // Derive the user's Associated Token Account (ATA) address
   const userAta = getAssociatedTokenAddressSync(mintToken.publicKey, user.publicKey);

   // Build transaction: create the ATA + mint 2_000_000 tokens into it
   const bh2 = client.latestBlockhash();
   const mintTx = new Transaction().add(
     createAssociatedTokenAccountInstruction(user.publicKey, userAta, user.publicKey, mintToken.publicKey),
     createMintToInstruction(mintToken.publicKey, userAta, user.publicKey, 2_000_000)
   );
   mintTx.recentBlockhash = bh2;
   mintTx.feePayer = user.publicKey;
   mintTx.sign(user);
   client.sendTransaction(mintTx);

    await program.methods.deposit(new anchor.BN(1000000))
      .accounts({
        user: user.publicKey,
        pool: poolPda,
        userProfile: userProfilePda,
        mintToken: mintToken.publicKey,
        poolVault: supplyVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc()

      // Use SPL token getAccount() instead of raw bytes — clean and readable
      const vaultTokenAccount = await getAccount(provider.connection, supplyVault);
      console.log("Supply Vault Balance: ", vaultTokenAccount.amount.toString());
      assert.equal(vaultTokenAccount.amount.toString(), "1000000");

      let userPositionAcc = await program.account.userPosition.fetch(userPositionPda);
      console.log("User Position Account: ", userPositionAcc);
      assert.equal(userPositionAcc.amount.toString(), "1000000");
      assert.equal(userPositionAcc.owner.toString(), user.publicKey.toString());
      assert.equal(userPositionAcc.pool.toString(), poolPda.toString());

      let userProfileAcc = await program.account.userProfile.fetch(userProfilePda);
      console.log("User Profile Account: ", userProfileAcc);
      assert.equal(userProfileAcc.totalStaked.toString(), "1000000");
})

  // ─── TODO (Morning): Write the Withdraw Test ────────────────────────────
  // Plan:
  //   1. Arrange — deposit test above already put 1_000_000 tokens in the vault
  //   2. Act    — call program.methods.withdraw(new anchor.BN(500_000))
  //               .accounts({ user, userProfile, pool, mintToken, userToken, poolVault, tokenProgram })
  //   3. Assert — vault balance drops to 500_000
  //             — pool.totalStaked drops to 500_000

  // ────────────────────────────────────────────────────────────────────────
//
});
