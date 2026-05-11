'use client';

import { useWalletSession } from '@solana/react-hooks';
import { ConnectButton } from '@/components/ConnectButton';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  Target,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';

import DashboardView from '@/components/views/DashboardView';
import PortfolioView from '@/components/views/PortfolioView';
import YieldView from '@/components/views/YieldView';
import PredictView from '@/components/views/PredictView';
import AISwarmConsensus from '@/components/AISwarmConsensus';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewType = 'dashboard' | 'portfolio' | 'yield' | 'predict';

export default function Home() {
  const session = useWalletSession();
  const address = session?.account.address;
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        return null;
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-background text-foreground">

      {/* ── Desktop + Tablet Sidebar ──────────────────────── */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-border p-4 lg:p-6 gap-6 z-20 backdrop-blur-3xl bg-background/40 sticky top-0 h-screen flex-shrink-0 transition-all",
        "lg:w-56 xl:w-64"
      )}>
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-base lg:text-xl shadow-lg shadow-purple-500/20 flex-shrink-0">
            P
          </div>
          <span className="hidden lg:block text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent tracking-tighter">PrivyFi</span>
        </div>

        <nav className="flex flex-col gap-1 lg:gap-2">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} />
          <NavItem icon={<Wallet size={18} />}           label="Portfolio"  active={activeTab === 'portfolio'}  onClick={() => { setActiveTab('portfolio'); setMobileMenuOpen(false); }} />
          <NavItem icon={<TrendingUp size={18} />}       label="Yield"      active={activeTab === 'yield'}      onClick={() => { setActiveTab('yield'); setMobileMenuOpen(false); }} />
          <NavItem icon={<Target size={18} />}           label="Predict"    active={activeTab === 'predict'}    onClick={() => { setActiveTab('predict'); setMobileMenuOpen(false); }} />
        </nav>

        <div className="mt-auto hidden lg:block">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 lg:p-4">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">Network</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-sm font-medium">Solana Devnet</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 flex flex-row overflow-hidden z-10 min-w-0">

        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar pb-28 lg:pb-8 min-w-0">

          {/* ── Top header ────────────────────────────────── */}
          <header className="flex justify-between items-center mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden w-10 h-10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
              <div className="md:hidden w-9 h-9 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-base shadow-lg shadow-purple-500/20 flex-shrink-0">
                P
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight mb-0.5">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                  {activeTab === 'dashboard' && 'Portfolio overview and top opportunities'}
                  {activeTab === 'portfolio' && 'Your asset holdings and positions'}
                  {activeTab === 'yield' && 'Best yield strategies across Solana DeFi'}
                  {activeTab === 'predict' && 'Predict SOL price in 1-minute rounds'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Button variant="ghost" size="icon" className="hidden md:flex w-10 h-10 relative">
                <Bell size={18} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-purple-500 rounded-full border-2 border-background" />
              </Button>
              <ConnectButton className="!h-9 md:!h-10 !bg-white !text-black !rounded-xl !font-bold hover:!scale-105 transition-transform !text-xs md:!text-sm !px-3 md:!px-4" />
            </div>
          </header>

          {/* ── Mobile menu dropdown ──────────────────────── */}
          {mobileMenuOpen && (
            <div className="md:hidden glass-card p-4 mb-6 space-y-1">
              <MobileMenuItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} />
              <MobileMenuItem icon={<Wallet size={18} />} label="Portfolio" active={activeTab === 'portfolio'} onClick={() => { setActiveTab('portfolio'); setMobileMenuOpen(false); }} />
              <MobileMenuItem icon={<TrendingUp size={18} />} label="Yield" active={activeTab === 'yield'} onClick={() => { setActiveTab('yield'); setMobileMenuOpen(false); }} />
              <MobileMenuItem icon={<Target size={18} />} label="Predict" active={activeTab === 'predict'} onClick={() => { setActiveTab('predict'); setMobileMenuOpen(false); }} />
            </div>
          )}

          {/* ── View content ──────────────────────────────── */}
          {!address ? (
            <div className="flex flex-col items-center justify-center h-[60vh] px-4">
              <div className="rounded-2xl p-8 md:p-12 text-center max-w-md w-full border border-border/50 bg-card/60 backdrop-blur-xl">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Wallet size={36} className="text-purple-400" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-4">Connect Your Wallet</h2>
                <p className="text-muted-foreground mb-8 text-sm md:text-base">
                  Connect your Solflare or Phantom wallet to access your portfolio and predict SOL price.
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {renderView()}
            </div>
          )}
        </div>

        {/* AI Swarm Sidebar (desktop only) */}
        <div className="hidden xl:flex w-80 border-l border-border p-6 flex-col gap-6 bg-background/20 backdrop-blur-2xl flex-shrink-0">
          <AISwarmConsensus />
        </div>
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-2xl border-t border-border flex items-center justify-around z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)', minHeight: '64px' }}
      >
        <MobileNavItem icon={<LayoutDashboard size={20} />} label="Home"      active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} />
        <MobileNavItem icon={<Wallet size={20} />}           label="Portfolio" active={activeTab === 'portfolio'} onClick={() => { setActiveTab('portfolio'); setMobileMenuOpen(false); }} />
        <MobileNavItem icon={<TrendingUp size={20} />}       label="Yield"     active={activeTab === 'yield'}     onClick={() => { setActiveTab('yield'); setMobileMenuOpen(false); }} />
        <MobileNavItem icon={<Target size={20} />}           label="Predict"   active={activeTab === 'predict'}   onClick={() => { setActiveTab('predict'); setMobileMenuOpen(false); }} />
      </nav>
    </div>
  );
}

function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[64px]",
        active ? 'text-purple-400' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span className={cn('transition-transform', active && 'scale-110')}>{icon}</span>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function MobileMenuItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all text-sm",
        active ? 'bg-purple-500/10 text-purple-400 font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all w-full",
        active
          ? 'bg-purple-500/10 text-foreground font-bold border-l-2 border-purple-500'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      )}
    >
      <span className={cn('flex-shrink-0', active ? 'text-purple-400' : '')}>{icon}</span>
      <span className="hidden lg:block text-sm">{label}</span>
    </button>
  );
}
