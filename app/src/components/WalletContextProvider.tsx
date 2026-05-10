'use client';

import React, { FC, ReactNode } from 'react';
import { SolanaProvider } from '@solana/react-hooks';
import { autoDiscover, createClient } from '@solana/client';

const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

const websocketEndpoint =
  process.env.NEXT_PUBLIC_SOLANA_WS_URL ??
  endpoint.replace('https://', 'wss://').replace('http://', 'ws://');

export const solanaClient = createClient({
  endpoint,
  websocketEndpoint,
  walletConnectors: autoDiscover(),
});

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <SolanaProvider client={solanaClient}>
            {children}
        </SolanaProvider>
    );
};
