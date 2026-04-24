'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  Lock, 
  ShieldCheck, 
  MessageSquare,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const { connected } = useWallet();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 p-6 flex flex-col gap-8 z-20 backdrop-blur-3xl bg-[#0d0d12]/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/20">
            P
          </div>
          <span className="text-xl font-bold gradient-text tracking-tighter">PrivyFi</span>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <NavItem icon={<Wallet size={20} />} label="Portfolio" />
          <NavItem icon={<TrendingUp size={20} />} label="Yield" />
          <NavItem icon={<Lock size={20} />} label="Vaults" />
          <NavItem icon={<ShieldCheck size={20} />} label="Privacy" />
        </nav>

        <div className="mt-auto">
          <div className="glass-card !p-4 rounded-xl border-purple-500/20 bg-purple-500/5">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">Network</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-sm font-medium">Solana Devnet</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-row overflow-hidden z-10">
        {/* Left Side: Main Dashboard */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-2">Welcome Back</h1>
              <p className="text-gray-400">Optimize your yield with AI-powered insights.</p>
            </div>
            <WalletMultiButton className="!h-12 !bg-white !text-black !rounded-xl !font-bold hover:!scale-105 transition-transform" />
          </header>

          {!connected ? (
            <div className="flex flex-col items-center justify-center h-[60vh] fade-in">
              <div className="glass-card !p-12 text-center max-w-md purple-glow">
                <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Wallet className="text-purple-400" size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
                <p className="text-gray-400 mb-8">
                  Connect your Solflare wallet to access your portfolio and start earning optimized yield.
                </p>
                <div className="flex justify-center scale-110">
                    <WalletMultiButton />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8 fade-in">
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label="Total Value Locked" 
                  value="$4,578,120.34" 
                  change="+9.23%" 
                  trend="up"
                  className="purple-glow"
                />
                <StatCard 
                  label="Total Net Worth" 
                  value="$1,234,567.89" 
                  change="+4.50%" 
                  trend="up"
                />
                <StatCard 
                  label="Yield Strategies" 
                  value="7 Active" 
                  change="Stable" 
                  trend="neutral"
                />
              </div>

              {/* Chart Section */}
              <div className="glass-card h-[350px] flex items-center justify-center purple-glow">
                <p className="text-gray-500 italic font-medium">Portfolio Performance Chart Integration Coming Soon...</p>
              </div>

              {/* Yield Section */}
              <div className="glass-card !p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold">Top Yield Opportunities</h3>
                  <button className="text-sm text-purple-400 font-bold hover:underline tracking-tight">View All</button>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                    Scanning Kamino and Jupiter for best APYs...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: AI Advisor Sidebar */}
        <div className="w-96 border-l border-white/5 p-8 flex flex-col gap-6 bg-[#0d0d12]/20 backdrop-blur-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">AI Advisor</h3>
              <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Llama 3.3</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-bl-none text-sm text-gray-300 leading-relaxed">
              "Connect your wallet to get personalized yield recommendations based on your holdings."
            </div>
          </div>

          <div className="mt-auto">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ask Privy anything..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowUpRight size={18} className="text-purple-400" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all group ${
      active 
        ? 'bg-purple-500/10 text-white font-bold border border-purple-500/20 shadow-lg shadow-purple-500/5' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}>
      <span className={`${active ? 'text-purple-400' : 'group-hover:text-purple-400 transition-colors'}`}>{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function StatCard({ label, value, change, trend, className }: { 
  label: string, 
  value: string, 
  change: string, 
  trend: 'up' | 'down' | 'neutral',
  className?: string 
}) {
  return (
    <div className={`glass-card p-6 group hover:scale-[1.02] transition-all ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{label}</p>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
          trend === 'up' ? 'bg-green-500/10 text-green-400' : trend === 'down' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'
        }`}>
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
          {change}
        </div>
      </div>
      <h3 className="text-2xl font-black tracking-tight">{value}</h3>
    </div>
  );
}
