import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function usePortfolio() {
  const { publicKey } = useWallet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setData(null);
      return;
    }

    const fetchPortfolio = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/portfolio?address=${publicKey.toBase58()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data');
        }
        const json = await response.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [publicKey]);

  return { data, loading, error };
}
