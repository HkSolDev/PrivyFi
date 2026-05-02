'use client';

import { Wallet, PieChart, TrendingUp, Loader2, FlaskConical } from 'lucide-react';
import { usePortfolio, PortfolioToken } from '@/hooks/usePortfolio';
import { useAnchorProgram } from '@/hooks/useAnchorProgram';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function PortfolioView() {
  const { tokens, priceMap, pricesLoading, tokensLoading, totalValue, error } = usePortfolio();
  const { getUserPositions, wallet } = useAnchorProgram();
  const [stakedPositions, setStakedPositions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStaked() {
      if (!wallet) return;
      const positions = await getUserPositions();
      setStakedPositions(
        positions.map(p => ({
          mint: 'staked',
          symbol: 'M-USDC',
          name: 'PrivyFi Staked Vault',
          amount: p.account.amount.toNumber() / 1_000_000,
          isSol: false,
          isStaked: true,
          isDevnet: false,
          hasMetadata: true,
          isUnknown: false,
        }))
      );
    }
    fetchStaked();
  }, [wallet]);

  const fmt = (v: number) =>
    `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getTokenPrice = (mint: string) => priceMap[mint] ?? 0;

  const allRows = [
    ...stakedPositions,
    ...tokens,
  ];

  const totalDisplay = fmt(
    stakedPositions.reduce((s, p) => s + p.amount, 0) + totalValue
  );

  if (tokensLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="text-purple-400 animate-spin" size={40} />
        <p className="text-gray-500 font-medium">Loading wallet assets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-500/5 border-red-500/20 p-8 text-center">
        <p className="text-red-400 font-bold mb-2">Failed to load portfolio</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8 fade-in">
      <div className="grid grid-cols-12 gap-8">
        {/* Asset Table */}
        <Card className="col-span-12 lg:col-span-8 bg-[#0d0d12]/40 border-white/5 p-4 purple-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <CardTitle className="text-2xl font-bold text-white">Your Assets ({allRows.length})</CardTitle>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 py-1.5 px-4 font-bold">
              Net Worth: {totalDisplay}
            </Badge>
          </CardHeader>
          <CardContent>
            {allRows.length === 0 ? (
              <div className="py-12 text-center text-gray-500 italic">
                No assets found in this wallet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-6">Asset</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-6">Amount</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-6">Price</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-6">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRows.map((row: any, i: number) => {
                    const isStaked = !!row.isStaked;
                    const token = row as PortfolioToken;
                    const price = isStaked ? 1 : getTokenPrice(token.mint);
                    const value = isStaked ? row.amount : token.amount * price;
                    const hasPrice = isStaked || price > 0;

                    const avatarColor = token.isSol
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                      : isStaked
                      ? 'bg-green-500'
                      : token.hasMetadata
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-700'
                      : 'bg-white/10';

                    return (
                      <TableRow key={i} className={cn(
                        "border-white/5 group hover:bg-white/[0.02] transition-colors",
                        isStaked && "bg-green-500/[0.03]"
                      )}>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-lg relative text-white flex-shrink-0",
                              avatarColor
                            )}>
                              {(row.symbol || '??').slice(0, 3)}
                              {isStaked && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-2 flex-wrap text-white">
                                {row.name}
                                {isStaked && (
                                  <Badge className="bg-green-500/20 text-green-400 border-none text-[10px] py-0 px-2 h-5">
                                    Staked
                                  </Badge>
                                )}
                                {!isStaked && token.isUnknown && (
                                  <Badge variant="outline" className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-[10px] py-0 px-2 h-5 flex items-center gap-1">
                                    <FlaskConical size={9} /> Devnet
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {token.isUnknown && !isStaked
                                  ? `${token.mint.slice(0, 8)}...${token.mint.slice(-4)}`
                                  : row.symbol}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 font-bold text-white">
                          {row.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className="py-5 text-gray-400 text-sm">
                          {pricesLoading && !hasPrice ? (
                            <Skeleton className="h-4 w-16 rounded" />
                          ) : hasPrice ? (
                            fmt(price)
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-5 font-bold">
                          {pricesLoading && !hasPrice ? (
                            <Skeleton className="h-4 w-20 rounded" />
                          ) : hasPrice ? (
                            <span className={value > 0 ? 'text-white' : 'text-gray-500'}>
                              {fmt(value)}
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              $0.00 <span className="text-[10px] font-normal">(devnet)</span>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Stats */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <Card className="bg-[#0d0d12]/40 border-white/5 p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <CardHeader className="flex flex-row items-center gap-3 pb-6 px-0 pt-0">
              <PieChart size={20} className="text-purple-400" />
              <CardTitle className="text-base font-bold text-white">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Total Positions</span>
                <span className="font-bold text-white">{allRows.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Net Worth</span>
                <span className="font-bold text-purple-400">{totalDisplay}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Prices</span>
                {pricesLoading ? (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400/20 font-bold bg-yellow-400/10 h-5 px-2">
                    <Loader2 size={10} className="animate-spin mr-1" /> Updating
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-green-400 border-green-400/20 font-bold bg-green-400/10 h-5 px-2">
                    Live ⚡
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0d0d12]/40 border-white/5 p-8 h-full fade-in delay-200">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl font-bold text-white">Account Health</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[200px] text-center border border-white/5 rounded-2xl bg-white/[0.02] p-0">
              <TrendingUp className="text-green-400 mb-4" size={48} />
              <h4 className="text-2xl font-black text-green-400 tracking-tight uppercase">Optimized</h4>
              <p className="text-sm text-gray-500 mt-2">Your portfolio risk is perfectly balanced.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
