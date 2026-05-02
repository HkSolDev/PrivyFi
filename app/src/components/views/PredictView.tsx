'use client';

import { useState, useEffect } from 'react';
import { Target, Loader2, RefreshCcw, Search, Brain, ShieldCheck, Activity, ExternalLink, Globe, User, CheckCircle2, AlertTriangle, MessageSquare, ArrowRight } from 'lucide-react';
import { useYield } from '@/hooks/useYield';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function PredictView() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');

  // Inline Analysis State
  const { strategies } = useYield();
  const [analyses, setAnalyses] = useState<Map<string, string>>(new Map());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/predictions');
      const data = await res.json();
      console.log('Markets fetched:', data.markets?.length);
      setMarkets(data.markets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const handleAnalyze = async (market: any) => {
    const marketId = market.id || market.title;
    if (analyzingIds.has(marketId)) return;

    setSelectedMarket(market);
    setDialogOpen(true);
    setAnalyzing(true);
    setAnalysisResult(null);
    setAnalyzingIds(prev => new Set(prev).add(marketId));

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: market,
          mode: 'swarm',
          isDeepResearch: true
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAnalysisResult(data);
      } else {
        setAnalysisResult({ ok: false, error: data.error });
      }
    } catch (e) {
      console.error(e);
      setAnalysisResult({ ok: false, error: 'Network error' });
    } finally {
      setAnalyzing(false);
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(marketId);
        return next;
      });
    }
  };

  const filteredMarkets = markets.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.protocol.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesProtocol = true;
    if (activeFilter !== 'All') {
      matchesProtocol = m.protocol === activeFilter;
    }

    let matchesCategory = true;
    if (activeCategory !== 'All') {
      const cat = m.category?.toLowerCase() || '';
      if (activeCategory === 'Politics') matchesCategory = cat.includes('politic') || cat.includes('election');
      else if (activeCategory === 'Crypto') matchesCategory = cat.includes('crypto') || cat.includes('bitcoin') || cat.includes('eth');
      else if (activeCategory === 'Sports') matchesCategory = cat.includes('sport') || cat.includes('nfl') || cat.includes('nba');
      else if (activeCategory === 'Finance') matchesCategory = cat.includes('finance') || cat.includes('econ') || cat.includes('business');
      else matchesCategory = !cat.includes('politic') && !cat.includes('crypto') && !cat.includes('sport') && !cat.includes('finance');
    }

    return matchesSearch && matchesProtocol && matchesCategory;
  });

  const totalVol = (markets || []).reduce((acc, curr) => {
    const numstr = String(curr.volume || '0').replace(/[^0-9.]/g, '');
    const num = parseFloat(numstr);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const bestYield = Math.max(...strategies.map(s => s.apy || 0), 0);

  return (
    <div className="flex flex-col gap-8 fade-in">
      {/* Section 1 - Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/5 border-white/10 shadow-xl shadow-blue-500/5">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Aggregate Liquidity</p>
            <h3 className="text-3xl font-black text-blue-400">
              {totalVol > 0 ? `$${totalVol.toFixed(1)}M` : 'Loading...'}
            </h3>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <p className="text-[10px] text-purple-400/70 font-bold uppercase tracking-widest mb-2">PrivyFi Benchmark</p>
            <h3 className="text-3xl font-black text-purple-400 flex items-center gap-2">
              <Activity size={24} /> {bestYield.toFixed(1)}% APY
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Risk protocols</p>
            <h3 className="text-xl font-black text-white">
              Poly + Kalshi + Mani + Meta
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Section 2 - Search & Controls */}
      <div className="bg-[#0d0d12] p-4 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-10 shadow-2xl">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search contracts or risk sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-gray-600 font-medium"
            />
          </div>
          <Button 
            onClick={fetchMarkets} 
            disabled={loading}
            className="w-10 h-10 rounded-xl bg-white/5 border-white/5 hover:bg-white/10 text-white"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Section 3 - Source Filter Tabs */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-gray-500 py-2 mr-2 uppercase tracking-tighter">Protocol:</span>
          {['All', 'Polymarket', 'Kalshi', 'Manifold', 'Metaculus'].map((filter) => (
            <Button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              variant={activeFilter === filter ? 'default' : 'outline'}
              className={`rounded-full px-5 h-9 text-xs font-bold transition-all border ${
                activeFilter === filter 
                ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20 hover:bg-blue-600' 
                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Section 4 - Market Cards */}
      <div className="flex flex-col gap-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-gray-500 font-medium italic">Scanning global risk markets...</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="py-20 text-center text-gray-500 italic bg-white/5 rounded-3xl border border-dashed border-white/10">
            No active contracts found for "{searchQuery}"
          </div>
        ) : (
          filteredMarkets.map((market, i) => {
            const longOutcome = market.outcomes.find((o: any) => o.name === 'Yes' || o.name === 'Long') || market.outcomes[0];
            const shortOutcome = market.outcomes.find((o: any) => o.name === 'No' || o.name === 'Short') || market.outcomes[1];
            
            const price = longOutcome?.price || 0.5;
            const impliedOdds = (1 / price).toFixed(2) + 'x';
            const roiIfCorrect = ((1 / price - 1) * 100).toFixed(0) + '%';
            
            const isAnalyzing = analyzingIds.has(market.id || market.title);

            return (
              <div key={i} className="bg-[#1c1c1c] rounded-2xl border border-white/5 p-5 flex flex-col gap-4 hover:border-white/10 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-white leading-snug">{market.title}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="bg-white/10 hover:bg-white/10 text-gray-300 border-none px-3 py-1 font-bold">{market.protocol}</Badge>
                    
                    {longOutcome && (
                      <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-bold flex items-center gap-2">
                        <span>{longOutcome.name === 'Yes' ? 'YES' : 'LONG'}</span>
                        <span>{(longOutcome.price * 100).toFixed(0)}¢</span>
                      </div>
                    )}
                    
                    {shortOutcome && (
                      <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold flex items-center gap-2">
                        <span>{shortOutcome.name === 'No' ? 'SHORT' : 'NO'}</span>
                        <span>{(shortOutcome.price * 100).toFixed(0)}¢</span>
                      </div>
                    )}

                    <Button 
                      onClick={() => handleAnalyze(market)}
                      disabled={isAnalyzing}
                      className="ml-2 bg-purple-600 hover:bg-purple-500 text-white font-bold h-7 text-xs px-4 rounded-lg"
                    >
                      {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} className="mr-1" />}
                      Analyze
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-gray-500">
                  <span>Liquidity: <span className="text-white font-bold">{market.volume}</span></span>
                  {market.daysLeft !== undefined && (
                    <span>Closes: <span className="text-white font-bold">T-{market.daysLeft}d</span></span>
                  )}
                  <span>ROI: <span className="text-green-400 font-bold">+{roiIfCorrect}</span></span>
                  <span>Payout: <span className="text-white font-bold">{impliedOdds}</span></span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Section 5 - Vote Result Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-[#0d0d12] border-white/10 text-white p-0 overflow-hidden">
          {selectedMarket && (
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-black leading-snug pr-8">
                {selectedMarket.title}
              </DialogTitle>
              <div className="pt-2">
                <Badge className="bg-white/10 text-gray-300 border-none font-bold">
                  {selectedMarket.protocol}
                </Badge>
              </div>
            </DialogHeader>
          )}

          <ScrollArea className="max-h-[80vh] p-6 pt-4">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <Loader2 className="animate-spin text-purple-500" size={48} />
                <h4 className="font-bold text-lg text-white">Running deep AI swarm analysis...</h4>
                <p className="text-sm text-gray-500">Searching the web + 4 models voting...</p>
              </div>
            ) : analysisResult && analysisResult.ok ? (
              <div className="space-y-5 animate-in fade-in zoom-in duration-300">

                {/* 1. Consensus Verdict */}
                <div className="space-y-2">
                  <h2 className={`text-4xl font-black tracking-tight ${
                    analysisResult.consensusVote === 'YES' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {analysisResult.consensus}
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-black/40 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${analysisResult.consensusVote === 'YES' ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${analysisResult.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-bold flex-shrink-0">{analysisResult.confidence}% confidence</span>
                  </div>
                </div>

                <Separator className="bg-white/5" />

                {/* 2. Live Research */}
                {analysisResult.research ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                      <Globe size={13} /> LIVE RESEARCH
                    </h4>
                    {analysisResult.research.summary && (
                      <p className="text-xs text-gray-400 italic">{analysisResult.research.summary}</p>
                    )}
                    <div className="space-y-2">
                      {(analysisResult.research.bullets || []).map((b: any, idx: number) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 pl-3 border-l-2 ${b.leansNo ? 'border-green-500/60' : 'border-red-500/60'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-300">{b.text}</span>
                            {b.source && (
                              <a
                                href={b.sourceUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-[10px] text-gray-600 hover:text-blue-400 transition-colors inline-flex items-center gap-1 flex-shrink-0"
                              >
                                {b.source} <ExternalLink size={9} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Key Signal Tags */}
                    {(analysisResult.research.signals || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(analysisResult.research.signals as string[]).map((sig, idx) => (
                          <Badge
                            key={idx}
                            className="bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold rounded-full px-3 py-1"
                          >
                            {sig}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">No live data available — models used training data only.</p>
                )}

                <Separator className="bg-white/5" />

                {/* 3. AI Jury — compact */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <User size={13} /> AI JURY
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {analysisResult.votes.map((v: any, idx: number) => (
                      <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-lg flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white">{v.model}</span>
                          <Badge className={`text-[10px] border-none font-black px-2 py-0.5 ${
                            v.vote === 'YES' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {v.vote} · {v.confidence}%
                          </Badge>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">"{v.reasoning}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Risk Warning */}
                <div className="flex items-center gap-2 text-orange-400 bg-orange-500/5 border border-orange-500/15 px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} className="shrink-0" />
                  <p className="text-xs font-medium">{analysisResult.riskWarning}</p>
                </div>

                {/* 5. CTA */}
                <div className="flex gap-3 pt-1">
                  <a
                    href={selectedMarket?.protocolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 font-black py-3.5 rounded-xl transition-colors text-sm"
                  >
                    Bet YES <ExternalLink size={14} />
                  </a>
                  <a
                    href={selectedMarket?.protocolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-black py-3.5 rounded-xl transition-colors text-sm"
                  >
                    Bet NO <ExternalLink size={14} />
                  </a>
                </div>

              </div>
            ) : (
              <div className="py-10 text-center text-red-400">
                Failed to analyze this market. Please try again.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
