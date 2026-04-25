'use client';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface PerformanceChartProps {
  data: any[];
  isPrivate?: boolean;
}

export default function PerformanceChart({ data, isPrivate = false }: PerformanceChartProps) {
  // Mock data if none provided
  const chartData = data || [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 2000 },
    { name: 'Thu', value: 2780 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2390 },
    { name: 'Sun', value: 3490 },
  ];

  if (isPrivate) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 rounded-3xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-0 bg-purple-500/5 backdrop-blur-3xl z-10" />
        <div className="relative z-20 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
            <span className="text-2xl">🔒</span>
          </div>
          <p className="text-gray-400 font-bold tracking-tight">Privacy Shield Active</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Portfolio details hidden from public view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(13, 13, 18, 0.9)', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              color: '#fff'
            }}
            itemStyle={{ color: '#A855F7' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#A855F7" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
