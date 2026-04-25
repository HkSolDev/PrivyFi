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

export default function DashboardView() {
  const { data, loading } = usePortfolio();

  const totalValue = data?.attributes?.total?.positions ? `$${data.attributes.total.positions.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00';
  const positionsCount = data?.attributes?.positions?.length || 0;

  return (
    <div className="flex flex-col gap-8 fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Total Value Locked" 
          value="$0.00" 
          change="---" 
          trend="neutral"
          className="purple-glow"
        />
        <StatCard 
          label="Total Net Worth" 
          value={loading ? "Loading..." : totalValue} 
          change={loading ? "..." : "+0.00%"} 
          trend="neutral"
        />
        <StatCard 
          label="Yield Strategies" 
          value={loading ? "..." : `${positionsCount} Active`} 
          change="Stable" 
          trend="neutral"
        />
      </div>

      {/* Chart Section */}
      <div className="glass-card h-[350px] flex items-center justify-center purple-glow">
        <p className="text-gray-500 italic font-medium">Portfolio Performance Chart Integration Coming Soon...</p>
      </div>

      {/* Yield Section */}
      <div className="glass-card !p-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold">Top Yield Opportunities</h3>
          <button className="text-sm text-purple-400 font-bold hover:underline tracking-tight">View All</button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
            Scanning Kamino and Jupiter for best APYs...
          </div>
        </div>
      </div>
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
    <div className={`glass-card p-6 group hover:scale-[1.02] transition-all ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{label}</p>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
          trend === 'up' ? 'bg-green-500/10 text-green-400' : trend === 'down' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'
        }`}>
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
          {change}
        </div>
      </div>
      <h3 className="text-2xl font-black tracking-tight">{value}</h3>
    </div>
  );
}
