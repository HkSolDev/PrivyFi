'use client';

import { 
  TrendingUp, 
  Lock, 
  TrendingDown,
  Wallet,
  Activity,
  Loader2
} from 'lucide-react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAnchorProgram } from '@/hooks/useAnchorProgram';
import { useYield } from '@/hooks/useYield';
import { useState, useEffect } from 'react';
import PerformanceChart from '@/components/PerformanceChart';
import YieldDetailsModal from '@/components/modals/YieldDetailsModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardView() {
  const { tokens, totalValue, pricesLoading } = usePortfolio();
  const { profile } = useUserProfile();
  const { strategies, loading: yieldLoading } = useYield();
  const { getUserPositions, wallet } = useAnchorProgram();
  const [stakedValue, setStakedValue] = useState(0);

  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchStaked() {
      if (wallet) {
        const positions = await getUserPositions();
        const total = positions.reduce((acc, curr) => acc + (curr.account.amount.toNumber() / 1_000_000), 0);
        setStakedValue(total);
      }
    }
    fetchStaked();
  }, [wallet]);

  const isPrivate = profile?.privateMode || false;

  const totalValueDisplay = `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const positionsCount = tokens.length;

  const topStrategies = strategies.slice(0, 3);

  return (
    <div className="flex flex-col gap-8 fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Total Value Staked" 
          value={`$${stakedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          change="Live" 
          trend="up"
          className="purple-glow border-purple-500/20"
        />
        <StatCard 
          label="Total Net Worth" 
          value={pricesLoading ? "Loading..." : totalValueDisplay} 
          change={pricesLoading ? "..." : "+0.00%"} 
          trend="neutral"
        />
        <StatCard 
          label="Yield Strategies" 
          value={`${positionsCount} Active`} 
          change="Stable" 
          trend="neutral"
        />
      </div>

      {/* Chart Section */}
      <Card className="bg-[#0d0d12]/40 border-white/5 relative overflow-hidden purple-glow p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
            <CardDescription className="text-xs text-gray-500">Growth over the last 7 days</CardDescription>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-black text-[10px] uppercase">Live</Badge>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <PerformanceChart isPrivate={isPrivate} data={undefined as any} />
          </div>
        </CardContent>
      </Card>

      {/* Yield Section */}
      <Card className="bg-[#0d0d12]/40 border-white/5 p-4">
        <CardHeader className="flex flex-row items-center justify-between pb-8">
          <CardTitle className="text-xl font-bold">Top Yield Opportunities</CardTitle>
          <Button variant="link" className="text-sm text-purple-400 font-bold hover:underline p-0 h-auto">View All</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {yieldLoading ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-3">
              <Loader2 className="animate-spin" size={20} />
              Scanning Kamino and Jupiter for best APYs...
            </div>
          ) : topStrategies.length > 0 ? (
            topStrategies.map((strat, i) => (
              <div 
                key={i} 
                className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl transition-all gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/10 border border-purple-500/20">
                    <TrendingUp size={24} className="text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg tracking-tight text-white">{strat.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="font-bold text-gray-400">{strat.protocol}</span> • 
                      <span>TVL: {strat.tvl}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Live APY</p>
                    <p className="text-2xl font-black text-green-400">{strat.apy}</p>
                  </div>
                  <Button 
                    onClick={() => { setSelectedStrategy(strat); setIsModalOpen(true); }}
                    className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all text-sm shadow-xl"
                  >
                    Deposit
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              No yield strategies found at the moment.
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedStrategy && (
        <YieldDetailsModal 
          strategy={selectedStrategy} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function StatCard({ label, value, change, trend, className }: { 
  label: string, 
  value: string, 
  change: string, 
  trend: 'up' | 'down' | 'neutral',
  className?: string 
}) {
  return (
    <Card className={cn("bg-[#0d0d12]/40 border-white/5 p-4 group hover:scale-[1.02] transition-all", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
        <Badge variant="outline" className={cn(
          "text-[10px] font-black border-none",
          trend === 'up' ? 'bg-green-500/10 text-green-400' : trend === 'down' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'
        )}>
          {trend === 'up' ? <TrendingUp size={10} className="mr-1" /> : trend === 'down' ? <TrendingDown size={10} className="mr-1" /> : null}
          {change}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tracking-tight text-white">{value}</div>
      </CardContent>
    </Card>
  );
}
