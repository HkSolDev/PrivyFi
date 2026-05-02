'use client';

import { useState, useEffect } from 'react';
import { 
  Lock, 
  ArrowUpRight, 
  ExternalLink, 
  Loader2, 
  ShieldCheck, 
  Wallet,
  ArrowDownCircle,
  TrendingUp,
  Brain
} from 'lucide-react';
import { useAnchorProgram } from '@/hooks/useAnchorProgram';
import { useYield } from '@/hooks/useYield';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function VaultsView() {
  const { getUserPositions, wallet, program } = useAnchorProgram();
  const { strategies } = useYield();
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPositions() {
      if (!wallet || !program) return;
      setLoading(true);
      try {
        const userPositions = await getUserPositions();
        
        // Match positions with strategy metadata
        const enriched = userPositions.map(pos => {
          const strategy = strategies.find(s => s.name === (pos.account as any).vaultName) || {
            name: (pos.account as any).vaultName ?? 'Unknown Vault',
            protocol: 'Unknown',
            apy: '0%'
          };
          
          return {
            ...pos,
            strategy
          };
        });
        
        setPositions(enriched);
      } catch (e) {
        console.error("Failed to fetch positions:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPositions();
  }, [wallet, program, strategies]);

  const totalStaked = positions.reduce((acc, curr) => acc + (curr.account.amount.toNumber() / 1_000_000), 0);

  return (
    <div className="flex flex-col gap-8 fade-in">
      {/* Header Stat Card */}
      <Card className="bg-[#0d0d12]/40 border-white/5 p-10 relative overflow-hidden purple-glow">
        <CardContent className="p-0 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-4xl font-black mb-2 text-white">Your Active Vaults</h2>
            <p className="text-gray-400 max-w-md leading-relaxed">
              Manage your staked assets and track yield performance across multiple protocols.
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center min-w-[200px]">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Assets Staked</p>
            <p className="text-4xl font-black text-purple-400">${totalStaked.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <Badge variant="outline" className="mt-3 bg-green-500/10 text-green-400 border-green-500/20 font-black">
              LIVE YIELDING
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Positions Table */}
      <Card className="bg-[#0d0d12]/40 border-white/5">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Lock size={20} className="text-purple-400" />
            Active Staked Positions
          </CardTitle>
          <CardDescription>Real-time view of your locked liquidity in PrivyFi vaults.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
              <Loader2 className="animate-spin" size={32} />
              <p className="font-bold">Scanning Solana for your positions...</p>
            </div>
          ) : positions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-gray-500 font-black uppercase text-[10px]">Vault / Protocol</TableHead>
                  <TableHead className="text-gray-500 font-black uppercase text-[10px]">Your Stake</TableHead>
                  <TableHead className="text-gray-500 font-black uppercase text-[10px]">APY</TableHead>
                  <TableHead className="text-gray-500 font-black uppercase text-[10px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos, idx) => (
                  <TableRow key={idx} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                          <TrendingUp size={20} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{pos.strategy.name}</p>
                          <p className="text-xs text-gray-500 uppercase font-black">{pos.strategy.protocol}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-lg font-black text-white">
                        ${(pos.account.amount.toNumber() / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-lg font-black text-green-400">{pos.strategy.apy}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-white hover:bg-white/5">
                          Manage
                        </Button>
                        <Button size="sm" className="bg-white text-black font-bold hover:scale-105 active:scale-95 transition-all">
                          Withdraw
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border border-dashed border-white/10 rounded-3xl">
              <Wallet className="text-gray-700" size={48} />
              <div>
                <p className="text-lg font-bold text-gray-500">No active vaults found</p>
                <p className="text-sm text-gray-600 max-w-xs mx-auto">You haven't deposited any assets yet. Head over to the Yield tab to start earning.</p>
              </div>
              <Button variant="outline" className="border-white/10 text-gray-400 hover:text-white mt-4">
                Explore Yield Strategies
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards Center / MagicBlock Integration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#0d0d12]/40 border-white/5 p-6 border-l-4 border-l-purple-500 relative overflow-hidden">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Brain size={18} className="text-purple-400" />
              AI Governance Points
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-sm text-gray-500 mb-6">
              You are earning governance points by participating in AI Swarm consensus. These points are tracked on the MagicBlock Ephemeral Rollup.
            </p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Total Unclaimed Rewards</span>
              <span className="text-xl font-black text-white">450.00 XP</span>
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-purple-500/20">
              Commit Rewards to L1
            </Button>
          </CardContent>
          {/* Subtle background icon */}
          <ShieldCheck size={120} className="absolute -right-8 -bottom-8 opacity-5 text-purple-400 pointer-events-none" />
        </Card>

        <Card className="bg-[#0d0d12]/40 border-white/5 p-6 border-l-4 border-l-green-500 relative overflow-hidden">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-green-400">
              <ArrowDownCircle size={18} />
              Rebalance Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-sm text-gray-500 mb-6">
              The AI Swarm has detected a higher yield opportunity for your PUSD holdings on Meteora.
            </p>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 mb-6">
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Current</p>
                <p className="font-bold text-white">18.5% APY</p>
              </div>
              <ArrowUpRight size={16} className="text-gray-500" />
              <div className="flex-1">
                <p className="text-[10px] text-green-400 font-bold uppercase">Target</p>
                <p className="font-bold text-green-400">22.4% APY</p>
              </div>
            </div>
            <Button variant="outline" className="w-full border-green-500/20 hover:bg-green-500/10 text-green-400 font-bold h-12 rounded-xl">
              Optimize with AI Swarm
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
