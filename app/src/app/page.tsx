'use client';

import { useWalletSession } from '@solana/react-hooks';
import { ConnectButton } from '@/components/ConnectButton';
import { TestDashboard } from '@/components/TestDashboard';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  Lock, 
  ShieldCheck, 
  Settings,
  Bell,
  Target
} from 'lucide-react';
import { useState, useEffect } from 'react';

// Import Views
import DashboardView from '@/components/views/DashboardView';
import PortfolioView from '@/components/views/PortfolioView';
import YieldView from '@/components/views/YieldView';
import PredictView from '@/components/views/PredictView';
import AISwarmConsensus from '@/components/AISwarmConsensus';

type ViewType = 'dashboard' | 'portfolio' | 'yield' | 'settings' | 'predict';

export default function Home() {
  const session = useWalletSession();
  const address = session?.account.address;
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewType>('dashboard');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':  return <DashboardView />;
      case 'portfolio':  return <PortfolioView />;
      case 'yield':      return <YieldView />;
      case 'predict':    return <PredictView />;
      default:
        return (
          <div className="flex items-center justify-center h-[50vh] text-gray-500 italic">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} view coming soon...
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-[#050508] text-white">

      {/* ── Sidebar (desktop only) ───────────────────────────── */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 p-6 flex-col gap-8 z-20 backdrop-blur-3xl bg-[#0d0d12]/40 sticky top-0 h-screen flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/20">
            P
          </div>
          <span className="text-xl font-bold gradient-text tracking-tighter">PrivyFi</span>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Wallet size={20} />}           label="Portfolio"  active={activeTab === 'portfolio'}  onClick={() => setActiveTab('portfolio')} />
          <NavItem icon={<TrendingUp size={20} />}       label="Yield"      active={activeTab === 'yield'}      onClick={() => setActiveTab('yield')} />
          <NavItem icon={<Target size={20} />}           label="Predict"    active={activeTab === 'predict'}    onClick={() => setActiveTab('predict')} />
          <NavItem icon={<Settings size={20} />}         label="Settings"   active={activeTab === 'settings'}   onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="mt-auto">
          <div className="glass-card !p-4 rounded-xl border-purple-500/20 bg-purple-500/5">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">Network</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-sm font-medium">Solana Devnet</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content + right sidebar ────────────────────── */}
      <main className="flex-1 flex flex-row overflow-hidden z-10 min-w-0">

        {/* Scrollable view area — extra bottom padding on mobile so nav doesn't overlap */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar pb-28 lg:pb-8 min-w-0">

          {/* ── Top header ──────────────────────────────────── */}
          <header className="flex justify-between items-center mb-6 md:mb-10">
            <div className="flex items-center gap-3">
              {/* Logo visible only on mobile since sidebar is hidden */}
              <div className="lg:hidden w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/20 flex-shrink-0">
                P
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight mb-0.5 md:mb-2">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-xs md:text-sm text-gray-400 hidden md:block">
                  Optimize your yield with AI-powered insights.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <button className="hidden md:flex w-10 h-10 rounded-xl border border-white/10 items-center justify-center hover:bg-white/5 transition-colors relative">
                <Bell size={18} className="text-gray-400" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#0d0d12]" />
              </button>
              {/* Compact wallet button on mobile */}
              <ConnectButton className="!h-9 md:!h-12 !bg-white !text-black !rounded-xl !font-bold hover:!scale-105 transition-transform !text-xs md:!text-sm !px-3 md:!px-5" />
            </div>
          </header>

          {/* ── View content ────────────────────────────────── */}
          {!address ? (
            <div className="flex flex-col items-center justify-center h-[60vh] fade-in px-4">
              <div className="glass-card !p-8 md:!p-12 text-center max-w-md w-full purple-glow">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Wallet className="text-purple-400" size={36} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-4">Connect Your Wallet</h2>
                <p className="text-gray-400 mb-8 text-sm md:text-base">
                  Connect your Solflare wallet to access your portfolio and start earning optimized yield.
                </p>
                <div className="flex justify-center scale-110">
                  <ConnectButton />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <TestDashboard />
              {renderView()}
            </div>
          )}
        </div>

        {/* AI Swarm Sidebar (desktop xl+ only) */}
        <div className="hidden xl:flex w-96 border-l border-white/5 p-8 flex-col gap-6 bg-[#0d0d12]/20 backdrop-blur-2xl flex-shrink-0">
          <AISwarmConsensus />
        </div>
      </main>

      {/* ── Mobile bottom nav ───────────────────────────────── */}
      {/* Uses env(safe-area-inset-bottom) so it doesn't get clipped on iPhones */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d12]/90 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around z-[100]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', minHeight: '60px' }}
      >
        <MobileNavItem icon={<LayoutDashboard size={20} />} label="Home"      active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<Wallet size={20} />}           label="Portfolio" active={activeTab === 'portfolio'} onClick={() => setActiveTab('portfolio')} />
        <MobileNavItem icon={<TrendingUp size={20} />}       label="Yield"     active={activeTab === 'yield'}     onClick={() => setActiveTab('yield')} />
        <MobileNavItem icon={<Target size={20} />}           label="Predict"   active={activeTab === 'predict'}   onClick={() => setActiveTab('predict')} />
      </nav>
    </div>
  );
}

// ── Nav components ──────────────────────────────────────────────────────────

function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
        active ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      <span className={`transition-all ${active ? 'scale-110' : ''}`}>{icon}</span>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all group ${
        active
          ? 'sidebar-active text-white font-bold'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={`${active ? 'text-purple-400' : 'group-hover:text-purple-400 transition-colors'}`}>{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}
