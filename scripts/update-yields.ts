import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Privyfi } from "../app/src/idl/privyfi";
import idl from "../app/src/idl/privyfi.json";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Configuration ──────────────────────────────────────────────────────────
const CONNECTION_URL = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("Czmhx4o5349ugHqTjNEArm6eoakk2btihu4bcBCvdt36");

// Auto-read from your local Solana CLI keypair
const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
const AUTHORITY = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
);

async function fetchMeteoraYields() {
  try {
    const res = await fetch('https://dlmm.datapi.meteora.ag/pair/all');
    const data = await res.json();
    return data.slice(0, 5).map((p: any) => ({
      protocol: 0, // Meteora
      poolType: 0, // DLMM
      apyBps: Math.round((parseFloat(p.apr) + (parseFloat(p.farm_apr) || 0)) * 100),
      tvlUsd: new anchor.BN(Math.round(parseFloat(p.liquidity))),
      risk: parseFloat(p.apr) > 100 ? 2 : 1,
      address: new PublicKey(p.address),
    }));
  } catch (e) { return []; }
}

async function fetchKaminoYields() {
  try {
    const res = await fetch('https://api.kamino.finance/v2/lending-markets');
    const data = await res.json();
    const strategies = [];
    for (const market of data) {
      if (!market.reserves) continue;
      for (const reserve of market.reserves) {
        const supplyApy = parseFloat(reserve.supplyInterestAPY ?? '0') * 100;
        if (supplyApy > 0) {
          strategies.push({
            protocol: 1, // Kamino
            poolType: 2, // Lending
            apyBps: Math.round(supplyApy * 100),
            tvlUsd: new anchor.BN(Math.round(parseFloat(reserve.totalSupplyUsd ?? '0'))),
            risk: supplyApy > 20 ? 1 : 0,
            address: new PublicKey(reserve.mintAddress),
          });
        }
      }
    }
    return strategies.slice(0, 5);
  } catch (e) { return []; }
}

async function runCrank() {
  const connection = new Connection(CONNECTION_URL, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(AUTHORITY), {});
  const program = new Program(idl as any, provider) as Program<Privyfi>;

  console.log("🚀 Starting Yield Crank...");

  const [meteora, kamino] = await Promise.all([
    fetchMeteoraYields(),
    fetchKaminoYields(),
  ]);

  const allStrategies = [...meteora, ...kamino].slice(0, 20);

  const [yieldStorePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("yield-store")],
    PROGRAM_ID
  );

  try {
    // Check if store exists, if not initialize it
    const account = await connection.getAccountInfo(yieldStorePDA);
    if (!account) {
      console.log("📦 Initializing Yield Store...");
      await program.methods
        .initializeYieldStore()
        .accounts({
          yieldStore: yieldStorePDA,
          authority: AUTHORITY.publicKey,
        } as any)
        .signers([AUTHORITY])
        .rpc();
    }

    console.log(`📝 Writing ${allStrategies.length} strategies to on-chain PDA...`);
    await program.methods
      .updateYields(allStrategies)
      .accounts({
        yieldStore: yieldStorePDA,
        authority: AUTHORITY.publicKey,
      } as any)
      .signers([AUTHORITY])
      .rpc();

    console.log("✅ Successfully updated on-chain yields!");
  } catch (err) {
    console.error("❌ Crank failed:", err);
  }
}

runCrank();
