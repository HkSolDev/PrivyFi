'use client';

import { useState, useEffect } from 'react';
import { X, Info, TrendingUp, ShieldAlert, Zap, BarChart3, Brain, ArrowUpRight, Loader2 } from 'lucide-react';

import ReactMarkdown from 'react-markdown';

interface YieldDetailsModalProps {
  strategy: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function YieldDetailsModal({ strategy, isOpen, onClose }: YieldDetailsModalProps) {
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (isOpen && strategy) {
      fetchAiInsight();
    }
  }, [isOpen, strategy]);

  const fetchAiInsight = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze this DeFi pool: ${strategy.name} on ${strategy.protocol} (${strategy.apy} APY). 
            
            Structure your response as follows:
            - **Friendly Summary**: 1 sentence greeting.
            - **The Opportunity**: Explain what it is.
            - **Sustainability**: Is the yield real?
            - **Risk Watch**: Key risks in simple terms.
            - **PrivyFi Score**: Provide a score out of 10.
            
            Use bold text for important terms and emojis for a premium feel.`
          }]
        })
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.message || "No insight available at the moment.";
      setAiInsight(content);
    } catch (e) {
      setAiInsight("AI advisor is currently unavailable, but this pool looks like a high-performance liquidity pair on Meteora.");
    } finally {
      setLoadingAi(false);
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
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          </div>

          {/* AI Section */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-3xl p-6 mb-8 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="text-purple-400" size={24} />
              <h4 className="font-bold text-lg">AI Advisor Analysis</h4>
            </div>
            
            {loadingAi ? (
              <div className="flex items-center gap-3 text-gray-500 py-4">
                <Loader2 className="animate-spin" size={18} />
                <p>Generating personalized insight...</p>
              </div>
            ) : (
              <div className="text-gray-300 leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-strong:text-purple-400 prose-headings:text-white prose-headings:mb-2">
                <ReactMarkdown>{aiInsight}</ReactMarkdown>
              </div>
            )}
            
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 size={100} />
            </div>
          </div>

          {/* Educational Content */}
          <div className="space-y-6">
            <div>
              <h4 className="font-bold flex items-center gap-2 mb-2 text-white">
                <TrendingUp size={18} className="text-green-400" /> 
                How you earn money
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                By depositing into this pool, you are providing "Liquidity" to other traders. 
                Every time someone swaps between these tokens, they pay a small fee. 
                **That fee goes directly to you.** 
                Plus, this pool earns extra rewards from {strategy.protocol}.
              </p>
            </div>

            <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
              <h4 className="font-bold flex items-center gap-2 mb-2 text-orange-400">
                <ShieldAlert size={18} /> 
                Risk Level: {strategy.risk}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {strategy.risk === 'High' 
                  ? "High APR usually means higher volatility. The price of these tokens might fluctuate significantly. Only invest what you are willing to hold long-term."
                  : "This is a more stable pool, but still carries smart contract risks. Always diversify your deposits."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <p className="text-xs text-gray-500 max-w-xs text-center md:text-left">
            Ready to start? The deposit will be processed through our secure, private vault.
          </p>
          <button className="w-full md:w-auto bg-white text-black px-10 py-4 rounded-2xl font-black hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-2xl">
            Start Earning <ArrowUpRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
