// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import fs from "fs";

// Token-2022 Program ID
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

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
    PUSD: new PublicKey("9m4cLdJAGDgsuwHwu1up2avvatfmiSzgMa6aarHR135N"),
    AUDD: new PublicKey("HX4ENGDHv2F5cvWrBWAhdnEYQkA1U645G6LUs5uiWsQ")
  };

  const pools = [
    { name: "Kamino SOL Supply", apy: 745, mint: MINTS.SOL, tokenProgram: TOKEN_PROGRAM_ID },
    { name: "PUSD Stable Vault", apy: 1850, mint: MINTS.PUSD, tokenProgram: TOKEN_2022_PROGRAM_ID },
    { name: "USDC High Yield", apy: 1250, mint: MINTS.USDC, tokenProgram: TOKEN_PROGRAM_ID },
    { name: "AUDD Aussie Alpha", apy: 1250, mint: MINTS.AUDD, tokenProgram: TOKEN_2022_PROGRAM_ID },
  ];

  for (const pool of pools) {
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(pool.name)],
      program.programId
    );
    
    const poolVault = getAssociatedTokenAddressSync(pool.mint, poolPda, true, pool.tokenProgram);

    console.log(`Initializing pool: ${pool.name} at ${poolPda.toBase58()}`);

    try {
      const tx = await program.methods
        .initializePool(pool.name, new anchor.BN(pool.apy))
        .accounts({
          signer: provider.wallet.publicKey,
          pool: poolPda,
          mintToken: pool.mint,
          poolVault: poolVault,
          tokenProgram: pool.tokenProgram,
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
