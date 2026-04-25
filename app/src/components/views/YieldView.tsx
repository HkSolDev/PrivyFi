'use client';

import { TrendingUp, Coins, ArrowRight, ShieldCheck, Zap, Loader2, RefreshCcw } from 'lucide-react';
import { useYield } from '@/hooks/useYield';

export default function YieldView() {
  const { strategies, loading, error, refresh } = useYield();

  if (loading && strategies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="text-purple-400 animate-spin" size={40} />
        <p className="text-gray-500 font-medium">Scanning Kamino and Jupiter for live APYs...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card !p-6 flex flex-col items-center text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Market Avg APY</p>
          <h3 className="text-3xl font-black text-purple-400">14.2%</h3>
        </div>
        <div className="glass-card !p-6 flex flex-col items-center text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Total Staked</p>
          <h3 className="text-3xl font-black text-white">$0.00</h3>
        </div>
        <div className="glass-card !p-6 flex flex-col items-center text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Yield Earned</p>
          <h3 className="text-3xl font-black text-green-400">+$0.00</h3>
        </div>
        <div className="glass-card !p-6 flex flex-col items-center text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Reward Points</p>
          <h3 className="text-3xl font-black text-cyan-400">0</h3>
        </div>
      </div>

      <div className="glass-card overflow-hidden relative !p-8 purple-glow">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-bold">Best Yield Opportunities</h3>
            <p className="text-sm text-gray-500 mt-1">Comparing real-time rates across top Solana protocols.</p>
          </div>
          <div className="flex gap-4">
             <button 
              onClick={refresh}
              disabled={loading}
              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5 disabled:opacity-50"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/20 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Scan
            </span>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            Error: {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {strategies.map((strat, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all cursor-pointer group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {strat.tokenSymbol === 'SOL' ? <Zap size={24} className="text-yellow-400" /> : <Coins size={24} className="text-cyan-400" />}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{strat.name}</h4>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-gray-500">Protocol: <span className="text-purple-400 font-bold">{strat.protocol}</span></span>
                    <span className="text-xs text-gray-500">TVL: <span className="text-white font-bold">{strat.tvl}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-12 mt-4 md:mt-0">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">APY</p>
                  <p className="text-2xl font-black text-purple-400">{strat.apy}</p>
                </div>
                <button className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">
                  Deposit <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
