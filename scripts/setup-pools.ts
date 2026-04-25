// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import fs from "fs";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load IDL manually
  const idlStr = fs.readFileSync("./app/src/idl/privyfi.json", "utf-8");
  const idl = JSON.parse(idlStr);
  const program = new anchor.Program(idl, provider);
  
  const mockMint = new PublicKey("D7cz4o6bMYFSP1tRxMcfivpKj4HSApc1qfQnub2S72Ca"); // Custom Devnet Mint

  const pools = [
    { name: "Kamino SOL Supply", apy: 745 }, 
  ];

  for (const pool of pools) {
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(pool.name)],
      program.programId
    );
    
    const poolVault = getAssociatedTokenAddressSync(mockMint, poolPda, true);

    console.log(`Initializing pool: ${pool.name} at ${poolPda.toBase58()}`);

    try {
      const tx = await program.methods
        .initializePool(pool.name, new anchor.BN(pool.apy))
        .accounts({
          signer: provider.wallet.publicKey,
          pool: poolPda,
          mintToken: mockMint,
          poolVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(`Pool initialized! Tx: ${tx}`);
    } catch (e: any) {
      console.log(`Pool ${pool.name} already exists or failed: ${e.message}`);
    }
  }
}

main();
