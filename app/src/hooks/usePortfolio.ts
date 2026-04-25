import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
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
        // 1. Try Zerion (Mainnet biased)
        let zerionData = null;
        try {
          const response = await fetch(`/api/portfolio?address=${publicKey.toBase58()}`);
          if (response.ok) {
            const json = await response.json();
            zerionData = json.data;
          }
        } catch (e) {
          console.warn('Zerion fetch failed, falling back to RPC');
        }

        // 2. Fetch LIVE SOL Price from Jupiter
        let solPrice = 145.00; // Fallback
        try {
          const priceRes = await fetch('https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112');
          if (priceRes.ok) {
            const priceJson = await priceRes.json();
            solPrice = priceJson.data?.So11111111111111111111111111111111111111112?.price || 145.00;
          }
        } catch (e) {
          console.warn('Jupiter price fetch failed');
        }

        // 3. Fetch Native SOL Balance
        const solBalance = await connection.getBalance(publicKey);

        // 4. Fetch SPL Token Accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        const splPositions = tokenAccounts.value.map((tokenAccount) => {
          const info = tokenAccount.account.data.parsed.info;
          const mint = info.mint;
          const amount = info.tokenAmount.uiAmount;
          
          return {
            attributes: {
              fungible_info: {
                symbol: mint.slice(0, 4).toUpperCase(),
                name: `Token ${mint.slice(0, 6)}`,
              },
              quantity: {
                float: amount
              },
              value: 0 
            }
          };
        }).filter(p => p.attributes.quantity.float > 0);

        // 5. Construct the Final Hybrid Structure
        if (zerionData && zerionData.attributes?.positions?.length > 0) {
          setData(zerionData);
        } else {
          const solPosition = {
            attributes: {
              fungible_info: {
                symbol: 'SOL',
                name: 'Solana',
              },
              quantity: {
                float: solBalance / LAMPORTS_PER_SOL
              },
              value: (solBalance / LAMPORTS_PER_SOL) * solPrice
            }
          };

          const allPositions = [solPosition, ...splPositions];
          const totalValue = allPositions.reduce((acc, p) => acc + (p.attributes.value || 0), 0);

          setData({
            attributes: {
              total: {
                positions: totalValue
              },
              positions: allPositions
            }
          });
        }
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
