import { useState } from 'react';
import { toast } from 'sonner';
import { useYield } from './useYield';
import { usePortfolio } from './usePortfolio';
import { useRewards } from './useRewards';

export interface Vote {
  model: string;
  category: string;
  vote: string;
  confidence: number;
  reason: string;
}

export interface SwarmResult {
  winner: string;
  totalVoters: number;
  activeVotes: number;
  consensusRatio: string;
  votes: Vote[];
}

export function useAISwarm() {
  const { strategies } = useYield();
  const { tokens, totalValue } = usePortfolio();
  const { addPoints } = useRewards();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SwarmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSwarmAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio: { totalValue, assetCount: tokens.length },
          strategies: strategies.map(s => ({ name: s.name, apy: s.apy, protocol: s.protocol }))
        })
      });

      if (!response.ok) throw new Error('Swarm consensus failed');

      const data = await response.json();
      setResult(data);
      
      // Award points for using AI Swarm! 
      // We wrap this so if the user cancels the signature, they still see the result.
      try {
        toast.info("Signing for Governance XP...");
        await addPoints(50);
        toast.success("+50 XP Earned!");
      } catch (e) {
        console.log("Point recording skipped or rejected");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { runSwarmAnalysis, result, loading, error };
}
