'use client';

import { Wallet, PieChart, ArrowUpRight, TrendingUp, Loader2 } from 'lucide-react';
import { usePortfolio } from '@/hooks/usePortfolio';

export default function PortfolioView() {
  const { data, loading, error } = usePortfolio();

  // Map Zerion positions to our ASSETS structure
  const positions = data?.attributes?.positions || [];
  
  const mappedAssets = positions.map((pos: any) => ({
    symbol: pos.attributes?.fungible_info?.symbol || '?',
    name: pos.attributes?.fungible_info?.name || 'Unknown',
    amount: pos.attributes?.quantity?.float?.toLocaleString() || '0',
    value: pos.attributes?.value ? `$${pos.attributes.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00',
    allocation: 'N/A', // Zerion doesn't give raw percentage, we could calculate it
    color: 'bg-purple-500',
  })).slice(0, 10); // Limit to top 10

  const totalValue = data?.attributes?.total?.positions ? `$${data.attributes.total.positions.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00';

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
            <h2 className="text-2xl font-bold">Your Assets ({mappedAssets.length})</h2>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
              <span className="px-4 py-1.5 rounded-md text-sm font-bold text-purple-400">Net Worth: {totalValue}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {mappedAssets.length === 0 ? (
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
                  {mappedAssets.map((asset: any, i: number) => (
                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 ${asset.color} rounded-xl flex items-center justify-center font-bold text-xs shadow-lg`}>
                            {asset.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <p className="font-bold">{asset.name}</p>
                            <p className="text-[10px] text-gray-500 font-bold">{asset.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 font-bold">{asset.amount}</td>
                      <td className="py-6 font-bold">{asset.value}</td>
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
                <span className="font-bold">{mappedAssets.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Status</span>
                <span className="text-green-400 font-bold">Synced</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp size={20} className="text-green-400" />
              <h3 className="font-bold">Account Health</h3>
            </div>
            <div className="text-center py-4">
              <h4 className="text-2xl font-black text-white">OPTIMIZED</h4>
              <p className="text-xs text-gray-500 mt-2">AI Advisor is monitoring...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
