import { NextResponse } from 'next/server';

export const revalidate = 60; // Cache for 60 seconds

const fetchWithTimeout = async (url: string, options: any, timeoutMs: number = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// ─── Polymarket ────────────────────────────────────────────────────────────
async function fetchPolymarket() {
  try {
    const res = await fetchWithTimeout('https://gamma-api.polymarket.com/markets?closed=false&limit=50&order=volumeNum&ascending=false', {});
    if (!res.ok) return [];
    
    const data = await res.json();
    let validMarkets: any[] = [];
    
    for (const m of (data || [])) {
      let yesPrice = 0, noPrice = 0;
      try {
        const prices = JSON.parse(m.outcomePrices);
        yesPrice = parseFloat(prices[0] || '0');
        noPrice = parseFloat(prices[1] || String(1 - yesPrice));
      } catch (e) {}
      
      if (yesPrice < 0.05 || yesPrice > 0.95) continue;
      
      validMarkets.push({
        id: `poly-${m.id}`,
        title: m.question,
        category: m.category || m.groupItemTitle || 'Crypto',
        protocol: 'Polymarket' as const,
        protocolUrl: `https://polymarket.com/event/${m.slug}`,
        volume: parseFloat(String(m.volumeNum || '0')),
        outcomes: [
          { name: 'Yes', price: yesPrice, color: 'green' },
          { name: 'No', price: noPrice, color: 'red' }
        ],
        endTime: m.endDate || new Date().toISOString(),
      });
    }
    
    return validMarkets.slice(0, 8); // Slot guarantee: 8
  } catch (e) {
    console.error('Polymarket Error:', e);
    return [];
  }
}

// ─── Kalshi ─────────────────────────────────────────────────────────────────
async function fetchKalshi() {
  try {
    const res = await fetchWithTimeout('https://api.elections.kalshi.com/trade-api/v2/markets?limit=50&status=open&sort_by=volume', {});
    if (!res.ok) return [];
    
    const json = await res.json();
    return (json.markets || [])
      .map((m: any) => {
        const yesPrice = parseFloat(m.yes_bid_dollars ?? '0.5');
        const noPrice = parseFloat(m.no_bid_dollars ?? '0.5');

        return {
          id: `kalshi-${m.ticker}`,
          title: m.title,
          category: m.category || 'Politics',
          protocol: 'Kalshi' as const,
          protocolUrl: `https://kalshi.com/markets/${m.ticker}`,
          volume: parseFloat(String(m.volume_fp || '0')),
          outcomes: [
            { name: 'Yes', price: yesPrice, color: 'green' },
            { name: 'No', price: noPrice, color: 'red' }
          ],
          endTime: m.close_time || new Date().toISOString(),
        };
      })
      .filter((m: any) => m.outcomes[0].price > 0.05 && m.outcomes[0].price < 0.95)
      .slice(0, 6); // Slot guarantee: 6
  } catch (e) {
    console.error('Kalshi Error:', e);
    return [];
  }
}

// ─── Manifold ───────────────────────────────────────────────────────────────
async function fetchManifold() {
  try {
    const res = await fetchWithTimeout('https://api.manifold.markets/v0/markets?limit=100', {});
    if (!res.ok) return [];
    
    const data = await res.json();
    return (data || [])
      .filter((m: any) => m.probability !== undefined && m.probability !== null && m.volume !== undefined)
      .filter((m: any) => m.probability > 0.05 && m.probability < 0.95 && m.isResolved === false)
      .sort((a: any, b: any) => (b.volume || 0) - (a.volume || 0))
      .map((m: any) => ({
        id: `manifold-${m.id}`,
        title: m.question,
        category: 'General',
        protocol: 'Manifold' as const,
        protocolUrl: m.url,
        volume: parseFloat(String(m.volume || '0')),
        outcomes: [
          { name: 'Yes', price: m.probability, color: 'green' },
          { name: 'No', price: 1 - m.probability, color: 'red' }
        ],
        endTime: m.closeTime ? new Date(m.closeTime).toISOString() : new Date().toISOString(),
      }))
      .slice(0, 4); // Slot guarantee: 4
  } catch (e) {
    console.error('Manifold Error:', e);
    return [];
  }
}

// ─── Metaculus ──────────────────────────────────────────────────────────────
async function fetchMetaculus() {
  try {
    const res = await fetchWithTimeout('https://www.metaculus.com/api2/questions/?status=open&order_by=-activity&limit=20&type=forecast', {});
    if (!res.ok) return [];
    
    const data = await res.json();
    return (data.results || [])
      .map((q: any) => {
        let yesPrice = 0.5;
        if (q.community_prediction?.full?.q2 !== undefined) {
            yesPrice = q.community_prediction.full.q2;
        }

        return {
          id: `meta-${q.id}`,
          title: q.title,
          category: 'Research',
          protocol: 'Metaculus' as const,
          protocolUrl: `https://metaculus.com${q.page_url}`,
          volume: parseFloat(String(q.activity_score || '0')),
          outcomes: [
            { name: 'Yes', price: yesPrice, color: 'green' },
            { name: 'No', price: 1 - yesPrice, color: 'red' }
          ],
          endTime: q.resolve_before_time || new Date().toISOString(),
        };
      })
      .filter((m: any) => m.outcomes[0].price > 0.05 && m.outcomes[0].price < 0.95)
      .slice(0, 2); // Slot guarantee: 2
  } catch (e) {
    console.error('Metaculus Error:', e);
    return [];
  }
}

// ─── Route Handler ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    // ❌ DO NOT add Drift — protocol is suspended post-exploit
    // Exploit occurred in April 2026, deposits/withdrawals currently locked.
    // Including it risks users getting stuck trying to trade.

    const [poly, kalshi, manifold, metaculus] = await Promise.all([
      fetchPolymarket(),
      fetchKalshi(),
      fetchManifold(),
      fetchMetaculus()
    ]);

    let allMarkets = [...poly, ...kalshi, ...manifold, ...metaculus];
    console.log(`Merged: poly=${poly.length}, kalshi=${kalshi.length}, manifold=${manifold.length}, metaculus=${metaculus.length}`);

    const now = Date.now();

    // Transform and add specific logic
    const processedMarkets = allMarkets
      .map(m => {
        const yesPrice = m.outcomes[0].price;
        const daysLeft = Math.ceil((new Date(m.endTime).getTime() - now) / 86400000);
        
        return {
          ...m,
          validPrice: yesPrice > 0 && yesPrice < 1,
          daysLeft,
          lowLiquidity: m.volume < 10000,
        };
      })
      // Filter valid prices and active dates
      .filter(m => m.validPrice && m.daysLeft >= 0)
      .map(m => {
        // Format volume to string for UI
        return {
          ...m,
          volume: m.volume >= 1_000_000 
            ? `$${(m.volume / 1_000_000).toFixed(1)}M`
            : m.volume >= 1_000 
            ? `$${(m.volume / 1_000).toFixed(1)}K`
            : `$${m.volume}`
        };
      });

    return NextResponse.json({
      ok: true,
      count: processedMarkets.length,
      updatedAt: new Date().toISOString(),
      markets: processedMarkets,
    });
  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json({
      ok: false,
      count: 0,
      updatedAt: new Date().toISOString(),
      markets: [],
      error: 'Failed to fetch prediction markets',
    }, { status: 500 });
  }
}
