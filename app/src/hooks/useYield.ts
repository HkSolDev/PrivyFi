import { useState, useEffect } from 'react';
import { prefetchRecommendation } from './useAIRecommendation';

// --- Module-level cache ---
// Lives outside the component so it survives tab switches (remounts).
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

let cachedStrategies: any[] | null = null;
let cacheTimestamp: number | null = null;

function isCacheValid(): boolean {
  if (!cachedStrategies || cacheTimestamp === null) return false;
  return Date.now() - cacheTimestamp < CACHE_TTL_MS;
}
// -------------------------

/**
 * After yield data loads, silently pre-analyze the top 3 pools by APY
 * so users see instant AI results when they open those pools.
 */
function prefetchTopStrategies(strategies: any[]) {
  const top3 = [...strategies]
    .sort((a, b) => parseFloat(b.apy) - parseFloat(a.apy))
    .slice(0, 3);

  // Fire-and-forget — one at a time with a small stagger to avoid bursting the API
  top3.forEach((strategy, i) => {
    setTimeout(() => {
      prefetchRecommendation(strategy);
    }, i * 800); // stagger by 800ms each to be gentle on rate limits
  });
}

export function useYield() {
  const [strategies, setStrategies] = useState<any[]>(cachedStrategies ?? []);
  const [loading, setLoading] = useState<boolean>(!isCacheValid());
  const [error, setError] = useState<string | null>(null);

  const fetchYields = async (force = false) => {
    // Serve from cache if still valid and not a forced refresh
    if (!force && isCacheValid()) {
      setStrategies(cachedStrategies!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/yield');
      if (!response.ok) {
        throw new Error('Failed to fetch yield strategies');
      }
      const data = await response.json();

      // API returns { ok, strategies: [...] } — extract the array.
      // Fall back to data itself if it's already a flat array (legacy safety).
      const list: any[] = Array.isArray(data) ? data : (data.strategies ?? []);

      // Update module-level cache
      cachedStrategies = list;
      cacheTimestamp = Date.now();

      setStrategies(list);

      // 🔥 Background prefetch: kick off AI analysis for top 3 pools
      prefetchTopStrategies(list);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYields();
  }, []);

  // `refresh` always forces a new network request and busts the cache
  return { strategies, loading, error, refresh: () => fetchYields(true) };
}
