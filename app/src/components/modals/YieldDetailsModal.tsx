'use client';

import { useState, useEffect } from 'react';
import { X, Info, TrendingUp, ShieldAlert, Zap, BarChart3, Brain, ArrowUpRight, Loader2, ExternalLink, CheckCircle2, Lock, Unlock, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAnchorProgram } from '@/hooks/useAnchorProgram';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner'; // Assuming sonner is available or I'll use a simple alert
import { useAIRecommendation } from '@/hooks/useAIRecommendation';
import { Button } from '@/components/ui/button';

interface YieldDetailsModalProps {
  strategy: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function YieldDetailsModal({ strategy, isOpen, onClose }: YieldDetailsModalProps) {
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isFauceting, setIsFauceting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { analyzeStrategy, recommendation, loading: loadingAi, reset: resetAi, loadFromCache } = useAIRecommendation();
  const { deposit, withdraw, initializeUser, program, wallet, getPdas, connection } = useAnchorProgram();
  const [currentStake, setCurrentStake] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const MINT_ADDRESSES: Record<string, string> = {
    'USDC': process.env.NEXT_PUBLIC_FAKE_USDC_MINT || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    'SOL': 'So11111111111111111111111111111111111111112',
    'PUSD': process.env.NEXT_PUBLIC_FAKE_PUSD_MINT || '9m4cLdJAGDgsuwHwu1up2avvatfmiSzgMa6aarHR135N', 
    'AUDD': process.env.NEXT_PUBLIC_FAKE_AUDD_MINT || 'HX4ENGDHv2F5cvWrBWAhdnEYQkA1U645G6LUs5uiWsQ',
  };

  const TOKEN_PROGRAMS: Record<string, string> = {
    'USDC': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'SOL': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'PUSD': 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022
    'AUDD': 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022
  };

  const FAUCET_LINKS: Record<string, string> = {
    'USDC': 'https://solana.com/faucet', 
    'SOL': 'https://faucet.solana.com/',
    'PUSD': `https://explorer.solana.com/address/${MINT_ADDRESSES.PUSD}?cluster=devnet`,
    'AUDD': `https://explorer.solana.com/address/${MINT_ADDRESSES.AUDD}?cluster=devnet`,
  };

  const getTokenInfo = () => {
    const name = strategy?.name || '';
    if (name.includes('USDC')) return { mint: MINT_ADDRESSES.USDC, faucet: FAUCET_LINKS.USDC, symbol: 'USDC', programId: TOKEN_PROGRAMS.USDC };
    if (name.includes('SOL')) return { mint: MINT_ADDRESSES.SOL, faucet: FAUCET_LINKS.SOL, symbol: 'SOL', programId: TOKEN_PROGRAMS.SOL };
    if (name.includes('PUSD')) return { mint: MINT_ADDRESSES.PUSD, faucet: FAUCET_LINKS.PUSD, symbol: 'PUSD', programId: TOKEN_PROGRAMS.PUSD };
    if (name.includes('AUDD')) return { mint: MINT_ADDRESSES.AUDD, faucet: FAUCET_LINKS.AUDD, symbol: 'AUDD', programId: TOKEN_PROGRAMS.AUDD };
    return { mint: MINT_ADDRESSES.USDC, faucet: FAUCET_LINKS.USDC, symbol: 'USDC', programId: TOKEN_PROGRAMS.USDC };
  };

  const refreshBalance = async () => {
    if (wallet && connection) {
      try {
        const { mint, programId } = getTokenInfo();
        const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
        const ata = getAssociatedTokenAddressSync(new PublicKey(mint), wallet.publicKey, false, new PublicKey(programId));
        const balance = await connection.getTokenAccountBalance(ata);
        setTokenBalance(balance.value.uiAmount);
      } catch (e) {
        setTokenBalance(0);
      }
    }
  };

  useEffect(() => {
    async function init() {
      if (isOpen && strategy) {
        if (wallet && program) {
          const { userPositionPda } = getPdas(wallet.publicKey, strategy.name);
          try {
            const position = await program.account.userPosition.fetch(userPositionPda);
            setCurrentStake(position.amount.toNumber() / 1_000_000);
          } catch (e) {
            setCurrentStake(0);
          }

          await refreshBalance();
        }
        
        const cacheHit = loadFromCache(strategy);
        if (!cacheHit) {
          resetAi();
        }
      }
    }
    init();
  }, [isOpen, strategy, wallet]);

  const handleAnalyze = async () => {
    if (!strategy) return;
    await analyzeStrategy(strategy);
  };

  const handleFaucet = async () => {
    if (!wallet) return;
    const { mint, symbol } = getTokenInfo();
    if (symbol !== 'PUSD' && symbol !== 'AUDD') {
      window.open(getTokenInfo().faucet, '_blank');
      return;
    }

    setIsFauceting(true);
    toast.info(`Requesting 1,000 ${symbol} from Faucet...`);
    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAddress: wallet.publicKey.toBase58(),
          mintAddress: mint,
        })
      });

      if (!response.ok) throw new Error("Faucet request failed");
      toast.success(`Received 1,000 ${symbol}!`);
      await refreshBalance();
    } catch (e: any) {
      toast.error(`Faucet Error: ${e.message}`);
    } finally {
      setIsFauceting(false);
    }
  };

  const handleStartEarning = async () => {
    if (!wallet) {
      toast.error("Please connect your Solflare or Phantom wallet first!");
      return;
    }

    setIsDepositing(true);
    try {
      try {
        await initializeUser();
      } catch (e) {}

      const poolName = strategy.name;
      const { mint, programId } = getTokenInfo();
      const mockMint = new PublicKey(mint);
      const tokenProgram = new PublicKey(programId);

      toast.info(`Depositing ${strategy.name.includes('SOL') ? 'SOL' : 'tokens'} to vault...`);
      const tx = await deposit(poolName, mockMint, 1000000); 
      
      toast.success("Deposit successful!");
      setSuccess(true);
      setCurrentStake(prev => prev + 1); 
      setTimeout(() => setSuccess(false), 5000);
    } catch (e: any) {
      toast.error(`Deposit failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!wallet) return;
    setIsWithdrawing(true);
    try {
      toast.info("Withdrawing from vault...");
      const poolName = strategy.name;
      const { mint } = getTokenInfo();
      const mockMint = new PublicKey(mint);
      const tx = await withdraw(poolName, mockMint, 1000000); 
      toast.success("Withdraw successful!");
      setCurrentStake(prev => Math.max(0, prev - 1));
    } catch (e: any) {
      toast.error(`Withdraw failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isOpen) return null;

  // Calculate a mock "PrivyFi Score"
  const score = Math.min(10, Math.max(1, (parseFloat(strategy.apy) / 20) + (parseFloat(strategy.tvl.replace('$', '').replace('M', '')) / 50))).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative glass-card !p-0 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-purple-500/10 to-transparent">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
              <Zap size={32} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black">{strategy.name}</h2>
              <p className="text-purple-400 font-bold flex items-center gap-2">
                <Info size={14} /> Powered by {strategy.protocol}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-white transition-colors hover:bg-white/5 rounded-xl">
            <X size={24} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Live APY</p>
              <p className="text-2xl font-black text-green-400">{strategy.apy}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Liquidity (TVL)</p>
              <p className="text-2xl font-black text-white">{strategy.tvl}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-black uppercase mb-1">PrivyFi Score</p>
              <p className="text-2xl font-black text-cyan-400">{score}/10</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-green-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <p className="text-[10px] text-gray-500 font-black uppercase mb-1 relative z-10">Your Stake</p>
              <p className="text-2xl font-black text-white relative z-10">${currentStake.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* AI Section */}
          <div className={`border rounded-3xl p-6 mb-8 relative overflow-hidden group ${
            !recommendation ? 'bg-purple-500/5 border-purple-500/20' : 
            recommendation.recommended ? 'bg-green-500/5 border-green-500/20' : 'bg-orange-500/5 border-orange-500/20'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Brain className={!recommendation ? 'text-purple-400' : recommendation.recommended ? 'text-green-400' : 'text-orange-400'} size={24} />
                <h4 className="font-bold text-lg">AI Risk Assessment</h4>
              </div>
              {recommendation && (
                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                  recommendation.recommended ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                }`}>
                  {recommendation.recommended ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  {recommendation.recommended ? 'Recommended' : 'Caution Advised'}
                </div>
              )}
            </div>
            
            {loadingAi ? (
              <div className="flex items-center gap-3 text-gray-500 py-4">
                <Loader2 className="animate-spin" size={18} />
                <p>Analyzing strategy logic and volatility...</p>
              </div>
            ) : !recommendation ? (
              <div className="flex flex-col items-center justify-center py-6 text-center z-10 relative">
                <Lock className="text-purple-400/50 mb-3" size={32} />
                <p className="text-gray-400 mb-4 max-w-sm">Deposit is locked. Request an AI risk analysis to unlock this pool and view safety metrics.</p>
                <Button 
                  onClick={handleAnalyze}
                  className="px-6 py-5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
                >
                  Analyze Risk to Unlock
                </Button>
              </div>
            ) : (
              <div className="text-gray-300 leading-relaxed text-sm relative z-10 space-y-4">
                {/* Reasoning bullets */}
                <ul className="space-y-1.5">
                  {(Array.isArray(recommendation.reasoning) ? recommendation.reasoning : [recommendation.reasoning]).map((reason: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${recommendation.recommended ? 'bg-green-400' : 'bg-orange-400'}`} />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>

                {/* Example return */}
                {recommendation.exampleReturn && (
                  <p className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 italic">
                    💡 {recommendation.exampleReturn}
                  </p>
                )}

                {/* Score bars */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Confidence</span>
                      <span className="font-bold">{recommendation.confidenceScore}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${recommendation.confidenceScore > 80 ? 'bg-green-500' : recommendation.confidenceScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${recommendation.confidenceScore}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Risk Score</span>
                      <span className="font-bold">{recommendation.riskScore ?? (recommendation.riskLevel === 'Low' ? 20 : recommendation.riskLevel === 'Medium' ? 50 : 80)}/100</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${(recommendation.riskScore ?? 50) < 35 ? 'bg-green-500' : (recommendation.riskScore ?? 50) < 65 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${recommendation.riskScore ?? (recommendation.riskLevel === 'Low' ? 20 : recommendation.riskLevel === 'Medium' ? 50 : 80)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <BarChart3 size={100} />
            </div>
          </div>

          {/* Educational Content / Swarm Visualizer */}
          {recommendation?.swarmVotes && recommendation.swarmVotes.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-bold flex items-center gap-2 mb-4 text-white">
                <Brain size={18} className="text-purple-400" /> 
                Individual AI Node Votes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendation.swarmVotes.map((v: any, idx: number) => (
                  <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono text-gray-400">{v.model}</span>
                      <span className="text-xs text-gray-500 truncate max-w-[150px]">{v.reasoning || "Analyzed successfully"}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      v.vote === 'Recommended' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {v.vote}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
              <h4 className="font-bold flex items-center gap-2 mb-2 text-orange-400">
                <ShieldAlert size={18} /> 
                Risk Level: {strategy.risk}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {strategy.risk === 'High' 
                  ? "High APR usually means higher volatility. The price of these tokens might fluctuate significantly."
                  : "This is a more stable pool, but still carries smart contract risks."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <p className="text-xs text-gray-500 max-w-xs text-center md:text-left">
            Ready to start? Solflare/dFlow will route your swap, and the deposit will be processed through our secure vault.
          </p>
          <div className="flex gap-4 w-full md:w-auto">
            <a 
              href={
                strategy.protocol === 'Meteora' 
                  ? (strategy.address?.length > 20 ? `https://dlmm.meteora.ag/pair/${strategy.address}` : 'https://dlmm.meteora.ag')
                  : strategy.protocol === 'Kamino' ? 'https://app.kamino.finance'
                  : 'https://jup.ag'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all text-sm font-bold shadow-xl whitespace-nowrap"
            >
              View on {strategy.protocol} <ExternalLink size={14} />
            </a>
            {currentStake > 0 && (
              <Button 
                variant="outline"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="px-6 py-6 rounded-2xl font-bold border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                {isWithdrawing ? <Loader2 className="animate-spin" size={16} /> : 'Withdraw'}
              </Button>
            )}
            {tokenBalance === 0 ? (
              (getTokenInfo().symbol === 'PUSD' || getTokenInfo().symbol === 'AUDD') ? (
                <Button 
                  onClick={handleFaucet}
                  disabled={isFauceting}
                  className="flex-1 md:flex-none px-10 py-6 rounded-2xl bg-yellow-500 text-black font-black hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center gap-2 h-auto"
                >
                  {isFauceting ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                  Get Devnet {getTokenInfo().symbol} (Airdrop)
                </Button>
              ) : (
                <a 
                  href={getTokenInfo().faucet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none px-10 py-4 rounded-2xl bg-yellow-500 text-black font-black hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                >
                  Get Devnet {getTokenInfo().symbol} (Faucet)
                </a>
              )
            ) : !recommendation ? (
              <Button 
                disabled={true}
                variant="secondary"
                className="flex-1 md:flex-none px-10 py-6 rounded-2xl font-black bg-white/10 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2 h-auto"
              >
                <Lock size={20} /> Locked
              </Button>
            ) : (
              <Button 
                onClick={handleStartEarning}
                disabled={isDepositing || success}
                className={`flex-1 md:flex-none px-10 py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-2xl h-auto ${
                  success 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-white text-black hover:bg-gray-100 hover:scale-105 active:scale-95'
                }`}
              >
                {isDepositing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Processing...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 size={20} /> Deposited!
                  </>
                ) : (
                  <>
                    <Unlock size={20} className="mr-1" /> Deposit & Earn <ArrowUpRight size={20} />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
