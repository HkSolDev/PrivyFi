import { useState } from 'react';

export interface AIRecommendation {
  recommended: boolean;
  confidenceScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  reasoning: string;
}

// --- Module-level AI recommendation cache ---
// Keyed by strategy name+apy. Survives tab switches for the entire session.
const recommendationCache = new Map<string, AIRecommendation>();

function getCacheKey(strategy: any): string {
  return `${strategy.name}_${strategy.apy}`;
}

/**
 * Standalone prefetch function — can be called outside of a React component.
 * Fetches and caches an AI recommendation for a strategy silently in the background.
 */
export async function prefetchRecommendation(strategy: any): Promise<void> {
  const cacheKey = getCacheKey(strategy);
  if (recommendationCache.has(cacheKey)) return; // Already cached, skip

  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy }),
    });
    if (!response.ok) return;
    const data = await response.json();
    recommendationCache.set(cacheKey, data);
  } catch {
    // Silent fail — this is a background optimization, not critical path
  }
}
// -------------------------------------------

export function useAIRecommendation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);

  const analyzeStrategy = async (strategy: any, portfolio?: any) => {
    const cacheKey = getCacheKey(strategy);

    // Serve from cache instantly — no spinner, no API call
    if (recommendationCache.has(cacheKey)) {
      const cached = recommendationCache.get(cacheKey)!;
      setRecommendation(cached);
      return cached;
    }

    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, portfolio }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI recommendation');
      }

      const data = await response.json();
      recommendationCache.set(cacheKey, data);
      setRecommendation(data);
      return data as AIRecommendation;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRecommendation(null);
    setError(null);
  };

  /** Instantly hydrates state from cache. Returns true if a cache hit occurred. */
  const loadFromCache = (strategy: any): boolean => {
    const cacheKey = getCacheKey(strategy);
    if (recommendationCache.has(cacheKey)) {
      setRecommendation(recommendationCache.get(cacheKey)!);
      return true;
    }
    return false;
  };

  return { analyzeStrategy, recommendation, loading, error, reset, loadFromCache };
}
