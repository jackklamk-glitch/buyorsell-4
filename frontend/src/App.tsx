import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import "./styles/tailwind.css";
import { FintechDashboardLayout } from "./layout/FintechDashboardLayout";
import type {
  BosSignal,
  BosSignalMarker,
  MarketHeatmapNode,
  OhlcvBar,
  SignalRow,
} from "./types/market";

interface VnstockSignalApiResponse {
  ok: boolean;
  fetchedAt?: string;
  marketSession?: {
    open: boolean;
    label: string;
  };
  summary?: {
    total?: number;
    buy?: number;
    sell?: number;
    avgBosScore?: number;
    top?: string | null;
  };
  data?: VnstockSignalRow[];
  error?: string;
}

interface VnstockSignalRow {
  symbol: string;
  signal: string;
  signalPrice?: number | null;
  livePrice?: number | null;
  bosScore?: number | null;
  aiConfidence?: number | null;
  verdict?: string | null;
  dt?: string | null;
  date?: string | null;
  time?: string | null;
  note?: string | null;
  live?: {
    companyName?: string | null;
    price?: number | null;
    referencePrice?: number | null;
    changePct?: number | null;
    totalVolume?: number | null;
    foreignNetVolume?: number | null;
    exchange?: string | null;
  } | null;
  performance?: {
    pct?: number | null;
  } | null;
  ta?: {
    close?: number | null;
    rsi14?: number | null;
    ema20?: number | null;
    sma50?: number | null;
    macdHistogram?: number | null;
    stance?: string | null;
  } | null;
  news?: Array<{
    title?: string | null;
    source?: string | null;
    date?: string | null;
  }>;
}

const fallbackRows: VnstockSignalRow[] = [
  {
    symbol: "TCB",
    signal: "BUY",
    livePrice: 34.5,
    bosScore: 78,
    verdict: "Theo doi tich cuc",
    dt: new Date().toISOString(),
    live: {
      companyName: "Techcombank",
      referencePrice: 34.1,
      totalVolume: 4_052_000,
      foreignNetVolume: 120_000,
      exchange: "HSX",
    },
    ta: { rsi14: 58, macdHistogram: 0.12, stance: "BULLISH" },
    news: [],
  },
];

function App() {
  const [payload, setPayload] = useState<VnstockSignalApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSignals() {
      try {
        const response = await fetch(`/api/vnstock-signal-os?limit=20&_=${Date.now()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`vnstock_${response.status}`);
        const nextPayload = (await response.json()) as VnstockSignalApiResponse;
        if (!cancelled) {
          setPayload(nextPayload);
          setError(nextPayload.ok ? null : nextPayload.error ?? "vnstock_payload_not_ok");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "vnstock_fetch_failed");
      }
    }

    void loadSignals();
    const intervalId = window.setInterval(loadSignals, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const rows = payload?.data?.length ? payload.data : fallbackRows;
  const selected = rows[0] ?? fallbackRows[0];
  const marketData = useMemo(() => buildMarketData(rows), [rows]);
  const ohlcvBars = useMemo(() => buildSyntheticBars(selected), [selected]);
  const markers = useMemo(() => buildMarkers(rows), [rows]);
  const ragInsight = useMemo(() => buildRagInsight(selected, payload, error), [error, payload, selected]);
  const tickerTape = useMemo(() => buildTickerTape(rows, payload), [payload, rows]);

  return (
    <FintechDashboardLayout
      alertsEnabled
      heatmapNodes={marketData.heatmapNodes}
      indices={tickerTape}
      markers={markers}
      ohlcvBars={ohlcvBars}
      ragInsight={ragInsight}
      signals={marketData.signals}
      symbols={marketData.heatmapNodes.map((node) => ({
        symbol: node.symbol,
        companyName: node.companyName,
        sector: node.sector,
      }))}
    />
  );
}

function buildMarketData(rows: VnstockSignalRow[]) {
  const heatmapNodes: MarketHeatmapNode[] = rows.map((row) => {
    const price = numberOr(row.livePrice, row.live?.price, row.signalPrice, 0);
    const volume = Math.max(0, numberOr(row.live?.totalVolume, 0));
    const sBos = clamp(numberOr(row.bosScore, 50), 0, 100);
    const foreignFlow = clamp(50 + numberOr(row.live?.foreignNetVolume, 0) / Math.max(volume, 1) * 100, 0, 100);
    const momentum = scoreMomentum(row);
    const volumeDelta = scoreVolume(row);
    const valuation = scoreValuation(row);

    return {
      symbol: row.symbol,
      companyName: row.live?.companyName || row.symbol,
      sector: row.live?.exchange || "VN",
      marketCap: Math.max(1, price * volume * 1000),
      volume,
      priceChangePct: priceChangePct(row),
      sBos,
      signal: normalizeSignal(row.signal),
      factors: {
        momentum,
        volumeDelta,
        foreignFlow,
        valuation,
      },
    };
  });

  const signals: SignalRow[] = heatmapNodes.map((node, index) => ({
    id: `${node.symbol}-${rows[index]?.dt ?? index}`,
    symbol: node.symbol,
    companyName: node.companyName,
    signal: node.signal,
    sBos: node.sBos,
    price: numberOr(rows[index]?.livePrice, rows[index]?.live?.price, rows[index]?.signalPrice, 0),
    priceChangePct: node.priceChangePct,
    volume: node.volume,
    updatedAt: rows[index]?.dt || new Date().toISOString(),
    factors: node.factors,
  }));

  const averageChangePct =
    heatmapNodes.reduce((sum, node) => sum + node.priceChangePct, 0) / Math.max(1, heatmapNodes.length);

  return { heatmapNodes, signals, averageChangePct };
}

function buildTickerTape(rows: VnstockSignalRow[], payload: VnstockSignalApiResponse | null) {
  const liveRows = rows.slice(0, 10).map((row) => ({
    symbol: row.symbol,
    value: numberOr(row.livePrice, row.live?.price, row.signalPrice, 0),
    changePct: priceChangePct(row),
  }));
  if (liveRows.length) return liveRows;
  return [
    {
      symbol: payload?.marketSession?.open ? "REALTIME" : "VNSTOCK",
      value: payload?.summary?.total ?? 0,
      changePct: payload?.summary?.avgBosScore ?? 0,
    },
  ];
}

function buildSyntheticBars(row: VnstockSignalRow): OhlcvBar[] {
  const close = Math.max(1, numberOr(row.livePrice, row.live?.price, row.signalPrice, row.ta?.close, 10));
  const volume = Math.max(1, numberOr(row.live?.totalVolume, 100_000));
  const dates = ["2026-07-15", "2026-07-16", "2026-07-17", "2026-07-20", "2026-07-21"];
  return dates.map((time, index) => {
    const drift = (index - 4) * close * 0.012;
    const base = close + drift;
    const open = base * (index % 2 === 0 ? 0.992 : 1.006);
    const barClose = index === dates.length - 1 ? close : base;
    return {
      time,
      open: round(open),
      high: round(Math.max(open, barClose) * 1.012),
      low: round(Math.min(open, barClose) * 0.988),
      close: round(barClose),
      volume: Math.round(volume * (0.72 + index * 0.08)),
    };
  });
}

function buildMarkers(rows: VnstockSignalRow[]): BosSignalMarker[] {
  return rows
    .filter((row) => normalizeSignal(row.signal) === "BUY" || normalizeSignal(row.signal) === "SELL")
    .slice(0, 8)
    .map((row, index) => ({
      id: `${row.symbol}-${row.dt ?? index}`,
      symbol: row.symbol,
      time: markerTime(row.dt, index),
      signal: normalizeSignal(row.signal) === "BUY" ? "BUY" : "SELL",
      price: numberOr(row.livePrice, row.live?.price, row.signalPrice, 0),
      sBos: clamp(numberOr(row.bosScore, 50), 0, 100),
    }));
}

function buildRagInsight(
  row: VnstockSignalRow,
  payload: VnstockSignalApiResponse | null,
  error: string | null,
) {
  const signal = normalizeSignal(row.signal);
  const price = numberOr(row.livePrice, row.live?.price, row.signalPrice, 0);
  const sBos = clamp(numberOr(row.bosScore, 50), 0, 100);
  const session = payload?.marketSession?.label ?? "Dang ket noi Vnstock";
  const topNews = row.news?.filter((item) => item.title).slice(0, 3) ?? [];

  return {
    symbol: row.symbol,
    title: `${signal} | ${row.verdict ?? "Vnstock realtime"}`,
    summary: error
      ? `Dang dung du lieu fallback do loi ket noi: ${error}.`
      : `${row.symbol} cap nhat tu Vnstock: gia ${formatPrice(price)}, S_BOS ${sBos.toFixed(0)}, trang thai ${session}.`,
    catalysts: [
      `Tin hieu ${signal} lay tu pipeline Vnstock/BuyOrSell, cap nhat luc ${row.time ?? row.dt ?? "realtime"}.`,
      `Khoi luong phien ${formatNumber(numberOr(row.live?.totalVolume, 0))}, khoi ngoai ${formatNumber(numberOr(row.live?.foreignNetVolume, 0))}.`,
      ...(topNews.length ? topNews.map((news) => news.title || "Tin lien quan") : [`TA stance: ${row.ta?.stance ?? "NEUTRAL"}, RSI ${row.ta?.rsi14 ?? "N/A"}.`]),
    ],
    risks: [
      `Foreign net volume am hoac RSI suy yeu se lam diem S_BOS giam nhanh.`,
      `Neu gia thung vung tin hieu ${formatPrice(numberOr(row.signalPrice, price))}, kich ban can duoc danh gia lai.`,
    ],
    scenario: {
      entryZone: signal === "BUY" ? `${formatPrice(price * 0.985)} - ${formatPrice(price * 1.01)}` : "Khong mo mua moi khi tin hieu la SELL",
      stopLoss: formatPrice(price * 0.94),
      takeProfit: `${formatPrice(price * 1.07)} / ${formatPrice(price * 1.14)}`,
    },
  };
}

function normalizeSignal(signal: string): BosSignal {
  const value = signal.toUpperCase();
  if (value === "BUY") return "BUY";
  if (value === "SELL") return "SELL";
  if (value === "HOLD") return "HOLD";
  if (value === "AVOID") return "AVOID";
  return "WATCH";
}

function priceChangePct(row: VnstockSignalRow) {
  const apiPct = row.live?.changePct;
  if (typeof apiPct === "number" && Number.isFinite(apiPct)) return apiPct;
  const price = numberOr(row.livePrice, row.live?.price, 0);
  const reference = numberOr(row.live?.referencePrice, 0);
  if (price > 0 && reference > 0) return round(((price - reference) / reference) * 100);
  return numberOr(row.performance?.pct, 0);
}

function scoreMomentum(row: VnstockSignalRow) {
  const base = row.ta?.stance === "BULLISH" ? 72 : row.ta?.stance === "BEARISH" ? 32 : 52;
  return clamp(base + numberOr(row.ta?.macdHistogram, 0) * 10, 0, 100);
}

function scoreVolume(row: VnstockSignalRow) {
  const volume = numberOr(row.live?.totalVolume, 0);
  return clamp(volume <= 0 ? 50 : 45 + Math.log10(volume) * 7, 0, 100);
}

function scoreValuation(row: VnstockSignalRow) {
  const rsi = numberOr(row.ta?.rsi14, 50);
  if (rsi < 30) return 72;
  if (rsi > 75) return 36;
  return clamp(68 - Math.abs(rsi - 50) * 0.7, 0, 100);
}

function markerTime(dt: string | null | undefined, index: number) {
  if (dt) return dt.slice(0, 10);
  const fallback = ["2026-07-15", "2026-07-16", "2026-07-17", "2026-07-20", "2026-07-21"];
  return fallback[index % fallback.length];
}

function numberOr(...values: Array<number | null | undefined>) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function formatPrice(value: number) {
  return Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value: number) {
  return Intl.NumberFormat("vi-VN").format(Math.round(value));
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
