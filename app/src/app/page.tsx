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
  Settings,
  Bell,
  User,
  Send,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

// Import Views
import DashboardView from '@/components/views/DashboardView';
import PortfolioView from '@/components/views/PortfolioView';
import YieldView from '@/components/views/YieldView';
import PrivacyView from '@/components/views/PrivacyView';

// Import Hooks
import { useAI } from '@/hooks/useAI';
import { useRewards } from '@/hooks/useRewards';

type ViewType = 'dashboard' | 'portfolio' | 'yield' | 'vaults' | 'privacy' | 'settings';

export default function Home() {
  const { connected } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewType>('dashboard');
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, loading: aiLoading } = useAI();
  const { addPoints } = useRewards();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiLoading]);

  if (!isMounted) return null;

  const handleSend = async () => {
    if (!input.trim() || aiLoading) return;
    const currentInput = input;
    setInput('');
    await sendMessage(currentInput);
    // Add points for interacting with AI
    await addPoints(10); 
  };

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'portfolio':
        return <PortfolioView />;
      case 'yield':
        return <YieldView />;
      case 'privacy':
        return <PrivacyView />;
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
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 p-6 flex-col gap-8 z-20 backdrop-blur-3xl bg-[#0d0d12]/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/20">
            P
          </div>
          <span className="text-xl font-bold gradient-text tracking-tighter">PrivyFi</span>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
          />
          <NavItem 
            icon={<Wallet size={20} />} 
            label="Portfolio" 
            active={activeTab === 'portfolio'} 
            onClick={() => setActiveTab('portfolio')}
          />
          <NavItem 
            icon={<TrendingUp size={20} />} 
            label="Yield" 
            active={activeTab === 'yield'} 
            onClick={() => setActiveTab('yield')}
          />
          <NavItem 
            icon={<Lock size={20} />} 
            label="Vaults" 
            active={activeTab === 'vaults'} 
            onClick={() => setActiveTab('vaults')}
          />
          <NavItem 
            icon={<ShieldCheck size={20} />} 
            label="Privacy" 
            active={activeTab === 'privacy'} 
            onClick={() => setActiveTab('privacy')}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
          />
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
        {/* Left Side: Dynamic View */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <header className="flex justify-between items-center mb-6 md:mb-10">
            <div className="flex items-center gap-4">
              <div className="lg:hidden w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/20">
                P
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1 md:mb-2">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-xs md:text-sm text-gray-400 hidden md:block">Optimize your yield with AI-powered insights.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button className="hidden md:flex w-10 h-10 rounded-xl border border-white/10 items-center justify-center hover:bg-white/5 transition-colors relative">
                <Bell size={18} className="text-gray-400" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#0d0d12]"></span>
              </button>
              <WalletMultiButton className="!h-10 md:!h-12 !bg-white !text-black !rounded-xl !font-bold hover:!scale-105 transition-transform !text-xs md:!text-sm" />
            </div>
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
            renderView()
          )}
        </div>

        {/* Right Side: AI Advisor Sidebar - Desktop Only */}
        <div className="hidden xl:flex w-96 border-l border-white/5 p-8 flex-col gap-6 bg-[#0d0d12]/20 backdrop-blur-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">AI Advisor</h3>
              <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Llama 3.3</p>
            </div>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <ChatBubble 
                type="bot" 
                message={`Hi there! I'm your PrivyFi advisor. ${connected ? "I've analyzed your portfolio—how can I help you optimize your yield today?" : "Connect your wallet so I can analyze your holdings."}`} 
              />
            ) : (
              messages.map((msg, i) => (
                <ChatBubble 
                  key={i} 
                  type={msg.role === 'assistant' ? 'bot' : 'user'} 
                  message={msg.content} 
                />
              ))
            )}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-bl-none">
                  <Loader2 className="text-purple-400 animate-spin" size={18} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Privy anything..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 pr-14 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
              />
              <button 
                onClick={handleSend}
                disabled={aiLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <ArrowUpRight size={18} className="text-purple-400" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0d0d12]/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-4 z-[100]">
        <MobileNavItem 
          icon={<LayoutDashboard size={20} />} 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
        />
        <MobileNavItem 
          icon={<Wallet size={20} />} 
          active={activeTab === 'portfolio'} 
          onClick={() => setActiveTab('portfolio')}
        />
        <MobileNavItem 
          icon={<TrendingUp size={20} />} 
          active={activeTab === 'yield'} 
          onClick={() => setActiveTab('yield')}
        />
        <MobileNavItem 
          icon={<MessageSquare size={20} />} 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} // Mock for AI on mobile
        />
      </nav>
    </div>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
        active ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-500'
      }`}
    >
      {icon}
    </button>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
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

function ChatBubble({ type, message }: { type: 'bot' | 'user', message: string }) {
  return (
    <div className={`flex ${type === 'bot' ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[95%] p-4 rounded-2xl text-sm leading-relaxed ${
        type === 'bot' 
          ? 'bg-white/5 border border-white/5 text-gray-300 rounded-bl-none' 
          : 'bg-purple-600 text-white rounded-br-none font-bold'
      }`}>
        <div className="flex gap-3">
          {type === 'bot' && (
            <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex-shrink-0 flex items-center justify-center">
              <ShieldCheck size={14} className="text-purple-400" />
            </div>
          )}
          <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-strong:text-purple-400 prose-headings:text-white prose-sm">
            {type === 'bot' ? <ReactMarkdown>{message}</ReactMarkdown> : <span>{message}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
