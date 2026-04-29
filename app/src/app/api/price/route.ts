import { NextRequest, NextResponse } from 'next/server';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Maps devnet mints to their mainnet counterparts.
 * Only needed when the address differs between devnet and mainnet.
 */
const DEVNET_TO_MAINNET: Record<string, string> = {
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

/**
 * Well-known mainnet mints → CoinGecko coin IDs.
 * CoinGecko free tier works without an API key.
 */
const MINT_TO_COINGECKO_ID: Record<string, string> = {
  [SOL_MINT]: 'solana',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',       // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',          // USDT
  'HzjNoRndS8p8KuM9Fst7337B24hV9PtgXp38N3oEa649': 'euro-coin',       // EURC
  'J1toso9baSuRRACJzKuKkhBhZzhJBMADU2Jy9Gr6Y4Gu': 'jito-staked-sol', // JitoSOL
  'mSoLzYSaayHpkSbsUuoeZem8vDeBw7mYdfVTe3vQ28':   'msol',            // mSOL
  'bSo13rMqkyNpS26379pUfyrVf7rA92N9k4T6kXo13v':   'blazestake-staked-sol', // bSOL
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'bonk',            // BONK
  'EKpQGSJtjMFqKZ9KQanAtY7YXDeghqy3u6Yv8Z1W':     'dogwifcoin',      // WIF
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ethereum-wormhole', // wETH
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': 'bitcoin-wormhole', // wBTC
};

/** Fetch SOL price from Binance (most real-time, no key needed) */
async function fetchSolFromBinance(): Promise<number | null> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT', {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.price ? parseFloat(data.price) : null;
  } catch {
    return null;
  }
}

/** Fetch multiple token prices by CoinGecko ID */
async function fetchFromCoinGecko(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, number> = {};
    for (const [id, values] of Object.entries(data)) {
      result[id] = (values as any).usd;
    }
    return result;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mintsStr = searchParams.get('mints');
    const rawMints: string[] = mintsStr
      ? [...new Set(mintsStr.split(',').filter(m => m.length > 20))]
      : [SOL_MINT];

    if (rawMints.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    // Resolve devnet → mainnet addresses
    const resolvedMints = rawMints.map(m => DEVNET_TO_MAINNET[m] ?? m);

    const prices: Record<string, number> = {}; // keyed by ORIGINAL mint

    // Identify which resolved mints have CoinGecko IDs
    const geckoIds: string[] = [];
    const mintToGeckoId: Record<string, string> = {};

    resolvedMints.forEach((resolved, idx) => {
      const id = MINT_TO_COINGECKO_ID[resolved];
      if (id) {
        geckoIds.push(id);
        mintToGeckoId[rawMints[idx]] = id;
      }
    });

    // Fetch SOL from Binance (fastest, most accurate) + rest from CoinGecko in parallel
    const solOriginalMint = rawMints.find(m => (DEVNET_TO_MAINNET[m] ?? m) === SOL_MINT);
    const geckoIdsWithoutSol = geckoIds.filter(id => id !== 'solana');

    const [solPrice, geckoData] = await Promise.all([
      solOriginalMint ? fetchSolFromBinance() : Promise.resolve(null),
      fetchFromCoinGecko(geckoIdsWithoutSol),
    ]);

    // Map CoinGecko data back to original mints
    rawMints.forEach(originalMint => {
      const geckoId = mintToGeckoId[originalMint];
      if (!geckoId) return;
      if (geckoId === 'solana' && solPrice != null) {
        prices[originalMint] = solPrice;
      } else if (geckoData[geckoId] != null) {
        prices[originalMint] = geckoData[geckoId];
      }
    });

    // If Binance failed for SOL, try CoinGecko
    if (solOriginalMint && !prices[solOriginalMint]) {
      const fallback = await fetchFromCoinGecko(['solana']);
      if (fallback['solana']) prices[solOriginalMint] = fallback['solana'];
    }

    return NextResponse.json({
      price: prices[solOriginalMint ?? SOL_MINT] ?? 0,
      prices,
    });
  } catch (err) {
    console.error('[/api/price] critical error:', err);
    return NextResponse.json({ prices: {} }, { status: 500 });
  }
}
