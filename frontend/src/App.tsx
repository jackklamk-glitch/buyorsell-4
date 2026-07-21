import { createRoot } from "react-dom/client";

import { FintechDashboardLayout } from "./layout/FintechDashboardLayout";
import type {
  BosSignalMarker,
  MarketHeatmapNode,
  OhlcvBar,
  SignalRow,
} from "./types/market";

const heatmapNodes: MarketHeatmapNode[] = [
  {
    symbol: "TCB",
    companyName: "Techcombank",
    sector: "Ngân hàng",
    marketCap: 121_000_000_000_000,
    volume: 4_052_000,
    priceChangePct: 1.2,
    sBos: 78.4,
    signal: "BUY",
    factors: { momentum: 82, volumeDelta: 76, foreignFlow: 74, valuation: 79 },
  },
  {
    symbol: "FPT",
    companyName: "FPT Corporation",
    sector: "Công nghệ",
    marketCap: 162_000_000_000_000,
    volume: 2_420_000,
    priceChangePct: 0.8,
    sBos: 73.1,
    signal: "WATCH",
    factors: { momentum: 75, volumeDelta: 70, foreignFlow: 72, valuation: 77 },
  },
  {
    symbol: "PLX",
    companyName: "Petrolimex",
    sector: "Năng lượng",
    marketCap: 44_000_000_000_000,
    volume: 786_300,
    priceChangePct: -0.6,
    sBos: 58.6,
    signal: "HOLD",
    factors: { momentum: 55, volumeDelta: 62, foreignFlow: 51, valuation: 68 },
  },
  {
    symbol: "AGR",
    companyName: "Agriseco",
    sector: "Chứng khoán",
    marketCap: 3_200_000_000_000,
    volume: 129_100,
    priceChangePct: 2.4,
    sBos: 81.2,
    signal: "BUY",
    factors: { momentum: 86, volumeDelta: 79, foreignFlow: 78, valuation: 80 },
  },
  {
    symbol: "VHM",
    companyName: "Vinhomes",
    sector: "Bất động sản",
    marketCap: 186_000_000_000_000,
    volume: 3_120_000,
    priceChangePct: -1.1,
    sBos: 44.2,
    signal: "AVOID",
    factors: { momentum: 38, volumeDelta: 42, foreignFlow: 39, valuation: 58 },
  },
];

const signals: SignalRow[] = heatmapNodes.map((node) => ({
  id: `signal-${node.symbol}`,
  symbol: node.symbol,
  companyName: node.companyName,
  signal: node.signal,
  sBos: node.sBos,
  price: node.symbol === "TCB" ? 34.5 : node.symbol === "AGR" ? 18.2 : 96.4,
  priceChangePct: node.priceChangePct,
  volume: node.volume,
  updatedAt: new Date().toISOString(),
  factors: node.factors,
}));

const bars: OhlcvBar[] = [
  { time: "2026-07-15", open: 32.1, high: 33.2, low: 31.8, close: 32.9, volume: 2_920_000 },
  { time: "2026-07-16", open: 32.9, high: 33.7, low: 32.4, close: 33.4, volume: 3_100_000 },
  { time: "2026-07-17", open: 33.4, high: 34.2, low: 33.0, close: 33.8, volume: 3_640_000 },
  { time: "2026-07-20", open: 33.8, high: 34.8, low: 33.7, close: 34.5, volume: 4_052_000 },
  { time: "2026-07-21", open: 34.5, high: 35.1, low: 34.2, close: 34.9, volume: 4_380_000 },
];

const markers: BosSignalMarker[] = [
  { id: "buy-TCB-2026-07-17", symbol: "TCB", time: "2026-07-17", signal: "BUY", price: 33.8, sBos: 72.5 },
  { id: "buy-TCB-2026-07-21", symbol: "TCB", time: "2026-07-21", signal: "BUY", price: 34.9, sBos: 78.4 },
];

function App() {
  return (
    <FintechDashboardLayout
      alertsEnabled
      heatmapNodes={heatmapNodes}
      indices={[
        { symbol: "VNINDEX", value: 1284.73, changePct: 0.64 },
        { symbol: "VN30", value: 1376.21, changePct: 0.51 },
        { symbol: "HNX", value: 241.08, changePct: -0.12 },
      ]}
      markers={markers}
      ohlcvBars={bars}
      ragInsight={{
        symbol: "TCB",
        title: "Sức mạnh dòng tiền ngân hàng",
        summary:
          "S_BOS của TCB đang nằm trên ngưỡng hot signal nhờ momentum tích cực, CVD duy trì cao và foreign flow chưa đảo chiều xấu.",
        catalysts: [
          "Momentum vượt trung bình nhóm ngân hàng trong micro-batch gần nhất.",
          "Thanh khoản tăng cùng chiều giá, giảm rủi ro breakout thiếu volume.",
          "Foreign flow giữ trạng thái hỗ trợ, chưa kích hoạt cảnh báo phân phối.",
        ],
        risks: [
          "Nếu VN30 suy yếu, beta ngành ngân hàng có thể kéo điểm momentum giảm nhanh.",
          "CVD đảo chiều âm trong phiên chiều sẽ làm confidence bị hạ.",
        ],
        scenario: {
          entryZone: "34.2 - 34.8",
          stopLoss: "33.1",
          takeProfit: "36.5 / 38.0",
        },
      }}
      signals={signals}
      symbols={heatmapNodes.map((node) => ({
        symbol: node.symbol,
        companyName: node.companyName,
        sector: node.sector,
      }))}
    />
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
