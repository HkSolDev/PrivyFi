import { NextResponse } from 'next/server';

// 1. Define a strictly normalized Yield Schema
// 1. Define a strictly normalized Yield Schema (Step B Foundation)
interface YieldStrategy {
  id: string;
  name: string;
  protocol: 'Meteora' | 'Kamino' | 'Orca' | 'Raydium';
  type: 'DLMM' | 'AMM' | 'Lending' | 'Vault';
  apy: number;
  tvl: number;
  tokens: string[];
  risk: 'Low' | 'Medium' | 'High';
  address?: string;
}

// 2. Specialized Fetchers (Step A: Data Fetch Layer)
// DLMM: Dynamic LM pools (highest APY)
async function fetchMeteoraDLMM(): Promise<YieldStrategy[]> {
  try {
    const res = await fetch('https://dlmm.datapi.meteora.ag/pair/all', { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 10).map((p: any) => ({
      id: p.address,
      name: p.name,
      protocol: 'Meteora',
      type: 'DLMM',
      apy: parseFloat(p.apr) + (parseFloat(p.farm_apr) || 0),
      tvl: parseFloat(p.liquidity),
      tokens: p.name.split('-'),
      risk: parseFloat(p.apr) > 100 ? 'High' : 'Medium',
    }));
  } catch (e) { return []; }
}

// DAMM v1: Classic AMM pools
async function fetchMeteoraDAMMv1(): Promise<YieldStrategy[]> {
  try {
    const res = await fetch('https://damm-api.meteora.ag/pair/all', { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 5).map((p: any) => ({
      id: p.address,
      name: p.name,
      protocol: 'Meteora',
      type: 'AMM',
      apy: parseFloat(p.apr) || 0,
      tvl: parseFloat(p.liquidity) || 0,
      tokens: p.name.split('-'),
      risk: 'Medium',
    }));
  } catch (e) { return []; }
}

// DAMM v2: CP-AMM pools
async function fetchMeteoraDAMMv2(): Promise<YieldStrategy[]> {
  try {
    const res = await fetch('https://dammv2-api.meteora.ag/pair/all', { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 5).map((p: any) => ({
      id: p.address,
      name: p.name,
      protocol: 'Meteora',
      type: 'AMM',
      apy: parseFloat(p.apr) || 0,
      tvl: parseFloat(p.liquidity) || 0,
      tokens: p.name.split('-'),
      risk: 'Medium',
    }));
  } catch (e) { return []; }
}

// Mock Kamino for now until SDK/Public API endpoint is finalized
async function fetchKaminoLending(): Promise<YieldStrategy[]> {
  return [
    {
      id: 'kamino-sol-lending',
      name: 'SOL Supply',
      protocol: 'Kamino',
      type: 'Lending',
      apy: 7.45,
      tvl: 450000000,
      tokens: ['SOL'],
      risk: 'Low'
    },
    {
      id: 'kamino-usdc-lending',
      name: 'USDC Supply',
      protocol: 'Kamino',
      type: 'Lending',
      apy: 12.10,
      tvl: 890000000,
      tokens: ['USDC'],
      risk: 'Low'
    },
    {
      id: 'palm-pusd-vault',
      name: 'PUSD Stable Vault',
      protocol: 'Orca',
      type: 'Vault',
      apy: 18.50,
      tvl: 25000000,
      tokens: ['PUSD', 'USDC'],
      risk: 'Low'
    }
  ];
}

export async function GET() {
  try {
    // 3. Parallel Execution (Step A: Fetch Layer)
    const [dlmm, damm1, damm2, kamino] = await Promise.all([
      fetchMeteoraDLMM(),
      fetchMeteoraDAMMv1(),
      fetchMeteoraDAMMv2(),
      fetchKaminoLending()
    ]);

    // 4. Normalize + Rank (Step B: Data Logic)
    const allStrategies = [...dlmm, ...damm1, ...damm2, ...kamino]
      .sort((a, b) => b.apy - a.apy) // Rank by Yield
      .map(s => ({
        ...s,
        // Format for UI consumption
        apy: `${s.apy.toFixed(2)}%`,
        tvl: `$${(s.tvl / 1000000).toFixed(1)}M`,
        address: s.id // Maintain compatibility with existing UI
      }));

    if (allStrategies.length === 0) throw new Error('No data found');

    return NextResponse.json(allStrategies);
  } catch (error) {
    console.error('Yield Aggregator Error:', error);
    
    // Safety Net (Updated with normalized addresses)
    const safetyNet = [
      { name: 'Kamino SOL Supply', apy: '7.45%', tvl: '$450M', risk: 'Low', protocol: 'Kamino', type: 'Lending', address: 'kamino-sol' },
      { name: 'Meteora SOL-USDC DLMM', apy: '45.20%', tvl: '$12M', risk: 'High', protocol: 'Meteora', type: 'DLMM', address: 'meteora-sol-usdc' },
      { name: 'Palm PUSD-USDC Vault', apy: '18.50%', tvl: '$25M', risk: 'Low', protocol: 'Orca', type: 'Vault', address: 'palm-pusd' },
    ];
    
    return NextResponse.json(safetyNet);
  }
}
