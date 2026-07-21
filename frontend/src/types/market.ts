export type BosSignal = "BUY" | "SELL" | "HOLD" | "WATCH" | "AVOID";

export interface BosFactorBreakdown {
  momentum: number;
  volumeDelta: number;
  foreignFlow: number;
  valuation: number;
}

export interface MarketHeatmapNode {
  symbol: string;
  companyName: string;
  sector: string;
  marketCap: number;
  volume: number;
  priceChangePct: number;
  sBos: number;
  signal: BosSignal;
  factors: BosFactorBreakdown;
}

export interface OhlcvBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BosSignalMarker {
  id: string;
  symbol: string;
  time: string;
  signal: Extract<BosSignal, "BUY" | "SELL">;
  price: number;
  sBos: number;
}

export interface SignalRow {
  id: string;
  symbol: string;
  companyName: string;
  sector: string;
  signal: BosSignal;
  sBos: number;
  price: number;
  priceChangePct: number;
  volume: number;
  updatedAt: string;
  factors: BosFactorBreakdown;
  pe?: number | null;
  pb?: number | null;
  roePct?: number | null;
  epsGrowthPct?: number | null;
  debtToEquity?: number | null;
  rsi14?: number | null;
  oneMonthChangePct?: number | null;
  foreignNet5dBillion?: number | null;
}
