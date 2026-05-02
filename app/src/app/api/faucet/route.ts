import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { mintTo, getOrCreateAssociatedTokenAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import os from 'os';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { targetAddress, mintAddress } = await req.json();

    if (!targetAddress || !mintAddress) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Connect to devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    // Load local keypair (Mint Authority)
    const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
    if (!fs.existsSync(keypairPath)) {
       return NextResponse.json({ error: 'Mint authority keypair not found on server' }, { status: 500 });
    }

    const secretKeyString = fs.readFileSync(keypairPath, 'utf8');
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const authority = Keypair.fromSecretKey(secretKey);

    const mint = new PublicKey(mintAddress);
    const target = new PublicKey(targetAddress);
    
    // Different airdrop amounts based on token
    let amount = 1000 * 1_000_000; // Default 1,000 tokens
    
    // If it's AUDD, maybe give more/less? Let's stick to 1,000 for now.
    // We could add logic here for different tokens if needed.

    // Ensure target has an ATA for this Token-2022 mint
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      mint,
      target,
      false,
      "confirmed",
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Mint tokens
    const signature = await mintTo(
      connection,
      authority,
      mint,
      ata.address,
      authority,
      amount,
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    return NextResponse.json({ success: true, signature });
  } catch (error: any) {
    console.error('Faucet Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
