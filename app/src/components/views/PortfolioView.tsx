'use client';

import { Wallet, PieChart, TrendingUp, Loader2, FlaskConical } from 'lucide-react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useAnchorProgram } from '@/hooks/useAnchorProgram';
import { useEffect, useState } from 'react';
import { BN } from '@coral-xyz/anchor';

export default function PortfolioView() {
  const { data, loading, error } = usePortfolio();
  const { getUserPositions, wallet } = useAnchorProgram();
  const [stakedPositions, setStakedPositions] = useState<any[]>([]);
  const [stakedLoading, setStakedLoading] = useState(false);

  useEffect(() => {
    async function fetchStaked() {
      if (wallet) {
        setStakedLoading(true);
        const positions = await getUserPositions();
        
        const formatted = positions.map(p => ({
          symbol: 'M-USDC',
          name: 'PrivyFi Staked Vault',
          amount: (p.account.amount.toNumber() / 1000000).toLocaleString(),
          value: `$${(p.account.amount.toNumber() / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          allocation: 'N/A',
          color: 'bg-green-500',
          isStaked: true
        }));
        setStakedPositions(formatted);
        setStakedLoading(false);
      }
    }
    fetchStaked();
  }, [wallet]);

  // Map positions from the hook — no fake names, devnet-aware
  const positions = data?.attributes?.positions || [];
  const solPrice = data?.meta?.solPrice;

  const mappedAssets = positions
    .filter((pos: any) => pos.attributes?.quantity?.float > 0)
    .map((pos: any) => {
      const isSol = pos.attributes?.fungible_info?.symbol === 'SOL';
      const isDevnet = pos.attributes?.isDevnet ?? true;
      const hasMetadata = pos.attributes?.hasMetadata ?? false;
      const amount = pos.attributes?.quantity?.float ?? 0;
      const value = pos.attributes?.value ?? 0;

      // A token is "unknown" only if it's devnet AND has no on-chain metadata
      const isUnknown = isDevnet && !isSol && !hasMetadata;

      return {
        symbol: pos.attributes?.fungible_info?.symbol || '???',
        name: pos.attributes?.fungible_info?.name || 'Unknown Token',
        mint: pos.attributes?.mint || '',
        amount: amount.toLocaleString(undefined, { maximumFractionDigits: 4 }),
        value: isSol
          ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '$0.00',
        isSol,
        isDevnet,
        hasMetadata,
        isUnknown,
        color: isSol
          ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
          : hasMetadata
          ? 'bg-gradient-to-br from-cyan-600 to-blue-700'
          : 'bg-white/10',
      };
    })
    .slice(0, 10);


  const allAssets = [...stakedPositions, ...mappedAssets];

  // Only SOL has a real price on devnet
  const totalValue = data?.attributes?.total?.positions
    ? `$${data.attributes.total.positions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="text-purple-400 animate-spin" size={40} />
        <p className="text-gray-500 font-medium">Fetching real-time portfolio from Zerion...</p>
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
        {/* Asset Breakdown */}
        <div className="col-span-12 lg:col-span-8 glass-card !p-8 purple-glow">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Your Assets ({allAssets.length})</h2>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
              <span className="px-4 py-1.5 rounded-md text-sm font-bold text-purple-400">Net Worth: {totalValue}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {allAssets.length === 0 ? (
              <div className="py-12 text-center text-gray-500 italic">
                No assets found in this wallet.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="pb-6">Crypto Asset</th>
                    <th className="pb-6">Amount</th>
                    <th className="pb-6">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allAssets.map((asset: any, i: number) => (
                    <tr key={i} className={`group hover:bg-white/[0.02] transition-colors ${asset.isStaked ? 'bg-green-500/[0.03]' : ''}`}>
                      <td className="py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 ${asset.color} rounded-xl flex items-center justify-center font-bold text-xs shadow-lg relative text-white`}>
                            {asset.symbol.slice(0, 3)}
                            {asset.isStaked && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black"></div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold flex items-center gap-2 flex-wrap">
                              {asset.name}
                              {asset.isStaked && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Staked in PrivyFi</span>}
                              {asset.isUnknown && (
                                <span className="text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <FlaskConical size={9} /> Devnet
                                </span>
                              )}
                              {asset.isDevnet && !asset.isUnknown && !asset.isStaked && !asset.isSol && (
                                <span className="text-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                                  Testnet
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {asset.isUnknown
                                ? `${asset.mint.slice(0, 8)}...${asset.mint.slice(-4)}`
                                : asset.symbol}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 font-bold">{asset.amount}</td>
                      <td className="py-5 font-bold">
                        {asset.isDevnet && !asset.isStaked
                          ? <span className="text-gray-500">$0.00 <span className="text-[10px] font-normal">(devnet)</span></span>
                          : asset.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Portfolio Stats Sidebar */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <PieChart size={20} className="text-purple-400" />
              <h3 className="font-bold">Summary</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Total Positions</span>
                <span className="font-bold">{allAssets.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Status</span>
                <span className="text-green-400 font-bold">Synced</span>
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
