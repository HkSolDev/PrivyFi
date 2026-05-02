import { useState } from 'react';

export interface AIRecommendation {
  recommended: boolean;
  confidenceScore: number;   // 0-100: how sure the AI is
  riskScore: number;         // 0-100: 0 = safe, 100 = extremely risky
  riskLevel: 'Low' | 'Medium' | 'High';
  reasoning: string[];       // exactly 3 bullet-point reasons
  exampleReturn: string;     // "If you deposit $100, you could earn ~$X in 30 days"
  swarmVotes?: Array<{ model: string; vote: string; confidence: number; reasoning?: string }>;  // individual node votes
}

// --- Module-level AI recommendation cache ---
// Keyed by strategy name+apy. Survives tab switches for the entire session.
const recommendationCache = new Map<string, AIRecommendation>();

function getCacheKey(strategy: any): string {
  return `${strategy.name}_${strategy.apy}`;
}

/**
 * Standalone prefetch — can be called outside React components.
 * Fetches and stores an AI recommendation in the background silently.
 */
export async function prefetchRecommendation(strategy: any): Promise<void> {
  const cacheKey = getCacheKey(strategy);
  if (recommendationCache.has(cacheKey)) return;

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
    // Silent fail — background optimization only
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

      if (!response.ok) throw new Error('Failed to get AI recommendation');

      const data: AIRecommendation = await response.json();
      recommendationCache.set(cacheKey, data);
      setRecommendation(data);
      return data;
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

  /** Instantly hydrates state from cache. Returns true on cache hit. */
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
