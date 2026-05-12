'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Target, Activity, Crosshair, ChevronUp, ChevronDown, Zap, AlertCircle, RefreshCw, Wallet, Clock, Users, Trophy, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePredictionMarket } from '@/hooks/usePredictionMarket';
import { useWalletSession } from '@solana/react-hooks';
import { toast } from 'sonner';
import PerformanceChart from '@/components/PerformanceChart';

const PYTH_SOL_USD = 'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLREK5kEXs2Nd';
const PYTH_SOL_FEED_ID = 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
const DEVNET_USDC_MINT = process.env.NEXT_PUBLIC_FAKE_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const ROUND_DURATION = 60;
const PREDICTION_WINDOW = 30;
const PRICE_HISTORY_LENGTH = 60;

interface PricePoint { time: number; price: number }

async function fetchSolPrice(): Promise<number> {
  try {
    const res = await fetch('/api/price/pyth', { cache: 'no-store' });
    const data = await res.json();
    return data.price || 150;
  } catch { return 150; }
}

function formatPrice(p: number): string {
  return p.toFixed(2);
}

function getCurrentRoundEnd(): { roundId: number; endsAt: number; timeLeft: number } {
  const now = Date.now();
  const roundStart = Math.floor(now / (ROUND_DURATION * 1000)) * ROUND_DURATION * 1000;
  const roundEnd = roundStart + ROUND_DURATION * 1000;
  const roundId = Math.floor(now / (ROUND_DURATION * 1000));
  return {
    roundId,
    endsAt: roundEnd,
    timeLeft: Math.max(0, Math.ceil((roundEnd - now) / 1000)),
  };
}

export default function PredictView() {
  const session = useWalletSession();
  const address = session?.account.address;
  const { placePrediction, claimPrediction, isSending, error: txError } = usePredictionMarket();

  const [predictionPrice, setPredictionPrice] = useState('150.00');
  const [livePrice, setLivePrice] = useState<number>(150);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [priceLoading, setPriceLoading] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'forecast' | 'predicting' | 'placed' | 'locked' | 'resolved'>('idle');
  const [roundError, setRoundError] = useState<string | null>(null);
  const [lastPrediction, setLastPrediction] = useState<number | null>(null);
  const [settlementPrice, setSettlementPrice] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [roundId, setRoundId] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'won' | 'lost'>('idle');
  const [payoutAmount, setPayoutAmount] = useState<number | null>(null);
  const predictedRoundRef = useRef<number>(0);

  // ── Fetch initial price ──────────────────────────────────
  useEffect(() => {
    fetchSolPrice().then(price => {
      setLivePrice(price);
      setPredictionPrice(price.toFixed(2));
      setPriceLoading(false);
      const history: PricePoint[] = [];
      for (let i = PRICE_HISTORY_LENGTH; i > 0; i--) {
        history.push({
          time: Date.now() - i * 2000,
          price: price + (Math.random() - 0.5) * 2,
        });
      }
      setPriceHistory(history);
    });
  }, []);

  // ── Poll live price every 2s ─────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const price = await fetchSolPrice();
      setLivePrice(price);
      setPriceHistory(prev => [...prev.slice(-PRICE_HISTORY_LENGTH), { time: Date.now(), price }]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ── Global timer sync ─────────────────────────────────────
  // Every second, recalculate time left in the current minute.
  // All tabs see the EXACT same countdown because it's based
  // on the same global timestamp, not a local start time.
  useEffect(() => {
    const tick = () => {
      const { roundId: rid, timeLeft: tl } = getCurrentRoundEnd();
      setRoundId(rid);
      setTimeLeft(tl);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Auto-detect market state ─────────────────────────────
  useEffect(() => {
    if (phase === 'placed' && timeLeft <= 0) {
      setPhase('locked');
      setSettlementPrice(livePrice);
      setTimeout(() => setPhase('resolved'), 4000);
    }
  }, [timeLeft, phase, livePrice]);

  // ── Auto-claim on resolve ───────────────────────────────
  useEffect(() => {
    if (phase !== 'resolved' || claimState !== 'idle' || !lastPrediction) return;

    const autoClaim = async () => {
      const claimRound = predictedRoundRef.current;
      if (!claimRound) return;
      setClaimState('claiming');
      try {
        const sig = await claimPrediction(PYTH_SOL_USD, claimRound);
        if (sig) {
          setClaimState('won');
          toast.success('You won! Payout sent to your wallet.');
        }
      } catch (err: any) {
        const msg = err?.message || '';
        if (
          msg.includes('NotAWinner') ||
          msg.includes('NoPayout') ||
          msg.includes('no record of a prior credit')
        ) {
          setClaimState('lost');
          toast('You lost this round. Better luck next time!');
        } else if (
          msg.includes('AlreadyClaimed')
        ) {
          setClaimState('won');
        } else {
          setClaimState('lost');
        }
      }
    };
    autoClaim();
  }, [phase, claimState, lastPrediction, claimPrediction]);

  // ── Handlers ─────────────────────────────────────────────
  const handleStartRound = useCallback(() => {
    if (!address) { toast.error('Connect your wallet first'); return; }
    const { timeLeft: tl } = getCurrentRoundEnd();
    if (tl <= PREDICTION_WINDOW) { toast.error('This round is already settling. Wait for the next one.'); return; }
    setPhase('forecast');
    setRoundError(null);
    setLastPrediction(null);
    setSettlementPrice(null);
    setClaimState('idle');
    setPayoutAmount(null);
  }, [address]);

  const handlePredict = useCallback(async () => {
    if (!address) { toast.error('Connect your wallet first'); return; }
    const { timeLeft: tl } = getCurrentRoundEnd();
    if (tl <= PREDICTION_WINDOW) { toast.error('Predictions closed! Wait for next round.'); return; }

    const price = parseFloat(predictionPrice);
    if (isNaN(price) || price < 50 || price > 500) {
      setRoundError('Price must be between $50 and $500');
      return;
    }

    setPhase('predicting');
    setRoundError(null);

    const bucket = Math.max(0, Math.min(99, Math.floor((price - 50) / 4.5)));
    const amount = BigInt(1_000_000); // 1 USDC (6 decimals)

    try {
      const sig = await placePrediction(PYTH_SOL_USD, roundId, bucket, amount);
      if (sig) {
        setLastPrediction(price);
        predictedRoundRef.current = roundId;
        setParticipantCount(prev => prev + 1);
        setPhase('placed');
        setClaimState('idle');
        setPayoutAmount(null);
        toast.success(`Prediction locked! Round #${roundId}`);
      }
    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Transaction failed';
      if (
        msg.includes('0x1') ||
        msg.includes('custom program error') ||
        msg.includes('Attempt to debit') ||
        msg.includes('no record of a prior credit')
      ) {
        setRoundError('Insufficient USDC balance. Get devnet tokens from the faucet below.');
      } else if (msg.includes('User rejected')) {
        setRoundError('Signature cancelled in wallet.');
      } else if (msg.includes('BettingWindowClosed')) {
        setRoundError('This round just closed. Try the next one!');
      } else {
        setRoundError(`Error: ${msg.slice(0, 120)}`);
      }
      setPhase('forecast');
    }
  }, [address, predictionPrice, roundId, placePrediction]);

  const handleFaucet = useCallback(async () => {
    if (!address) { toast.error('Connect your wallet first'); return; }
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAddress: address, mintAddress: DEVNET_USDC_MINT }),
      });
      const data = await res.json();
      if (data.signature) toast.success('Got devnet USDC from faucet!');
      else toast.error(data.error || 'Faucet failed');
    } catch { toast.error('Faucet request failed'); }
  }, [address]);

  const priceNum = parseFloat(predictionPrice) || 150;
  const bucketIndex = Math.max(0, Math.min(99, Math.floor((priceNum - 50) / 4.5)));
  const isRoundActive = timeLeft > PREDICTION_WINDOW;
  const predictionTimeLeft = Math.max(0, timeLeft - PREDICTION_WINDOW);

  if (priceLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-8">

      {/* ── Header - Live Pyth Price + Global Timer ──────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-black">
            <Target className="text-emerald-400" size={22} />
            SOL Price Prediction
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Round #{roundId} &middot; {PREDICTION_WINDOW}s to predict &middot; Settled by Pyth oracle
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">SOL/USD</p>
            <p className="text-2xl font-black font-mono text-emerald-400">
              ${formatPrice(livePrice)}
            </p>
          </div>
          <div className={cn(
            "text-center p-2.5 rounded-xl border min-w-[80px]",
            isRoundActive
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : timeLeft > 0
                ? 'border-orange-500/30 bg-orange-500/5'
                : 'border-red-500/30 bg-red-500/5'
          )}>
            <p className={cn(
              "text-[9px] font-bold uppercase tracking-widest",
              isRoundActive ? 'text-emerald-400' : timeLeft > 0 ? 'text-orange-400' : 'text-red-400'
            )}>
              {isRoundActive ? 'Predict' : timeLeft > 0 ? 'Settling' : 'Closed'}
            </p>
            <p className={cn(
              "text-2xl font-black font-mono",
              isRoundActive ? 'text-emerald-400' : timeLeft > 0 ? 'text-orange-400' : 'text-red-400'
            )}>
              {isRoundActive
                ? predictionTimeLeft.toString().padStart(2, '0')
                : timeLeft > 0
                  ? timeLeft.toString().padStart(2, '0')
                  : '00'
              }
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Predict Card ─────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-0">

          {/* ── Chart (Recharts line, dashboard-style) ───── */}
          <div className="relative h-56 sm:h-64 w-full border-b border-border/20 bg-card/40">
            <PerformanceChart 
              data={priceHistory.map((p, i) => ({
                name: `${i}s`,
                value: p.price,
              }))}
            />
            {/* Prediction marker overlay */}
            {phase !== 'idle' && (
              <div className="absolute top-0 bottom-8 w-px bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.3)] z-10 pointer-events-none"
                style={{ left: `${((priceNum - 50) / 450) * 100}%` }}
              >
                <div className="absolute -top-0.5 -translate-x-1/2 bg-emerald-500/90 text-black text-[9px] font-black px-1 py-0.5 rounded whitespace-nowrap">
                  ${formatPrice(priceNum)}
                </div>
              </div>
            )}
            {/* Live price marker */}
            <div className="absolute top-0 bottom-8 w-px bg-orange-400/50 z-20 pointer-events-none"
              style={{ left: `${((livePrice - 50) / 450) * 100}%` }}
            >
              <div className="absolute bottom-0 -translate-x-1/2 translate-y-full mt-0.5 bg-orange-500/90 text-black text-[9px] font-black px-1 py-0.5 rounded whitespace-nowrap">
                ${formatPrice(livePrice)}
              </div>
              <div className="absolute top-4 -translate-x-1/2 w-3 h-3 bg-orange-400/20 rounded-full animate-ping" />
              <div className="absolute top-4 -translate-x-1/2 w-1 h-1 bg-orange-400 rounded-full" />
            </div>
            {/* Live badge */}
            <div className="absolute top-2 right-3 flex items-center gap-1 z-30">
              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[8px] text-emerald-400/50 font-bold uppercase tracking-wider">LIVE</span>
            </div>
          </div>

          {/* ── Controls ─────────────────────────────────── */}
          <div className="p-4 sm:p-6 space-y-5">

            {/* ── IDLE: Market closed ────────────────────────── */}
            {phase === 'idle' && (
              <div className="text-center py-10 space-y-5">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                  isRoundActive ? 'bg-emerald-500/10' : timeLeft > 0 ? 'bg-orange-500/10' : 'bg-white/5'
                )}>
                  {isRoundActive
                    ? <Clock size={30} className="text-emerald-400" />
                    : timeLeft > 0
                      ? <Crosshair size={30} className="text-orange-400" />
                      : <Crosshair size={30} className="text-muted-foreground" />
                  }
                </div>
                <div>
                  {isRoundActive ? (
                    <>
                      <h3 className="text-xl font-black">Predictions Open</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Predict SOL price &mdash; {predictionTimeLeft}s left to enter
                      </p>
                  <p className="text-xs text-muted-foreground mt-3">
                        Entry: <span className="font-bold text-emerald-400">1 USDC</span>
                        &middot; Predict SOL price via Pyth oracle
                        &middot; Closest wins
                      </p>
                    </>
                  ) : timeLeft > 0 ? (
                    <>
                      <h3 className="text-xl font-black">Settling</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Predictions closed. Pyth oracle settling &mdash; {timeLeft}s remaining
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-black">Round Ended</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Next round starts in {ROUND_DURATION - PREDICTION_WINDOW}s
                      </p>
                    </>
                  )}
                </div>
                <Button
                  onClick={handleStartRound}
                  disabled={!isRoundActive}
                  className={cn(
                    "h-12 px-8 font-black rounded-xl",
                    isRoundActive
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'bg-white/10 text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isRoundActive ? (
                    <><Zap size={18} className="mr-2" /> Predict SOL Price</>
                  ) : timeLeft > 0 ? 'Settling...' : 'Round Ended'}
                </Button>

                <div className="flex justify-center gap-6 text-xs text-muted-foreground">
                  <span>Bet: 1 USDC</span>
                  <span>Every 60s</span>
                  <span>Win up to ~20x</span>
                </div>
              </div>
            )}

            {/* ── PLACED: waiting for round end ──────────── */}
            {phase === 'placed' && (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-500/10">
                  <Target size={30} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Prediction Locked!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You predicted <span className="text-emerald-400 font-bold">${formatPrice(lastPrediction || 0)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Waiting for round to end &mdash; {timeLeft}s remaining
                  </p>
                </div>
                <div className="w-full max-w-xs mx-auto h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(timeLeft / ROUND_DURATION) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  1 USDC locked &middot; Auto-settling at round end
                </p>
              </div>
            )}

            {/* ── FORECAST / PREDICTING ──────────────────── */}
            {(phase === 'forecast' || phase === 'predicting') && (
              <>
                {/* Global countdown bar */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(predictionTimeLeft / PREDICTION_WINDOW) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0 w-8 text-right">
                    {predictionTimeLeft}s
                  </span>
                </div>

                {/* Price input */}
                <div>
                  <label className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 block">
                    Your Price Prediction
                  </label>
                  <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0"
                    onClick={() => setPredictionPrice(prev => Math.max(50, (parseFloat(prev) || 150) - 1).toFixed(2))}
                    disabled={phase === 'predicting' || lastPrediction !== null}
                  >
                    <ChevronDown size={16} />
                  </Button>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={predictionPrice}
                      onChange={(e) => setPredictionPrice(e.target.value)}
                      onBlur={() => {
                        const v = parseFloat(predictionPrice);
                        if (isNaN(v)) setPredictionPrice('150.00');
                        else setPredictionPrice(Math.max(50, Math.min(500, v)).toFixed(2));
                      }}
                      className="w-full h-11 bg-black/40 border border-border rounded-lg text-center text-lg font-bold font-mono text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50 pl-6"
                      disabled={phase === 'predicting' || lastPrediction !== null}
                    />
                  </div>
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0"
                    onClick={() => setPredictionPrice(prev => Math.min(500, (parseFloat(prev) || 150) + 1).toFixed(2))}
                    disabled={phase === 'predicting' || lastPrediction !== null}
                  >
                      <ChevronUp size={16} />
                    </Button>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[0.5, 1, 2, 5, 10].map(step => (
                      <button key={step}
                        onClick={() => setPredictionPrice(prev => Math.min(500, (parseFloat(prev) || 150) + step).toFixed(2))}
                        disabled={phase === 'predicting'}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-border/50 rounded-md text-[10px] font-bold text-muted-foreground transition-colors disabled:opacity-30"
                      >
                        +${step.toFixed(step >= 1 ? 0 : 2)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bucket + Stats */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden flex">
                    {Array.from({ length: 20 }, (_, i) => (
                      <div key={i}
                        className={cn('flex-1', Math.floor(bucketIndex / 5) === i ? 'bg-emerald-500' : '')}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono shrink-0">Bucket #{bucketIndex}</span>
                  <span className="text-[9px] text-muted-foreground font-mono shrink-0">Round #{roundId}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-black/30 border border-border/30 rounded-lg p-2.5">
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Entry</p>
                    <p className="text-sm font-bold font-mono">1 USDC</p>
                  </div>
                  <div className="bg-black/30 border border-border/30 rounded-lg p-2.5">
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Max Win</p>
                    <p className="text-sm font-bold font-mono text-emerald-400">~20 USDC</p>
                  </div>
                  <div className="bg-black/30 border border-border/30 rounded-lg p-2.5">
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Bucket</p>
                    <p className="text-sm font-bold font-mono">#{bucketIndex}</p>
                  </div>
                </div>

                {/* CTA */}
                {phase === 'predicting' ? (
                  <div className="flex items-center justify-center gap-3 py-3">
                    <Loader2 className="animate-spin text-emerald-400" size={18} />
                    <span className="text-sm text-muted-foreground">Confirm in wallet...</span>
                  </div>
                ) : (
                  <Button onClick={handlePredict}
                    disabled={!isRoundActive || lastPrediction !== null}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-base transition-all active:scale-[0.98] disabled:opacity-30"
                  >
                    {lastPrediction ? 'Already Predicted' : <><Zap size={18} className="mr-2" /> Predict 1 USDC</>}
                  </Button>
                )}

                {/* Error */}
                {roundError && (
                  <div className="text-sm text-red-400 text-center bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
                    <p>{roundError}</p>
                    {roundError.includes('balance') && (
                      <Button onClick={handleFaucet} variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                        <Wallet size={14} className="mr-1" /> Get Devnet USDC
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── LOCKED ───────────────────────────────────── */}
            {phase === 'locked' && (
              <div className="text-center py-10 space-y-4">
                <div className="relative inline-flex">
                  <Crosshair size={44} className="text-orange-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Round Locked</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You predicted <span className="text-emerald-400 font-bold">${formatPrice(lastPrediction || 0)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Current SOL: <span className="font-mono">${formatPrice(livePrice)}</span>
                    &middot; Pyth oracle settlement pending...
                  </p>
                </div>
                <div className="w-40 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}

            {/* ── RESOLVED ──────────────────────────────────── */}
            {phase === 'resolved' && (
              <div className="text-center py-10 space-y-5">
                {claimState === 'claiming' ? (
                  <>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-orange-500/10">
                      <Loader2 className="animate-spin text-orange-400" size={30} />
                    </div>
                    <h3 className="text-xl font-black">Checking Your Result...</h3>
                    <p className="text-sm text-muted-foreground">Settling your prediction with the oracle.</p>
                  </>
                ) : claimState === 'won' ? (
                  <>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-500/15">
                      <Trophy size={30} className="text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-black text-emerald-400">You Won! </h3>
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Your Guess</p>
                        <p className="text-xl font-black font-mono">${formatPrice(lastPrediction || 0)}</p>
                      </div>
                      <div className="text-muted-foreground/30 text-lg">vs</div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Actual</p>
                        <p className="text-xl font-black font-mono text-emerald-400">${formatPrice(settlementPrice || livePrice)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Payout sent to your wallet! Check your balance.</p>
                  </>
                ) : claimState === 'lost' ? (
                  <>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-red-500/10">
                      <Activity size={30} className="text-red-400" />
                    </div>
                    <h3 className="text-xl font-black text-red-400">You Lost</h3>
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Your Guess</p>
                        <p className="text-xl font-black font-mono">${formatPrice(lastPrediction || 0)}</p>
                      </div>
                      <div className="text-muted-foreground/30 text-lg">vs</div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Actual</p>
                        <p className="text-xl font-black font-mono text-emerald-400">${formatPrice(settlementPrice || livePrice)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Better luck next round!</p>
                  </>
                ) : (
                  <>
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                      lastPrediction && settlementPrice && Math.abs(lastPrediction - settlementPrice) < 2
                        ? 'bg-emerald-500/15' : 'bg-white/5'
                    )}>
                      <Activity size={30} className={cn(
                        lastPrediction && settlementPrice && Math.abs(lastPrediction - settlementPrice) < 2
                          ? 'text-emerald-400' : 'text-muted-foreground'
                      )} />
                    </div>
                    <h3 className="text-xl font-black">Round Complete</h3>
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Your Guess</p>
                        <p className="text-xl font-black font-mono">${formatPrice(lastPrediction || 0)}</p>
                      </div>
                      <div className="text-muted-foreground/30 text-lg">vs</div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Actual</p>
                        <p className="text-xl font-black font-mono text-emerald-400">${formatPrice(settlementPrice || livePrice)}</p>
                      </div>
                    </div>
                  </>
                )}
                <Button onClick={() => {
                  setPhase('idle');
                  setLastPrediction(null);
                  setSettlementPrice(null);
                  setClaimState('idle');
                  setPayoutAmount(null);
                }} className="bg-white/10 hover:bg-white/20 text-white h-11 px-6 rounded-xl font-bold">
                  <RefreshCw size={14} className="mr-2" /> Next Round
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Faucet ────────────────────────────────────────── */}
      {address && (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold">Get devnet USDC</p>
              <p className="text-[10px] text-muted-foreground truncate">Faucet mints 10 USDC for testing predictions</p>
            </div>
            <Button onClick={handleFaucet} variant="outline" size="sm" className="shrink-0">
              <Wallet size={14} className="mr-1.5" /> Faucet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── How it works ──────────────────────────────────── */}
      <Card className="border-border/20 bg-card/30">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="space-y-1.5">
              <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center mx-auto">
                <Target size={16} className="text-emerald-400" />
              </div>
              <p className="text-xs font-bold">1. Predict</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Set your price and pay 1 USDC entry</p>
            </div>
            <div className="space-y-1.5">
              <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center mx-auto">
                <Clock size={16} className="text-emerald-400" />
              </div>
              <p className="text-xs font-bold">2. Wait 60s</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Round ends, Pyth oracle sets real price</p>
            </div>
            <div className="space-y-1.5">
              <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center mx-auto">
                <BarChart3 size={16} className="text-emerald-400" />
              </div>
              <p className="text-xs font-bold">3. Median Cutoff</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Winners = error less than median</p>
            </div>
            <div className="space-y-1.5">
              <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center mx-auto">
                <Trophy size={16} className="text-emerald-400" />
              </div>
              <p className="text-xs font-bold">4. Convex Payout</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Closer guesses earn exponentially more</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
