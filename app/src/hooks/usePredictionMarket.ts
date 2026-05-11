'use client';

import { useCallback, useState, useEffect } from 'react';
import { useWalletSession } from '@solana/react-hooks';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { address } from '@solana/kit';
import { 
  getPlacePredictionInstructionAsync,
  getInitializeAccuracyMarketInstructionAsync,
  getResolveMarketInstruction,
  getClaimPredictionInstructionAsync
} from '../lib/generated/src/generated/instructions';
import { findMarketPda } from '../lib/generated/src/generated/pdas';

const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const DEVNET_USDC_MINT = address('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

declare global {
  interface Window {
    solana?: any;
  }
}

export function usePredictionMarket() {
  const session = useWalletSession();
  const userAddress = session?.account?.address;

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const sendIx = useCallback(async (generatedIx: any) => {
    if (!userAddress) throw new Error('Wallet not connected');
    if (!window.solana?.signTransaction) throw new Error('Solflare not detected. Make sure your wallet extension is installed.');

    setStatus('sending');
    setError(null);
    setSignature(null);

    try {
      const connection = new Connection(DEVNET_RPC, 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash('confirmed');

      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(userAddress);

      const keys = (generatedIx.accounts || []).map((a: any) => ({
        pubkey: new PublicKey(typeof a.address === 'string' ? a.address : String(a.address)),
        isSigner: a.role === 1 || a.role === 3,
        isWritable: a.role === 1 || a.role === 2,
      }));

      tx.add({
        keys,
        programId: new PublicKey(generatedIx.programAddress),
        data: Buffer.from(generatedIx.data),
      });

      // Sign with Solflare via wallet-standard
      const signedTx = await window.solana.signTransaction(tx);

      // Send the signed transaction
      const sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
      await connection.confirmTransaction(sig, 'confirmed');

      setStatus('success');
      setSignature(sig);
      return sig;
    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Transaction failed';
      setStatus('error');
      setError(msg);
      throw err;
    }
  }, [userAddress]);

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
