import { NextResponse } from 'next/server';

const PYTH_SOL_FEED_ID = 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';

export async function GET() {
  try {
    const url = 'https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=' + PYTH_SOL_FEED_ID;
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ price: 0, error: 'Pyth error: ' + text.slice(0, 100) });
    }
    const data = await res.json();
    const p = data?.parsed?.[0]?.price;
    if (p) {
      const price = parseFloat(p.price) * Math.pow(10, p.expo);
      return NextResponse.json({ price, feed: PYTH_SOL_FEED_ID, source: 'pyth' });
    }
    return NextResponse.json({ price: 0, error: 'No price in Pyth response' });
  } catch (err: any) {
    console.error('[/api/price/pyth] error:', err);
    return NextResponse.json({ price: 0, error: err.message }, { status: 500 });
  }
}
