'use client';

import { useState } from 'react';
import { TrendingUp, Coins, ArrowRight, ShieldCheck, Zap, Loader2, RefreshCcw, Search, Filter, Info as InfoIcon, Sparkles } from 'lucide-react';
import { useYield } from '@/hooks/useYield';
import { useRewards } from '@/hooks/useRewards';
import { useAnchorProgram } from '@/hooks/useAnchorProgram';
import { useEffect } from 'react';
import YieldDetailsModal from '@/components/modals/YieldDetailsModal';
import { Button } from '@/components/ui/button';

export default function YieldView() {
  const { strategies, loading, error, refresh } = useYield();
  const { points } = useRewards();
  const { getUserPositions, wallet } = useAnchorProgram();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stakedValue, setStakedValue] = useState(0);

  useEffect(() => {
    async function fetchStaked() {
      if (wallet) {
        const positions = await getUserPositions();
        const total = positions.reduce((acc, curr) => acc + (curr.account.amount.toNumber() / 1_000_000), 0);
        setStakedValue(total);
      }
    }
    fetchStaked();
  }, [wallet]);

  const openDetails = (strat: any) => {
    setSelectedStrategy(strat);
    setIsModalOpen(true);
  };

  // Filtering Logic
  const filteredStrategies = strategies.filter((strat) => {
    const matchesSearch = strat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          strat.protocol.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'SOL') return matchesSearch && strat.name.includes('SOL');
    if (activeFilter === 'Stable') return matchesSearch && (strat.name.includes('USDC') || strat.name.includes('USDT') || strat.name.includes('PUSD') || strat.name.includes('AUDD'));
    if (activeFilter === 'PUSD') return matchesSearch && strat.name.includes('PUSD');
    if (activeFilter === 'AUDD') return matchesSearch && strat.name.includes('AUDD');
    if (activeFilter === 'High Yield') return matchesSearch && parseFloat(strat.apy) > 50;
    
    return matchesSearch;
  });

  // Calculate Real Stats
  const avgApy = strategies.length > 0 
    ? (strategies.reduce((acc, s) => acc + parseFloat(s.apy), 0) / strategies.length).toFixed(1) 
    : '0.0';

  if (loading && strategies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="text-purple-400 animate-spin" size={40} />
        <p className="text-gray-500 font-medium">Scanning Meteora and Jupiter for live APYs...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 fade-in">
      <YieldDetailsModal 
        strategy={selectedStrategy} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card !p-6 flex flex-col items-center text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Market Avg APY</p>
          <h3 className="text-3xl font-black text-purple-400">{avgApy}%</h3>
        </div>
        <div className="glass-card !p-6 flex flex-col items-center text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Total Staked</p>
          <h3 className="text-3xl font-black text-white">${stakedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="glass-card !p-6 flex flex-col items-center text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Yield Earned</p>
          <h3 className="text-3xl font-black text-green-400">+$0.00</h3>
        </div>
        <div className="glass-card !p-6 flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute inset-0 bg-cyan-400/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 relative z-10">Reward Points</p>
          <div className="flex items-center gap-2 relative z-10">
            <h3 className="text-3xl font-black text-cyan-400 animate-pulse-slow">
              {points.toLocaleString()}
            </h3>
            <Sparkles className="text-cyan-400/50" size={16} />
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden relative !p-8 purple-glow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h3 className="text-2xl font-bold">Yield Opportunities</h3>
            <p className="text-sm text-gray-500 mt-1">Found {filteredStrategies.length} strategies matching your criteria.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full md:w-64"
              />
            </div>
            
            <Button 
              variant="outline"
              size="icon"
              onClick={refresh}
              disabled={loading}
              className="w-10 h-10 rounded-xl bg-white/5 border-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>
            <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/20 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['All', 'SOL', 'Stable', 'PUSD', 'AUDD', 'High Yield'].map((filter) => (
            <Button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              variant={activeFilter === filter ? 'default' : 'outline'}
              className={`rounded-full px-5 h-9 text-xs font-bold transition-all border ${
                activeFilter === filter 
                ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20 hover:bg-purple-600' 
                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {filter}
            </Button>
          ))}
        </div>
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            Error: {error}
          </div>
        )}

        <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredStrategies.length === 0 ? (
            <div className="py-20 text-center text-gray-500 italic bg-white/5 rounded-3xl border border-dashed border-white/10">
              No strategies found matching "{searchQuery}"
            </div>
          ) : (
            filteredStrategies.map((strat, i) => (
              <div 
                key={i} 
                onClick={() => openDetails(strat)}
                className="flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {strat.name.includes('SOL') ? <Zap size={24} className="text-yellow-400" /> : <Coins size={24} className="text-cyan-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">{strat.name}</h4>
                      <InfoIcon size={14} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <ShieldCheck size={10} /> Verified Protocol: {strat.protocol}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">TVL: <span className="text-white">{strat.tvl}</span></span>
                      {parseFloat(strat.apy) > 50 && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter animate-pulse">DeFi Hot 🔥</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-12 mt-4 md:mt-0">
                  <div className="text-center min-w-[100px]">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">APY</p>
                    <p className="text-2xl font-black text-purple-400">{strat.apy}</p>
                  </div>
                  <Button className="bg-white text-black px-8 py-6 rounded-xl font-bold hover:scale-105 hover:bg-gray-100 transition-transform shadow-lg group">
                    Deposit <ArrowRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
