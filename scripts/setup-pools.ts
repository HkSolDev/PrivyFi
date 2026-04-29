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
  
  const MINTS = {
    USDC: new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"),
    SOL: new PublicKey("So11111111111111111111111111111111111111112"),
    PUSD: new PublicKey("D7cz4o6bMYFSP1tRxMcfivpKj4HSApc1qfQnub2S72Ca") // Mock for now
  };

  const pools = [
    { name: "Kamino SOL Supply", apy: 745, mint: MINTS.SOL },
    { name: "PUSD Stable Vault", apy: 1850, mint: MINTS.PUSD },
    { name: "USDC High Yield", apy: 1250, mint: MINTS.USDC },
  ];

  for (const pool of pools) {
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(pool.name)],
      program.programId
    );
    
    const poolVault = getAssociatedTokenAddressSync(pool.mint, poolPda, true);

    console.log(`Initializing pool: ${pool.name} at ${poolPda.toBase58()}`);

    try {
      const tx = await program.methods
        .initializePool(pool.name, new anchor.BN(pool.apy))
        .accounts({
          signer: provider.wallet.publicKey,
          pool: poolPda,
          mintToken: pool.mint,
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
