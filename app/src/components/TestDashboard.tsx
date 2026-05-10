'use client';

import { useState } from 'react';
import { usePredictionMarket } from '@/hooks/usePredictionMarket';

// Pyth Devnet SOL/USD Price Feed
const PYTH_SOL_USD = 'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLREK5kEXs2Nd';

export function TestDashboard() {
  const { 
    initializeMarket, 
    placePrediction, 
    resolveMarket, 
    claimPrediction,
    status,
    isSending,
    error,
    signature
  } = usePredictionMarket();

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleInitialize = async () => {
    try {
      addLog('Initializing market...');
      const sig = await initializeMarket(PYTH_SOL_USD, BigInt(100_000_000), BigInt(10_000_000));
      addLog(`Success! Signature: ${sig}`);
    } catch (err: any) {
      console.error(err);
      addLog(`Error: ${err.message || err}`);
      if (err.transactionPlanResult) {
        console.error("Simulation Logs:", err.transactionPlanResult?.logs);
        addLog(`Logs: ${JSON.stringify(err.transactionPlanResult?.logs)}`);
      }
    }
  };

  const handlePlacePrediction = async () => {
    try {
      addLog('Placing prediction (Bucket 50, 10 USDC)...');
      // Amount in units: 10 USDC (6 decimals) = 10_000_000n
      const sig = await placePrediction(PYTH_SOL_USD, 50, BigInt(10_000_000));
      addLog(`Success! Signature: ${sig}`);
    } catch (err: any) {
      console.error(err);
      addLog(`Error: ${err.message || err}`);
      if (err.transactionPlanResult) {
        addLog(`Logs: ${JSON.stringify(err.transactionPlanResult?.logs)}`);
      }
    }
  };

  const handleResolve = async () => {
    try {
      addLog('Resolving market with Oracle data...');
      const sig = await resolveMarket(PYTH_SOL_USD);
      addLog(`Success! Signature: ${sig}`);
    } catch (err: any) {
      console.error(err);
      addLog(`Error: ${err.message || err}`);
      if (err.transactionPlanResult) {
        addLog(`Logs: ${JSON.stringify(err.transactionPlanResult?.logs)}`);
      }
    }
  };

  const handleClaim = async () => {
    try {
      addLog('Claiming winnings...');
      const sig = await claimPrediction(PYTH_SOL_USD);
      addLog(`Success! Signature: ${sig}`);
    } catch (err: any) {
      console.error(err);
      addLog(`Error: ${err.message || err}`);
      if (err.transactionPlanResult) {
        addLog(`Logs: ${JSON.stringify(err.transactionPlanResult?.logs)}`);
      }
    }
  };

  return (
    <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/50 mb-8">
      <h2 className="text-xl font-bold mb-4 text-emerald-400">🧪 End-to-End Test Dashboard</h2>
      <p className="text-sm text-zinc-400 mb-6">Test the complete Accuracy Market lifecycle directly on-chain.</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button 
          onClick={handleInitialize}
          disabled={isSending}
          className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          1. Init Market
        </button>
        <button 
          onClick={handlePlacePrediction}
          disabled={isSending}
          className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          2. Place Bet (10 USDC)
        </button>
        <button 
          onClick={handleResolve}
          disabled={isSending}
          className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          3. Resolve Market
        </button>
        <button 
          onClick={handleClaim}
          disabled={isSending}
          className="bg-purple-600 hover:bg-purple-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          4. Claim Payout
        </button>
      </div>

      <div className="bg-black/50 p-4 rounded-lg font-mono text-sm h-48 overflow-y-auto">
        <div className="text-zinc-500 mb-2">// Transaction Logs</div>
        {isSending && <div className="text-yellow-400 mb-1">⏳ Transaction in progress...</div>}
        {status === 'error' && <div className="text-red-400 mb-1">❌ Framework Status Error</div>}
        
        {logs.map((log, i) => (
          <div key={i} className={`${log.startsWith('Error') ? 'text-red-400' : 'text-green-400'} mb-1`}>
            &gt; {log}
          </div>
        ))}
      </div>
    </div>
  );
}
