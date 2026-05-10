'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, Activity, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePredictionMarket } from '@/hooks/usePredictionMarket';

const PYTH_SOL_USD = 'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLREK5kEXs2Nd';

export default function PredictView() {
  const { placePrediction, isSending, status, error } = usePredictionMarket();
  const [prediction, setPrediction] = useState(150); // Default $150
  const [timeLeft, setTimeLeft] = useState(30);
  const [phase, setPhase] = useState<'FORECAST' | 'RESOLUTION' | 'PAYOUT'>('FORECAST');
  const [livePrice, setLivePrice] = useState(148.50);

  // Mock live price ticking
  useEffect(() => {
    const interval = setInterval(() => {
      if (phase !== 'PAYOUT') {
        setLivePrice(prev => prev + (Math.random() * 0.4 - 0.2));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  // Handle phase transitions
  useEffect(() => {
    if (phase === 'FORECAST' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'FORECAST' && timeLeft === 0) {
      setPhase('RESOLUTION');
      setTimeLeft(30);
    } else if (phase === 'RESOLUTION' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'RESOLUTION' && timeLeft === 0) {
      setPhase('PAYOUT');
    }
  }, [timeLeft, phase]);

  const handleStake = async () => {
    try {
      // Bucket logic: Mapping $130-$170 to 0-99 buckets
      const bucket = Math.max(0, Math.min(99, Math.floor(((prediction - 130) / 40) * 100)));
      await placePrediction(PYTH_SOL_USD, bucket, BigInt(1_000_000)); // 1 USDC
    } catch (err) {
      console.error(err);
    }
  };

  const getEstimatedReward = () => {
    // Convex payout function visualization
    const errorVal = Math.abs(prediction - livePrice);
    const maxReward = 15.5; // 15.5x
    return Math.max(0, maxReward - (errorVal * 2)).toFixed(2);
  };

  return (
    <div className="flex flex-col gap-8 fade-in items-center max-w-2xl mx-auto w-full pt-4">
      {/* Header Info */}
      <div className="w-full flex justify-between items-end mb-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-2">
            <Target className="text-emerald-400" />
            1-Min Flash Pool
          </h2>
          <p className="text-zinc-400 font-medium">Predict the exact SOL price in 60 seconds.</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-black text-emerald-400">
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            {phase === 'FORECAST' ? 'Time to lock' : phase === 'RESOLUTION' ? 'Time to settle' : 'Market Closed'}
          </p>
        </div>
      </div>

      <Card className="w-full bg-[#0d0d12]/80 border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Live Chart Mockup */}
        <div className="h-64 w-full border-b border-white/5 relative bg-gradient-to-b from-transparent to-emerald-900/10">
          
          {/* Target Line (User Prediction) */}
          <div 
            className="absolute h-full w-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 transition-all duration-75"
            style={{ left: `${((prediction - 130) / 40) * 100}%` }}
          >
            <div className="absolute -top-6 -translate-x-1/2 bg-emerald-500 text-black text-xs font-black px-2 py-1 rounded-md">
              ${prediction.toFixed(2)}
            </div>
          </div>

          {/* Live Price Line */}
          <div 
            className="absolute h-full w-0.5 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] z-20 transition-all duration-300"
            style={{ left: `${((livePrice - 130) / 40) * 100}%` }}
          >
            <div className="absolute -bottom-6 -translate-x-1/2 bg-orange-500 text-black text-xs font-black px-2 py-1 rounded-md">
              ${livePrice.toFixed(2)}
            </div>
            
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center bg-orange-500/20 rounded-full w-12 h-12 animate-pulse" />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-orange-500 rounded-full w-3 h-3" />
          </div>

          {/* Absolute Error Bracket (Visible during resolution) */}
          {phase === 'RESOLUTION' && (
            <div 
              className="absolute top-1/2 h-8 border-t-2 border-dashed border-white/30 transition-all duration-300"
              style={{
                left: `${(Math.min(prediction, livePrice) - 130) / 40 * 100}%`,
                width: `${(Math.abs(prediction - livePrice) / 40) * 100}%`
              }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-400 font-mono">
                Error: ${Math.abs(prediction - livePrice).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-8 flex flex-col items-center">
          
          {phase === 'FORECAST' ? (
            <>
              {/* Prediction Slider */}
              <div className="w-full mb-8">
                <input 
                  type="range" 
                  min="130" 
                  max="170" 
                  step="0.1" 
                  value={prediction}
                  onChange={(e) => setPrediction(parseFloat(e.target.value))}
                  className="w-full appearance-none bg-zinc-800 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:[&::-webkit-slider-thumb]:scale-110 transition-transform"
                />
                <div className="flex justify-between text-[10px] font-bold text-zinc-600 uppercase mt-3">
                  <span>$130.00</span>
                  <span>$150.00</span>
                  <span>$170.00</span>
                </div>
              </div>

              {/* Action Area */}
              <div className="w-full flex items-center justify-between gap-6">
                <div className="flex-1 bg-black/40 border border-emerald-500/20 p-4 rounded-2xl">
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Max Estimated Reward</p>
                  <h3 className="text-2xl font-black text-white">{getEstimatedReward()}x</h3>
                </div>

                <Button 
                  onClick={handleStake}
                  disabled={isSending}
                  className="flex-1 h-[74px] bg-emerald-500 hover:bg-emerald-400 text-black text-xl font-black rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105 active:scale-95"
                >
                  {isSending ? 'STAKING...' : 'STAKE 1 USDC'}
                </Button>
              </div>
              {error && <p className="text-red-400 text-sm mt-4 font-mono">{(error as any).message || 'Transaction failed.'}</p>}
            </>
          ) : phase === 'RESOLUTION' ? (
            <div className="w-full text-center py-6 animate-pulse">
              <Crosshair size={48} className="mx-auto text-orange-400 mb-4 opacity-50" />
              <h3 className="text-2xl font-black text-white mb-2">Market Locked</h3>
              <p className="text-zinc-400">Waiting for final median settlement...</p>
            </div>
          ) : (
            <div className="w-full text-center py-6">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity size={40} className="text-emerald-400" />
              </div>
              <h3 className="text-3xl font-black text-emerald-400 mb-2">Payout Settled!</h3>
              <p className="text-zinc-400 mb-6">Your precision score: 840</p>
              <Button 
                onClick={() => { setPhase('FORECAST'); setTimeLeft(30); }}
                className="bg-white/10 hover:bg-white/20 text-white"
              >
                Play Next Round
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
