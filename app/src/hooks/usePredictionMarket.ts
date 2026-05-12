'use client';

import { useCallback, useState } from 'react';
import { useWalletSession, useSendTransaction } from '@solana/react-hooks';
import { address } from '@solana/kit';
import { 
  getPlacePredictionInstructionAsync,
  getInitializeAccuracyMarketInstructionAsync,
  getResolveMarketInstruction,
  getClaimPredictionInstructionAsync
} from '../lib/generated/src/generated/instructions';
import { findMarketPda } from '../lib/generated/src/generated/pdas';

const DEVNET_USDC_MINT = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export function usePredictionMarket() {
  const session = useWalletSession();
  const { send, isSending: hookSending, error: hookError } = useSendTransaction();
  const userAddress = session?.account?.address;

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const sendIx = useCallback(async (generatedIx: any) => {
    if (!userAddress) throw new Error('Wallet not connected');
    setStatus('sending');
    setError(null);
    setSignature(null);

    try {
      // The first account (user) must be a writable signer for Anchor
      const ix = {
        ...generatedIx,
        accounts: generatedIx.accounts.map((a: any, i: number) =>
          i === 0 ? { ...a, role: 1 } : a
        ),
      };
      const sig = await send(
        { instructions: [ix], feePayer: userAddress },
        { commitment: 'confirmed' }
      );
      setStatus('success');
      setSignature(sig);
      return sig;
    } catch (err: any) {
      console.error('[sendIx] Full error:', err);
      if (err?.transactionPlanResult) console.error('[sendIx] Plan result:', err.transactionPlanResult);
      const msg = err?.message || err?.toString() || 'Transaction failed';
      setStatus('error');
      setError(msg);
      throw err;
    }
  }, [userAddress, send]);

  const initializeMarket = useCallback(async (oracleFeed: string, roundId: number | bigint, basePrice: number | bigint, precisionStep: number | bigint) => {
    if (!userAddress) throw new Error('Wallet not connected');
    const ix = await getInitializeAccuracyMarketInstructionAsync({
      mint: DEVNET_USDC_MINT, oracleFeed: address(oracleFeed), signer: { address: address(userAddress) } as any,
      roundId: BigInt(roundId), basePrice: BigInt(basePrice), precisionStep: BigInt(precisionStep),
    });
    return sendIx(ix);
  }, [userAddress, sendIx]);

  const placePrediction = useCallback(async (oracleFeed: string, roundId: number | bigint, predictedBucket: number, amountInUnits: number | bigint) => {
    if (!userAddress) throw new Error('Wallet not connected');
    const [marketPda] = await findMarketPda({ oracleFeed: address(oracleFeed), roundId: BigInt(roundId) });
    const ix = await getPlacePredictionInstructionAsync({
      user: { address: address(userAddress) } as any, market: marketPda, mint: DEVNET_USDC_MINT,
      predictedBucket, amount: BigInt(amountInUnits), oracleFeed: address(oracleFeed), roundId: BigInt(roundId),
    });
    return sendIx(ix);
  }, [userAddress, sendIx]);

  const resolveMarket = useCallback(async (oracleFeed: string, roundId: number | bigint) => {
    if (!userAddress) throw new Error('Wallet not connected');
    const [marketPda] = await findMarketPda({ oracleFeed: address(oracleFeed), roundId: BigInt(roundId) });
    const ix = getResolveMarketInstruction({ market: marketPda, priceUpdate: address(oracleFeed), signer: { address: address(userAddress) } as any, roundId: BigInt(roundId) });
    return sendIx(ix);
  }, [userAddress, sendIx]);

  const claimPrediction = useCallback(async (oracleFeed: string, roundId: number | bigint) => {
    if (!userAddress) throw new Error('Wallet not connected');
    const [marketPda] = await findMarketPda({ oracleFeed: address(oracleFeed), roundId: BigInt(roundId) });
    const ix = await getClaimPredictionInstructionAsync({ user: { address: address(userAddress) } as any, market: marketPda, mint: DEVNET_USDC_MINT, roundId: BigInt(roundId) });
    return sendIx(ix);
  }, [userAddress, sendIx]);

  return { initializeMarket, placePrediction, resolveMarket, claimPrediction, status, isSending: status === 'sending', error, signature };
}
