import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export function usePortfolio() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
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
        // 1. Fetch SOL price server-side (avoids CORS)
        let solPrice = 145.00;
        try {
          const priceRes = await fetch('/api/price');
          if (priceRes.ok) {
            const priceJson = await priceRes.json();
            solPrice = priceJson.price ?? 145.00;
          }
        } catch {
          console.warn('SOL price fetch failed, using fallback');
        }

        // 2. Native SOL balance
        const solBalance = await connection.getBalance(publicKey);
        const solAmount = solBalance / LAMPORTS_PER_SOL;

        // 3. All SPL token accounts on devnet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        const nonZero = tokenAccounts.value.filter(
          (ta) => (ta.account.data.parsed.info.tokenAmount.uiAmount ?? 0) > 0
        );

        const mints = nonZero.map((ta) => ta.account.data.parsed.info.mint as string);

        // 4. Batch-resolve Metaplex metadata server-side
        let metadataMap: Record<string, { name: string; symbol: string } | null> = {};
        if (mints.length > 0) {
          try {
            const metaRes = await fetch('/api/token-metadata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mints }),
            });
            if (metaRes.ok) {
              metadataMap = await metaRes.json();
            }
          } catch {
            console.warn('Token metadata fetch failed');
          }
        }

        // 5. Build SPL positions with real or fallback labels
        const splPositions = nonZero.map((tokenAccount) => {
          const info = tokenAccount.account.data.parsed.info;
          const mint: string = info.mint;
          const amount: number = info.tokenAmount.uiAmount ?? 0;
          const meta = metadataMap[mint];

          const hasRealName = !!meta?.name;

          return {
            attributes: {
              mint,
              isDevnet: true,
              hasMetadata: hasRealName,
              fungible_info: {
                symbol: hasRealName ? meta!.symbol : mint.slice(0, 4).toUpperCase(),
                name: hasRealName ? meta!.name : 'Unknown Token',
              },
              quantity: { float: amount },
              value: 0, // devnet SPL tokens have no real USD value
            },
          };
        });

        // 6. SOL position (real price)
        const solPosition = {
          attributes: {
            mint: 'So11111111111111111111111111111111111111112',
            isDevnet: false,
            hasMetadata: true,
            fungible_info: {
              symbol: 'SOL',
              name: 'Solana',
            },
            quantity: { float: solAmount },
            value: solAmount * solPrice,
          },
        };

        const allPositions = [solPosition, ...splPositions];
        const totalValue = solAmount * solPrice;

        setData({
          attributes: {
            total: { positions: totalValue },
            positions: allPositions,
          },
          meta: { network: 'devnet', solPrice },
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [publicKey, connection]);

  return { data, loading, error };
}
