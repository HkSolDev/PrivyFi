'use client';

import { TrendingUp, Coins, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const STRATEGIES = [
  { name: 'Kamino USDC Multiply', apy: '14.2%', risk: 'Low', tvl: '$120M', icon: <Zap size={24} className="text-yellow-400" /> },
  { name: 'Jupiter SOL-USDC LP', apy: '28.5%', risk: 'Medium', tvl: '$45M', icon: <TrendingUp size={24} className="text-cyan-400" /> },
  { name: 'Drift Insurance Fund', apy: '12.1%', risk: 'Low', tvl: '$80M', icon: <ShieldCheck size={24} className="text-purple-400" /> },
  { name: 'Orca WHIRL USDC/SOL', apy: '42.8%', risk: 'High', tvl: '$12M', icon: <Coins size={24} className="text-pink-400" /> },
];

export default function YieldView() {
  return (
    <div className="flex flex-col gap-8 fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card !p-6 flex flex-col items-center text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Market Avg APY</p>
          <h3 className="text-3xl font-black text-purple-400">12.4%</h3>
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
          <h3 className="text-2xl font-bold">Best Yield Opportunities</h3>
          <div className="flex gap-2">
            <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/20">Live Scan</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          {STRATEGIES.map((strat) => (
            <div key={strat.name} className="flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all cursor-pointer group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {strat.icon}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{strat.name}</h4>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-gray-500">Risk: <span className={strat.risk === 'Low' ? 'text-green-400 font-bold' : strat.risk === 'Medium' ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'}>{strat.risk}</span></span>
                    <span className="text-xs text-gray-500">TVL: <span className="text-white font-bold">{strat.tvl}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-12 mt-4 md:mt-0">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">APY</p>
                  <p className="text-2xl font-black text-purple-400">{strat.apy}</p>
                </div>
                <button className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2">
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
