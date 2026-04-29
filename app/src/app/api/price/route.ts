import { NextResponse } from 'next/server';

// Server-side proxy for Jupiter price API.
// Cannot call this from the browser due to CORS restrictions.
export async function GET() {
  try {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const res = await fetch(
      `https://api.jup.ag/price/v2?ids=${SOL_MINT}`,
      { next: { revalidate: 30 } } // cache 30s at the edge
    );

    if (!res.ok) {
      return NextResponse.json({ price: 145.00 }); // safe fallback
    }

    const data = await res.json();
    const price = data?.data?.[SOL_MINT]?.price ?? 145.00;
    return NextResponse.json({ price });
  } catch {
    return NextResponse.json({ price: 145.00 });
  }
}
