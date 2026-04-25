'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Zap, Lock, Eye, EyeOff, Loader2, Sparkles, Fingerprint } from 'lucide-react';
import { useAnchorProgram } from '@/hooks/useAnchorProgram';

export default function PrivacyView() {
  const { program, wallet, togglePrivate, getPdas } = useAnchorProgram();
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (program && wallet) {
      fetchPrivacyStatus();
    }
  }, [program, wallet]);

  const fetchPrivacyStatus = async () => {
    try {
      const { userProfilePda } = getPdas(wallet!.publicKey, "");
      const profile = await program!.account.userProfile.fetch(userProfilePda);
      setIsPrivate(profile.privateMode);
    } catch (e) {
      console.error("Failed to fetch privacy status:", e);
    } finally {
      setFetching(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      await togglePrivate();
      setIsPrivate(!isPrivate);
    } catch (e) {
      console.error("Toggle failed:", e);
      alert("Failed to toggle privacy mode. Make sure your profile is initialized.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 fade-in">
      {/* Header Card */}
      <div className="glass-card !p-10 relative overflow-hidden purple-glow">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-purple-400" size={32} />
              <h2 className="text-3xl font-black">Private Mode</h2>
            </div>
            <p className="text-gray-400 max-w-xl leading-relaxed">
              When Private Mode is enabled, your portfolio balances and yield activities are processed via 
              <span className="text-white font-bold"> MagicBlock Ephemeral Rollups</span>. 
              This ensures sub-second state updates with zero gas fees and enhanced metadata privacy.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={handleToggle}
              disabled={loading || fetching}
              className={`relative w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 border-4 ${
                isPrivate 
                  ? 'bg-purple-500/20 border-purple-400 shadow-[0_0_50px_rgba(168,85,247,0.3)]' 
                  : 'bg-white/5 border-white/10 grayscale hover:grayscale-0'
              }`}
            >
              {loading || fetching ? (
                <Loader2 className="animate-spin text-purple-400" size={48} />
              ) : isPrivate ? (
                <>
                  <Lock className="text-purple-400 mb-2 animate-pulse" size={64} />
                  <span className="text-sm font-black uppercase tracking-widest text-purple-400">Secured</span>
                </>
              ) : (
                <>
                  <Eye className="text-gray-500 mb-2" size={64} />
                  <span className="text-sm font-black uppercase tracking-widest text-gray-500">Public</span>
                </>
              )}
              
              {/* Spinning Ring */}
              {isPrivate && !loading && (
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-purple-400/30 animate-spin-slow"></div>
              )}
            </button>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
              {isPrivate ? "Privacy Shield Active" : "Privacy Shield Inactive"}
            </p>
          </div>
        </div>
        
        {/* Background Decor */}
        <div className="absolute top-0 right-0 p-10 opacity-5">
          <Fingerprint size={200} />
        </div>
      </div>

      {/* MagicBlock Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard 
          icon={<Zap className="text-yellow-400" />}
          title="Ephemeral Rollups"
          description="State is committed to L1 but processed in sub-second ephemeral slots for instant feedback."
        />
        <FeatureCard 
          icon={<ShieldCheck className="text-green-400" />}
          title="Metadata Privacy"
          description="Your yield-seeking activities are obfuscated from public crawlers while maintaining verifiability."
        />
        <FeatureCard 
          icon={<Sparkles className="text-cyan-400" />}
          title="Zero Gas Toggle"
          description="Switching privacy modes and recording rewards costs $0.00 in SOL via MagicBlock infrastructure."
        />
        <FeatureCard 
          icon={<ShieldAlert className="text-orange-400" />}
          title="Auto-Commit"
          description="When you exit Private Mode, your earned points and state are securely anchored back to Solana L1."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="glass-card !p-6 flex gap-4 hover:bg-white/[0.07] transition-all group">
      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-lg mb-1">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
