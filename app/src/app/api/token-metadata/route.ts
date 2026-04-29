import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';

/**
 * Derives the Metaplex metadata PDA for a given mint.
 */
async function getMetadataPDA(mint: PublicKey): Promise<PublicKey> {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

/**
 * Reads a length-prefixed UTF-8 string from a buffer at a given offset.
 * Metaplex encodes strings as: [4-byte LE length][bytes...][null padding]
 */
function readString(buf: Buffer, offset: number): { value: string; nextOffset: number } {
  const len = buf.readUInt32LE(offset);
  offset += 4;
  const raw = buf.slice(offset, offset + len);
  // trim null bytes used as padding
  const value = raw.toString('utf8').replace(/\0/g, '').trim();
  return { value, nextOffset: offset + len };
}

/**
 * Decodes Metaplex token metadata from raw account data.
 * Layout: 1 (key) + 32 (update_authority) + 32 (mint) + str(name) + str(symbol) + str(uri) + ...
 */
function decodeMetadata(data: Buffer): { name: string; symbol: string } | null {
  try {
    let offset = 1 + 32 + 32; // key + update_authority + mint
    const { value: name, nextOffset: o1 } = readString(data, offset);
    const { value: symbol } = readString(data, o1);
    if (!name && !symbol) return null;
    return { name, symbol };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { mints } = await req.json();
    if (!Array.isArray(mints) || mints.length === 0) {
      return NextResponse.json({});
    }

    const connection = new Connection(RPC_URL, 'confirmed');

    // Resolve all metadata PDAs
    const mintPubkeys = mints.map((m: string) => new PublicKey(m));
    const pdas = await Promise.all(mintPubkeys.map(getMetadataPDA));

    // Batch fetch all accounts in one RPC call
    const accounts = await connection.getMultipleAccountsInfo(pdas);

    const result: Record<string, { name: string; symbol: string } | null> = {};

    accounts.forEach((acc, i) => {
      const mint = mints[i];
      if (!acc || !acc.data) {
        result[mint] = null;
        return;
      }
      result[mint] = decodeMetadata(Buffer.from(acc.data));
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Token metadata error:', err);
    return NextResponse.json({});
  }
}
