'use client';

import { Wallet, PieChart, TrendingUp, Loader2, FlaskConical } from 'lucide-react';
import { usePortfolio, PortfolioToken } from '@/hooks/usePortfolio';
import { useAnchorProgram } from '@/hooks/useAnchorProgram';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortfolioView() {
  const { tokens, priceMap, pricesLoading, tokensLoading, totalValue, error } = usePortfolio();
  const { getUserPositions, wallet } = useAnchorProgram();
  const [stakedPositions, setStakedPositions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStaked() {
      if (!wallet) return;
      const positions = await getUserPositions();
      setStakedPositions(
        positions.map(p => ({
          mint: 'staked',
          symbol: 'M-USDC',
          name: 'PrivyFi Staked Vault',
          amount: p.account.amount.toNumber() / 1_000_000,
          isSol: false,
          isStaked: true,
          isDevnet: false,
          hasMetadata: true,
          isUnknown: false,
        }))
      );
    }
    fetchStaked();
  }, [wallet]);

  // Format a dollar value
  const fmt = (v: number) =>
    `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getTokenPrice = (mint: string) => priceMap[mint] ?? 0;

  const allRows = [
    ...stakedPositions,
    ...tokens,
  ];

  const totalDisplay = fmt(
    stakedPositions.reduce((s, p) => s + p.amount, 0) + totalValue
  );

  if (tokensLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="text-purple-400 animate-spin" size={40} />
        <p className="text-gray-500 font-medium">Loading wallet assets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card !p-8 text-center border-red-500/20">
        <p className="text-red-400 font-bold mb-2">Failed to load portfolio</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 fade-in">
      <div className="grid grid-cols-12 gap-8">
        {/* Asset Table */}
        <div className="col-span-12 lg:col-span-8 glass-card !p-8 purple-glow">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Your Assets ({allRows.length})</h2>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
              <span className="px-4 py-1.5 rounded-md text-sm font-bold text-purple-400">
                Net Worth: {totalDisplay}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {allRows.length === 0 ? (
              <div className="py-12 text-center text-gray-500 italic">
                No assets found in this wallet.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="pb-6">Asset</th>
                    <th className="pb-6">Amount</th>
                    <th className="pb-6">Price</th>
                    <th className="pb-6">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allRows.map((row: any, i: number) => {
                    const isStaked = !!row.isStaked;
                    const token = row as PortfolioToken;
                    const price = isStaked ? 1 : getTokenPrice(token.mint);
                    const value = isStaked ? row.amount : token.amount * price;
                    const hasPrice = isStaked || price > 0;

                    const avatarColor = token.isSol
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                      : isStaked
                      ? 'bg-green-500'
                      : token.hasMetadata
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-700'
                      : 'bg-white/10';

                    return (
                      <tr
                        key={i}
                        className={`group hover:bg-white/[0.02] transition-colors ${isStaked ? 'bg-green-500/[0.03]' : ''}`}
                      >
                        {/* Asset Identity */}
                        <td className="py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${avatarColor} rounded-xl flex items-center justify-center font-bold text-xs shadow-lg relative text-white flex-shrink-0`}>
                              {(row.symbol || '??').slice(0, 3)}
                              {isStaked && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold flex items-center gap-2 flex-wrap">
                                {row.name}
                                {isStaked && (
                                  <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                    Staked in PrivyFi
                                  </span>
                                )}
                                {!isStaked && token.isUnknown && (
                                  <span className="text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <FlaskConical size={9} /> Devnet
                                  </span>
                                )}
                                {!isStaked && !token.isUnknown && token.isDevnet && !token.isSol && (
                                  <span className="text-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                                    Testnet
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {token.isUnknown && !isStaked
                                  ? `${token.mint.slice(0, 8)}...${token.mint.slice(-4)}`
                                  : row.symbol}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-5 font-bold">
                          {row.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>

                        {/* Unit Price — skeleton while loading */}
                        <td className="py-5 text-gray-400 text-sm">
                          {pricesLoading && !hasPrice ? (
                            <Skeleton className="h-4 w-16 rounded" />
                          ) : hasPrice ? (
                            fmt(price)
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Total Value — skeleton while loading */}
                        <td className="py-5 font-bold">
                          {pricesLoading && !hasPrice ? (
                            <Skeleton className="h-4 w-20 rounded" />
                          ) : hasPrice ? (
                            <span className={value > 0 ? 'text-white' : 'text-gray-500'}>
                              {fmt(value)}
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              $0.00{' '}
                              <span className="text-[10px] font-normal">(devnet)</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <PieChart size={20} className="text-purple-400" />
              <h3 className="font-bold">Summary</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Total Positions</span>
                <span className="font-bold">{allRows.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Net Worth</span>
                <span className="font-bold text-purple-400">{totalDisplay}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Prices</span>
                {pricesLoading ? (
                  <span className="text-yellow-400 font-bold flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Updating
                  </span>
                ) : (
                  <span className="text-green-400 font-bold">Live ⚡</span>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card !p-8 h-full fade-in delay-200">
            <h3 className="text-xl font-bold mb-6">Account Health</h3>
            <div className="flex flex-col items-center justify-center h-[200px] text-center border border-white/5 rounded-2xl bg-white/[0.02]">
              <TrendingUp className="text-green-400 mb-4" size={48} />
              <h4 className="text-2xl font-black text-green-400 tracking-tight">OPTIMIZED</h4>
              <p className="text-sm text-gray-500 mt-2">Your portfolio risk is perfectly balanced.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
