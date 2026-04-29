'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAnchorProgram } from './useAnchorProgram';
import { PublicKey } from '@solana/web3.js';

export function useRewards() {
  const { program, wallet, getPdas, recordAction, initializeUser } = useAnchorProgram();
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

    if (!program || !wallet) return () => clearInterval(interval);
    
    const { userRewardPda } = getPdas(wallet.publicKey, "");
    
    // Simple subscription
    const subscriptionId = program.provider.connection.onAccountChange(
      userRewardPda,
      (accountInfo) => {
        fetchRewards();
      },
      'confirmed'
    );

    return () => {
      clearInterval(interval);
      program.provider.connection.removeAccountChangeListener(subscriptionId);
    };
  }, [program, wallet, getPdas, fetchRewards]);

  const addPoints = async (amount: number) => {
    if (!program || !wallet) return;

    try {
      // Ensure initialized
      try {
        await initializeUser();
      } catch (e) {}

      await recordAction(amount);
      // fetchRewards will be triggered by subscription
    } catch (e) {
      console.error("Failed to record action:", e);
    }
  };

  return { points, loading, addPoints, refresh: fetchRewards };
}
