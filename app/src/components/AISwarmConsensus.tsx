import React from 'react';
import { useAISwarm } from '@/hooks/useAISwarm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Zap, AlertCircle, Loader2, Users, Cpu, Code, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AISwarmConsensus() {
  const { runSwarmAnalysis, result, loading, error } = useAISwarm();

  const categories = [
    { id: 'all', label: 'All', icon: <Users size={12} /> },
    { id: 'Strong', label: 'Strong', icon: <Brain size={12} /> },
    { id: 'Fast', label: 'Fast', icon: <Zap size={12} /> },
    { id: 'Coding', label: 'Coding', icon: <Code size={12} /> },
  ];

  const getFilteredVotes = (cat: string) => {
    if (!result) return [];
    if (cat === 'all') return result.votes;
    return (result.votes as any[]).filter(v => v.category === cat);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Cpu size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white">AI Swarm</h3>
            <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">20+ Model Consensus</p>
          </div>
        </div>
        <button 
          onClick={() => runSwarmAnalysis()}
          disabled={loading}
          className={cn(
            "px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2",
            loading && "animate-pulse"
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {loading ? "Voting..." : "Run Analysis"}
        </button>
      </div>

      <ScrollArea className="flex-1 pr-4">
        {loading && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-3">
              <Loader2 className="animate-spin text-purple-400" size={18} />
              <p className="text-sm text-gray-400">Requesting votes from 21 models parallelly...</p>
            </div>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white/5 border-white/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="flex flex-col items-center justify-center h-[40vh] text-center px-4">
            <Cpu size={48} className="text-white/10 mb-4" />
            <h4 className="text-white font-medium mb-2">Swarm Ready</h4>
            <p className="text-sm text-gray-500">Run a massive 20+ model consensus to find the ultimate yield opportunity on Solana.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 text-red-400 text-sm">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/10 border-purple-500/30">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardDescription className="text-purple-300 font-bold uppercase text-[10px] tracking-tighter">Swarm Consensus Winner</CardDescription>
                    <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-gray-400">
                        {(result as any).activeVotes}/{(result as any).totalVoters} Online
                    </Badge>
                </div>
                <CardTitle className="text-2xl text-white flex items-center justify-between mt-1">
                  {result.winner}
                  <Badge className="bg-purple-500">{result.consensusRatio}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Agreement Strength</span>
                    <span>{Math.round((parseInt(result.consensusRatio.split('/')[0]) / parseInt(result.consensusRatio.split('/')[1])) * 100)}%</span>
                  </div>
                  <Progress value={(parseInt(result.consensusRatio.split('/')[0]) / parseInt(result.consensusRatio.split('/')[1])) * 100} className="h-1 bg-white/10" />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="bg-white/5 border-white/5 w-full grid grid-cols-4 h-9">
                {categories.map(cat => (
                  <TabsTrigger 
                    key={cat.id} 
                    value={cat.id} 
                    className="text-[10px] flex items-center gap-1.5 data-[state=active]:bg-purple-500"
                  >
                    {cat.icon}
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {categories.map(cat => (
                <TabsContent key={cat.id} value={cat.id} className="mt-4 space-y-4">
                  {getFilteredVotes(cat.id).map((vote: any, i: number) => (
                    <Card key={i} className="bg-white/5 border-white/5 hover:border-white/10 transition-colors">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white uppercase">
                              {vote.category[0]}
                            </div>
                            <span className="text-sm font-bold text-white capitalize">{vote.model}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                            {vote.confidence}% Conf.
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 italic">"{vote.reason}"</p>
                        <div className="flex items-center gap-2 pt-1">
                          <ShieldCheck size={12} className={cn(vote.vote === result.winner ? "text-green-500" : "text-gray-500")} />
                          <span className={cn("text-[10px] font-medium", vote.vote === result.winner ? "text-green-500" : "text-gray-500")}>
                            {vote.vote}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
