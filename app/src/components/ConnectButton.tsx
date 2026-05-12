'use client';

import { useWalletConnection, useWalletSession } from '@solana/react-hooks';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';

function sortConnectors(
  connectors: readonly { id: string; name: string; icon?: string }[]
) {
  return [...connectors].sort((a, b) => {
    if (a.id === 'wallet-standard:solflare') return -1;
    if (b.id === 'wallet-standard:solflare') return 1;
    return a.name.localeCompare(b.name);
  });
}

export function ConnectButton({ className }: { className?: string }) {
  const session = useWalletSession();
  const { connectors, connect, disconnect, isReady, connecting } =
    useWalletConnection();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const address = session?.account.address;
  const sorted = sortConnectors(connectors);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async (id: string) => {
    await connect(id);
    setOpen(false);
  };

  if (!isReady) {
    return (
      <Button disabled className={className} variant="outline">
        Loading...
      </Button>
    );
  }

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
    <div ref={ref} className="relative">
      <Button
        onClick={() => setOpen(!open)}
        className={className}
        disabled={connecting}
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>

      {open && sorted.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 py-1">
          {sorted.map((c) => (
            <button
              key={c.id}
              onClick={() => handleConnect(c.id)}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
            >
              {c.icon ? (
                <img src={c.icon} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                  {c.name.charAt(0)}
                </div>
              )}
              <span className="font-medium">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
