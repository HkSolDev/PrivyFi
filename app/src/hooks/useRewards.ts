'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAnchorProgram } from './useAnchorProgram';
import { useUserProfile } from './useUserProfile';
import { PublicKey } from '@solana/web3.js';

export function useRewards() {
  const { program, wallet, getPdas, recordAction, initializeUser } = useAnchorProgram();
  const { profile } = useUserProfile();
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRewards = useCallback(async () => {
    if (!program || !wallet) return;

    try {
      const { userRewardPda } = getPdas(wallet.publicKey, "");
      const rewardAcc = await program.account.userReward.fetch(userRewardPda);
      setPoints(rewardAcc.totalRewardPoints.toNumber());
    } catch (e) {
      console.log("No rewards account found yet.");
    } finally {
      setLoading(false);
    }
  }, [program, wallet, getPdas]);

  useEffect(() => {
    fetchRewards();
    
    // Simulate real-time yield generation for the demo
    const interval = setInterval(() => {
      setPoints(prev => prev > 0 ? prev + Math.floor(Math.random() * 5) + 1 : 0);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [program, wallet, getPdas, fetchRewards]);

  const addPoints = async (amount: number) => {
    if (!program || !wallet) return;

    const isPrivate = profile?.privateMode || false;

    try {
      await recordAction(amount, isPrivate);
      // fetchRewards will be triggered by subscription or optimistic update
      if (isPrivate) {
        setPoints(prev => prev + amount); // Optimistic for MagicBlock speed
      }
    } catch (e) {
      console.error("Failed to record action:", e);
    }
  };

  return { points, loading, addPoints, refresh: fetchRewards };
}
