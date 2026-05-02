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
    if (analyses.has(marketId) || analyzingIds.has(marketId)) return;

    setAnalyzingIds(prev => new Set(prev).add(marketId));

    try {
      const res = await fetch('/api/predict-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: market,
          context: strategies.slice(0, 5)
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAnalyses(prev => {
          const newMap = new Map(prev);
          newMap.set(marketId, data.analysis);
          return newMap;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
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

  return (
    <div className="flex flex-col gap-8 fade-in">
      {/* Section 1 - Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Total Predictions Vol</p>
            <h3 className="text-3xl font-black text-blue-400">
              {totalVol > 0 ? `$${totalVol.toFixed(1)}M` : 'Loading...'}
            </h3>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <p className="text-[10px] text-purple-400/70 font-bold uppercase tracking-widest mb-2">Active AI Swarms</p>
            <h3 className="text-3xl font-black text-purple-400 flex items-center gap-2">
              <Brain size={24} /> 7 Models
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Active Protocols</p>
            <h3 className="text-xl font-black text-white">
              Poly + Kalshi + Manifold + Meta
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
              placeholder="Search markets or protocols..."
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
          <span className="text-xs font-bold text-gray-500 py-2 mr-2">Protocol:</span>
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
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-gray-500 py-2 mr-2">Category:</span>
          {['All', 'Politics', 'Crypto', 'Sports', 'Finance', 'Other'].map((cat) => (
            <Button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              variant={activeCategory === cat ? 'default' : 'outline'}
              className={`rounded-full px-5 h-9 text-xs font-bold transition-all border ${
                activeCategory === cat 
                ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20 hover:bg-purple-600' 
                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Section 4 - Market Cards */}
      <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-gray-500 font-medium">Aggregating Polymarket, Kalshi, and Drift...</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="py-20 text-center text-gray-500 italic bg-white/5 rounded-3xl border border-dashed border-white/10">
            No markets found matching "{searchQuery}"
          </div>
        ) : (
          filteredMarkets.map((market, i) => {
            const marketId = market.id || market.title;
            const isAnalyzed = analyses.has(marketId);
            const isAnalyzing = analyzingIds.has(marketId);

            return (
              <Card key={i} className="bg-white/5 border-white/5 hover:bg-white/[0.07] transition-all overflow-hidden border">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 w-full md:w-auto flex-1">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center flex-shrink-0">
                        <Target size={24} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg leading-tight truncate text-white">{market.title}</h4>
                        <div className="flex flex-wrap gap-3 mt-2 items-center">
                          <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 font-bold border-none">
                            <ShieldCheck size={10} className="mr-1" /> {market.protocol}
                          </Badge>
                          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            <Activity size={12} /> Vol: <span className="text-white">{market.volume}</span>
                          </span>
                          
                          {market.daysLeft !== undefined && (
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              ⏳ Closes in {market.daysLeft} days
                            </span>
                          )}

                          {market.lowLiquidity && (
                            <Badge variant="outline" className="text-[10px] bg-orange-500/20 text-orange-400 font-bold border-none flex items-center">
                              <AlertTriangle size={10} className="mr-1" /> Low Liquidity ⚠️
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">AI SWARM PREDICTS</p>
                        <Button 
                          onClick={() => handleAnalyze(market)} 
                          disabled={isAnalyzed || isAnalyzing}
                          className={`font-bold rounded-xl shadow-lg px-6 py-2 h-auto ${
                            isAnalyzed 
                              ? 'bg-purple-900/40 text-purple-300 shadow-none' 
                              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20'
                          }`}
                        >
                          {isAnalyzing ? (
                            <><Loader2 size={16} className="animate-spin mr-2" /> Analyzing...</>
                          ) : isAnalyzed ? (
                            <><CheckCircle2 size={16} className="mr-2 text-purple-400" /> Analyzed</>
                          ) : (
                            <>Analyze <ArrowRight size={16} className="ml-2" /></>
                          )}
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        {market.outcomes.map((outcome: any, idx: number) => (
                          <div key={idx} className={`px-4 py-2 rounded-xl flex flex-col items-center justify-center min-w-[70px] ${outcome.color === 'green' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                            <span className="text-xs text-white font-bold">{outcome.name}</span>
                            <span className={`text-sm font-black ${outcome.color === 'green' ? 'text-green-400' : 'text-red-400'}`}>{(outcome.price * 100).toFixed(0)}¢</span>
                          </div>
                        ))}
                      </div>

                      <a href={market.protocolUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-bold border border-white/5">
                        Bet <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>

                  {/* Inline Analysis Result */}
                  {isAnalyzed && (
                    <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-sm text-gray-200 leading-relaxed animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start gap-3">
                        <Brain className="text-purple-400 shrink-0 mt-0.5" size={18} />
                        <div>
                          <h5 className="font-bold text-purple-400 mb-2">Yield Context Analysis</h5>
                          <div className="whitespace-pre-line space-y-2">
                            {analyses.get(marketId)?.split('\n').map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Section 5 - Vote Result Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-[#0d0d12] border-white/10 text-white p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Brain className="text-purple-400" /> AI Swarm Analysis
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[80vh] p-6 pt-4">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <Loader2 className="animate-spin text-purple-500" size={48} />
                <h4 className="font-bold text-lg text-white">Researching internet + running 7 AI models...</h4>
                <p className="text-sm text-gray-500 max-w-sm">Models are actively debating the question using real-time search context.</p>
              </div>
            ) : analysisResult && analysisResult.ok ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                {/* Consensus Banner */}
                <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${
                  analysisResult.consensus === 'YES' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Final Consensus Verdict</p>
                  <h2 className={`text-5xl font-black mb-4 ${analysisResult.consensus === 'YES' ? 'text-green-400' : 'text-red-400'}`}>
                    {analysisResult.consensus}
                  </h2>
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-xs font-bold text-white">
                      <span>Confidence</span>
                      <span>{analysisResult.confidence}%</span>
                    </div>
                    <Progress value={analysisResult.confidence} className="h-2 bg-black/40" />
                    <p className="text-[10px] text-gray-400 font-medium">Based on {analysisResult.yesCount + analysisResult.noCount} successful model votes</p>
                  </div>
                </div>

                {/* Internet Research */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <Globe size={14} /> INTERNET RESEARCH
                  </h4>
                  <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl text-sm text-gray-300 leading-relaxed italic relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/50 rounded-l-xl"></div>
                    "{analysisResult.research}"
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Individual Votes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <User size={14} /> INDIVIDUAL VOTES
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysisResult.votes.map((v: any, idx: number) => (
                      <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{v.personaName}</span>
                          <Badge variant="outline" className={`text-[10px] border-none font-bold ${
                            v.vote === 'YES' ? 'bg-green-500/20 text-green-400' : 
                            v.vote === 'NO' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {v.vote}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-gray-400">"{v.reason}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Final Summary */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                    <MessageSquare size={14} /> FINAL VERDICT
                  </h4>
                  <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl text-sm text-white font-medium leading-relaxed">
                    {analysisResult.summary}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-4 flex flex-col gap-3">
                  <a 
                    href={analysisResult.betUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-white text-black font-black py-4 rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
                  >
                    View Market on Protocol <ExternalLink size={18} />
                  </a>
                  <p className="text-center text-[10px] text-gray-500 flex items-center justify-center gap-1">
                    <AlertTriangle size={12} /> {analysisResult.disclaimer}
                  </p>
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
