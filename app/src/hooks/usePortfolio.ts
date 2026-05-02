import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ── Types ────────────────────────────────────────────────────────────────────
export interface PortfolioToken {
  mint: string;
  name: string;
  symbol: string;
  amount: number;
  isSol: boolean;
  isDevnet: boolean;         // on devnet wallet
  hasMetadata: boolean;      // has Metaplex metadata
  isUnknown: boolean;        // no metadata → truly unknown test token
}

// ── Module-level caches ───────────────────────────────────────────────────────
const TOKENS_TTL = 60_000;   // 1 min — token balances
const PRICES_TTL = 30_000;   // 30 s  — prices (shorter, volatile)

interface CacheEntry<T> { data: T; ts: number }

const tokensCache = new Map<string, CacheEntry<PortfolioToken[]>>();
const pricesCache = new Map<string, CacheEntry<Record<string, number>>>();

function getCache<T>(map: Map<string, CacheEntry<T>>, key: string, ttl: number): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) { map.delete(key); return null; }
  return entry.data;
}
function setCache<T>(map: Map<string, CacheEntry<T>>, key: string, data: T) {
  map.set(key, { data, ts: Date.now() });
}
// ─────────────────────────────────────────────────────────────────────────────

export function usePortfolio() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  // Stable key — avoids re-firing on every render when connection object ref changes
  const rpcEndpoint = connection.rpcEndpoint;

  const [tokens, setTokens] = useState<PortfolioToken[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [tokensLoading, setTokensLoading] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) { setTokens([]); setPriceMap({}); return; }
    const address = publicKey.toBase58();

    // ── Phase 1: load token list (fast — RPC only) ─────────────────────────
    const fetchTokens = async () => {
      const cached = getCache(tokensCache, address, TOKENS_TTL);
      if (cached) {
        setTokens(cached);
        return cached;
      }

      setTokensLoading(true);
      try {
        const solBalance = await connection.getBalance(publicKey);
        const solAmount = solBalance / LAMPORTS_PER_SOL;

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });
        const nonZero = tokenAccounts.value.filter(
          ta => (ta.account.data.parsed.info.tokenAmount.uiAmount ?? 0) > 0
        );
        const splMints = nonZero.map(ta => ta.account.data.parsed.info.mint as string);

        // Metaplex metadata batch
        let metadataMap: Record<string, { name: string; symbol: string } | null> = {};
        if (splMints.length > 0) {
          try {
            const r = await fetch('/api/token-metadata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mints: splMints }),
            });
            if (r.ok) metadataMap = await r.json();
          } catch { /* non-critical */ }
        }

        const solToken: PortfolioToken = {
          mint: SOL_MINT,
          name: 'Solana',
          symbol: 'SOL',
          amount: solAmount,
          isSol: true,
          isDevnet: false,
          hasMetadata: true,
          isUnknown: false,
        };

        const splTokens: PortfolioToken[] = nonZero.map(ta => {
          const info = ta.account.data.parsed.info;
          const mint: string = info.mint;
          const meta = metadataMap[mint];
          const hasMetadata = !!meta?.name;
          return {
            mint,
            name: hasMetadata ? meta!.name : 'Unknown Token',
            symbol: hasMetadata ? meta!.symbol : mint.slice(0, 4).toUpperCase(),
            amount: info.tokenAmount.uiAmount ?? 0,
            isSol: false,
            isDevnet: true,
            hasMetadata,
            isUnknown: !hasMetadata,
          };
        });

        const list = [solToken, ...splTokens];
        setCache(tokensCache, address, list);
        setTokens(list);
        return list;
      } catch (err: any) {
        setError(err.message);
        return [];
      } finally {
        setTokensLoading(false);
      }
    };

    // ── Phase 2: load prices (background — happens after tokens render) ────
    const fetchPrices = async (tokenList: PortfolioToken[]) => {
      const cached = getCache(pricesCache, address, PRICES_TTL);
      if (cached) { setPriceMap(cached); return; }

      setPricesLoading(true);
      try {
        const mints = tokenList.map(t => t.mint);
        const r = await fetch(`/api/price?mints=${mints.join(',')}`);
        if (!r.ok) return;
        const json = await r.json();
        const map: Record<string, number> = json.prices ?? {};
        setCache(pricesCache, address, map);
        setPriceMap(map);
      } catch { /* silent — tokens still shown */ }
      finally { setPricesLoading(false); }
    };

    const initPortfolio = async () => {
      const list = await fetchTokens();
      if (list.length) {
        await fetchPrices(list);
      }
    };
    initPortfolio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey?.toBase58(), rpcEndpoint]);

  // Derived — compute value per token using priceMap
  const totalValue = tokens.reduce((sum, t) => {
    return sum + t.amount * (priceMap[t.mint] ?? 0);
  }, 0);

  return { tokens, priceMap, pricesLoading, tokensLoading, totalValue, error };
}
