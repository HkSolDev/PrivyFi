'use client';

import { useWalletSession, useConnectWallet, useDisconnectWallet } from '@solana/react-hooks';
import { Button } from './ui/button';

export function ConnectButton({ className }: { className?: string }) {
  const session = useWalletSession();
  const address = session?.account.address;
  const connect = useConnectWallet();
  const disconnect = useDisconnectWallet();

  if (address) {
    return (
      <Button 
        onClick={() => disconnect()} 
        className={className}
        variant="outline"
      >
        {address.slice(0, 4)}...{address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button 
      onClick={() => connect('wallet-standard:phantom')} 
      className={className}
    >
      Connect Wallet
    </Button>
  );
}
