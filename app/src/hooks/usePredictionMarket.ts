'use client';

import { useWalletSession, useSendTransaction } from '@solana/react-hooks';
import { Address, getBase64Encoder, TransactionSigner, address } from '@solana/kit';
import { 
  getPlacePredictionInstructionAsync,
  getInitializeAccuracyMarketInstructionAsync,
  getResolveMarketInstruction,
  getClaimPredictionInstructionAsync
} from '../lib/generated/src/generated/instructions';
import { findMarketPda } from '../lib/generated/src/generated/pdas';

// You can use address() to convert a string to the branded Address type
const DEVNET_USDC_MINT = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export function usePredictionMarket() {
  const session = useWalletSession();
  const userAddress = session?.account.address;
  const signer = { address: userAddress } as unknown as TransactionSigner;
  // useSendTransaction is part of the solanaui framework-kit architecture
  const { send, status, isSending, error, signature } = useSendTransaction();

  const initializeMarket = async (
    oracleFeed: string,
    basePrice: number | bigint,
    precisionStep: number | bigint
  ) => {
    if (!userAddress || !signer) throw new Error("Wallet not connected");

    const ix = await getInitializeAccuracyMarketInstructionAsync({
      mint: DEVNET_USDC_MINT,
      oracleFeed: address(oracleFeed),
      signer,
      basePrice,
      precisionStep,
    });

    return await send({ instructions: [ix], feePayer: userAddress });
  };

  const placePrediction = async (
    oracleFeed: string,
    predictedBucket: number,
    amountInUnits: number | bigint
  ) => {
    if (!userAddress || !signer) throw new Error("Wallet not connected");

    const marketPda = await findMarketPda({
      oracleFeed: address(oracleFeed),
    });

    const ix = await getPlacePredictionInstructionAsync({
      user: signer,
      market: marketPda[0],
      mint: DEVNET_USDC_MINT,
      predictedBucket,
      amount: amountInUnits,
    });

    return await send({ instructions: [ix], feePayer: userAddress });
  };

  const resolveMarket = async (oracleFeed: string) => {
    if (!userAddress || !signer) throw new Error("Wallet not connected");

    const marketPda = await findMarketPda({
      oracleFeed: address(oracleFeed),
    });

    const ix = getResolveMarketInstruction({
      market: marketPda[0],
      priceUpdate: address(oracleFeed),
      signer,
    });

    return await send({ instructions: [ix], feePayer: userAddress });
  };

  const claimPrediction = async (oracleFeed: string) => {
    if (!userAddress || !signer) throw new Error("Wallet not connected");

    const marketPda = await findMarketPda({
      oracleFeed: address(oracleFeed),
    });

    const ix = await getClaimPredictionInstructionAsync({
      user: signer,
      market: marketPda[0],
      mint: DEVNET_USDC_MINT,
    });

    return await send({ instructions: [ix], feePayer: userAddress });
  };

  return { 
    initializeMarket, 
    placePrediction, 
    resolveMarket, 
    claimPrediction, 
    status, 
    isSending, 
    error, 
    signature 
  };
}
