import { useMemo, useState } from "react";

import { AiExplainerPanel, type BosRagExplanationViewModel } from "../components/AiExplainerPanel";
import { MarketHeatmap, type MarketHeatmapTicker } from "../components/MarketHeatmap";
import { SignalTable, type QuantSignalRow } from "../components/SignalTable";
import { TickerChart } from "../components/TickerChart";
import { fintechTheme } from "../theme/tokens";
import type {
  BosFactorBreakdown,
  BosSignal,
  BosSignalMarker,
  MarketHeatmapNode,
  OhlcvBar,
  SignalRow,
} from "../types/market";

interface MarketIndexTicker {
  symbol: string;
  value: number;
  changePct: number;
}

interface RagInsight {
  symbol: string;
  title: string;
  summary: string;
  catalysts: string[];
  risks: string[];
  scenario: {
    entryZone: string;
    stopLoss: string;
    takeProfit: string;
  };
}

interface SearchSymbol {
  symbol: string;
  companyName: string;
  sector: string;
}

interface FintechDashboardLayoutProps {
  indices: MarketIndexTicker[];
  signals: SignalRow[];
  heatmapNodes: MarketHeatmapNode[];
  ohlcvBars: OhlcvBar[];
  markers: BosSignalMarker[];
  ragInsight: RagInsight;
  symbols: SearchSymbol[];
  alertsEnabled?: boolean;
  onAlertToggle?: (enabled: boolean) => void;
  onSymbolSelect?: (symbol: string) => void;
}

export function FintechDashboardLayout({
  indices,
  signals,
  heatmapNodes,
  ohlcvBars,
  markers,
  ragInsight,
  symbols,
  alertsEnabled = false,
  onAlertToggle,
  onSymbolSelect,
}: FintechDashboardLayoutProps) {
  const [centerMode, setCenterMode] = useState<"heatmap" | "chart">("heatmap");
  const [localAlertsEnabled, setLocalAlertsEnabled] = useState(alertsEnabled);
  const sectorBySymbol = useMemo(
    () => new Map(heatmapNodes.map((node) => [node.symbol, node.sector])),
    [heatmapNodes],
  );
  const hotSignals = useMemo(
    () =>
      signals.map<QuantSignalRow>((row) => ({
        id: row.id,
        symbol: row.symbol,
        sector: sectorBySymbol.get(row.symbol) ?? "Chưa phân loại",
        matchedPrice: row.price,
        priceChangePct: row.priceChangePct,
        volume: row.volume,
        avgVolume20d: Math.max(1, row.volume / (row.sBos >= 80 ? 2.1 : 1.2)),
        sBos: row.sBos,
        signal: row.signal,
        foreignNetValue: row.factors.foreignFlow >= 60 ? row.volume * row.price * 0.08 : -row.volume * row.price * 0.03,
        updatedAt: row.updatedAt,
        factors: row.factors,
      })),
    [sectorBySymbol, signals],
  );
  const heatmapTickers = useMemo(
    () =>
      heatmapNodes.map<MarketHeatmapTicker>((node) => ({
        symbol: node.symbol,
        companyName: node.companyName,
        sector: node.sector,
        marketCap: node.marketCap,
        sessionVolume: node.volume,
        matchedPrice: signals.find((row) => row.symbol === node.symbol)?.price ?? 0,
        priceChangePct: node.priceChangePct,
        sBos: node.sBos,
        signal: node.signal,
        factors: node.factors,
      })),
    [heatmapNodes, signals],
  );
  const explanation = useMemo<BosRagExplanationViewModel>(
    () => ({
      symbol: ragInsight.symbol,
      sBos: signals.find((row) => row.symbol === ragInsight.symbol)?.sBos ?? 0,
      weightBreakdown: {
        momentum: signals.find((row) => row.symbol === ragInsight.symbol)?.factors.momentum ?? 50,
        volumeDelta: signals.find((row) => row.symbol === ragInsight.symbol)?.factors.volumeDelta ?? 50,
        foreignFlow: signals.find((row) => row.symbol === ragInsight.symbol)?.factors.foreignFlow ?? 50,
        valuation: signals.find((row) => row.symbol === ragInsight.symbol)?.factors.valuation ?? 50,
      },
      keyCatalysts: ragInsight.catalysts.map((detail, index) => ({
        title: `Catalyst ${index + 1}`,
        detail,
        citations: [
          {
            id: `cat-${index + 1}`,
            source: "RAG",
            title: `${ragInsight.symbol} retrieved context ${index + 1}`,
          },
        ],
      })),
      risks: ragInsight.risks.map((detail, index) => ({
        title: `Risk ${index + 1}`,
        detail,
        citations: [
          {
            id: `risk-${index + 1}`,
            source: "RAG",
            title: `${ragInsight.symbol} risk context ${index + 1}`,
          },
        ],
      })),
      actionableScenario: {
        stance: ragInsight.title,
        entryZone: ragInsight.scenario.entryZone,
        stopLoss: ragInsight.scenario.stopLoss,
        takeProfit: ragInsight.scenario.takeProfit,
        invalidation: "S_BOS thủng 60 hoặc foreign flow đảo chiều bán ròng mạnh.",
      },
    }),
    [ragInsight, signals],
  );

  const toggleAlerts = () => {
    const next = !localAlertsEnabled;
    setLocalAlertsEnabled(next);
    onAlertToggle?.(next);
  };

  return (
    <main className="bos-shell">
      <DashboardStyles />
      <NavigationHeader
        alertsEnabled={localAlertsEnabled}
        indices={indices}
        symbols={symbols}
        onAlertToggle={toggleAlerts}
        onSymbolSelect={onSymbolSelect}
      />

      <section className="bos-grid" aria-label="BuyOrSell 4.0 dashboard">
        <aside className="bos-panel bos-left-panel">
          <PanelHeader
            eyebrow="Vnstock live"
            title="Tín hiệu realtime"
            meta={`${hotSignals.length} mã`}
          />
          <SignalTable
            rows={hotSignals}
            height={640}
            onSelectTicker={(symbol) => onSymbolSelect?.(symbol)}
          />
        </aside>

        <section className="bos-panel bos-center-panel">
          <PanelHeader
            eyebrow="Market flow"
            title={centerMode === "heatmap" ? "Bản đồ dòng tiền" : "Đồ thị nến"}
            action={
              <div className="bos-segmented" aria-label="Chế độ biểu đồ">
                <button
                  type="button"
                  aria-pressed={centerMode === "heatmap"}
                  onClick={() => setCenterMode("heatmap")}
                >
                  Heatmap
                </button>
                <button
                  type="button"
                  aria-pressed={centerMode === "chart"}
                  onClick={() => setCenterMode("chart")}
                >
                  Nến
                </button>
              </div>
            }
          />
          {centerMode === "heatmap" ? (
            <MarketHeatmap
              data={heatmapTickers}
              height={620}
              onSelectTicker={(symbol) => onSymbolSelect?.(symbol)}
            />
          ) : (
            <TickerChart bars={ohlcvBars} markers={markers} height={620} />
          )}
        </section>

        <aside className="bos-panel bos-right-panel">
          <PanelHeader
            eyebrow="Financial RAG"
            title={`${ragInsight.symbol} AI diễn giải`}
            meta="Schema locked"
          />
          <AiExplainerPanel explanation={explanation} />
        </aside>
      </section>
    </main>
  );
}

function NavigationHeader({
  alertsEnabled,
  indices,
  symbols,
  onAlertToggle,
  onSymbolSelect,
}: {
  alertsEnabled: boolean;
  indices: MarketIndexTicker[];
  symbols: SearchSymbol[];
  onAlertToggle: () => void;
  onSymbolSelect?: (symbol: string) => void;
}) {
  return (
    <header className="bos-header">
      <div className="bos-logo-block" aria-label="BuyOrSell 4.0">
        <div className="bos-logo-mark">BOS</div>
        <div>
          <div className="bos-brand">BuyOrSell 4.0</div>
          <div className="bos-badge">AI QUANT PRO</div>
        </div>
      </div>
      <TickerTape indices={indices} />
      <SearchBar symbols={symbols} onSymbolSelect={onSymbolSelect} />
      <button
        type="button"
        className="bos-alert-toggle"
        aria-pressed={alertsEnabled}
        onClick={onAlertToggle}
        title="Bật/tắt cảnh báo"
      >
        <span className="bos-alert-dot" />
        {alertsEnabled ? "Alerts On" : "Alerts Off"}
      </button>
    </header>
  );
}

function TickerTape({ indices }: { indices: MarketIndexTicker[] }) {
  const loop = [...indices, ...indices, ...indices];
  return (
    <div className="bos-ticker-tape" aria-label="Market ticker tape">
      <div className="bos-ticker-track">
        {loop.map((item, index) => (
          <span className="bos-ticker-item" key={`${item.symbol}-${index}`}>
            <strong>{item.symbol}</strong>
            <span>{item.value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</span>
            <span className={item.changePct >= 0 ? "bos-up" : "bos-down"}>
              {item.changePct >= 0 ? "+" : ""}
              {item.changePct.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SearchBar({
  symbols,
  onSymbolSelect,
}: {
  symbols: SearchSymbol[];
  onSymbolSelect?: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return symbols.slice(0, 6);
    return symbols
      .filter((item) =>
        `${item.symbol} ${item.companyName} ${item.sector}`.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [query, symbols]);

  return (
    <div className="bos-search">
      <input
        aria-label="Tìm kiếm mã cổ phiếu"
        placeholder="Tìm mã..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query ? (
        <div className="bos-search-menu" role="listbox">
          {matches.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() => {
                setQuery(item.symbol);
                onSymbolSelect?.(item.symbol);
              }}
            >
              <strong>{item.symbol}</strong>
              <span>{item.companyName}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  meta,
  action,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bos-panel-header">
      <div>
        <div className="bos-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {action ?? (meta ? <span className="bos-meta">{meta}</span> : null)}
    </div>
  );
}

function DashboardStyles() {
  return (
    <style>
      {`
        :root {
          color-scheme: dark;
          --bos-bg: ${fintechTheme.color.background};
          --bos-panel: ${fintechTheme.color.panel};
          --bos-panel-raised: ${fintechTheme.color.panelRaised};
          --bos-border: ${fintechTheme.color.border};
          --bos-text: ${fintechTheme.color.text};
          --bos-muted: ${fintechTheme.color.muted};
          --bos-up: ${fintechTheme.color.accent};
          --bos-down: ${fintechTheme.color.danger};
          --bos-warning: ${fintechTheme.color.warning};
          --bos-info: ${fintechTheme.color.info};
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bos-bg); }
        button, input { font: inherit; }
        .bos-shell {
          min-height: 100vh;
          background: var(--bos-bg);
          color: var(--bos-text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 16px;
        }
        .bos-header {
          align-items: center;
          background: rgba(21, 29, 42, 0.96);
          border: 1px solid var(--bos-border);
          border-radius: ${fintechTheme.radius.card}px;
          box-shadow: ${fintechTheme.shadow.panel};
          display: grid;
          gap: 14px;
          grid-template-columns: minmax(210px, 0.85fr) minmax(240px, 1.35fr) minmax(210px, 0.9fr) auto;
          min-height: 72px;
          padding: 12px 14px;
          position: sticky;
          top: 12px;
          z-index: 20;
        }
        .bos-logo-block { align-items: center; display: flex; gap: 10px; min-width: 0; }
        .bos-logo-mark {
          align-items: center;
          aspect-ratio: 1;
          background: linear-gradient(135deg, var(--bos-up), #38bdf8);
          border-radius: 8px;
          color: #03110c;
          display: grid;
          font-size: 13px;
          font-weight: 950;
          height: 42px;
          justify-content: center;
        }
        .bos-brand { font-size: 17px; font-weight: 900; line-height: 1.15; white-space: nowrap; }
        .bos-badge {
          color: var(--bos-up);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0;
          margin-top: 3px;
        }
        .bos-ticker-tape {
          border-inline: 1px solid var(--bos-border);
          min-width: 0;
          overflow: hidden;
          padding: 0 10px;
          white-space: nowrap;
        }
        .bos-ticker-track {
          animation: bosTicker 28s linear infinite;
          display: inline-flex;
          gap: 22px;
          min-width: max-content;
        }
        .bos-ticker-item { align-items: center; display: inline-flex; gap: 7px; }
        .bos-ticker-item strong { color: #f8fafc; }
        @keyframes bosTicker {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        .bos-search { min-width: 0; position: relative; }
        .bos-search input {
          background: #0f1623;
          border: 1px solid var(--bos-border);
          border-radius: ${fintechTheme.radius.control}px;
          color: var(--bos-text);
          height: 42px;
          outline: none;
          padding: 0 12px;
          width: 100%;
        }
        .bos-search input:focus { border-color: var(--bos-up); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16); }
        .bos-search-menu {
          background: var(--bos-panel-raised);
          border: 1px solid var(--bos-border);
          border-radius: 8px;
          box-shadow: ${fintechTheme.shadow.panel};
          left: 0;
          margin-top: 6px;
          overflow: hidden;
          position: absolute;
          right: 0;
          top: 100%;
          z-index: 30;
        }
        .bos-search-menu button {
          align-items: center;
          background: transparent;
          border: 0;
          color: var(--bos-text);
          cursor: pointer;
          display: flex;
          gap: 9px;
          min-height: 42px;
          padding: 8px 10px;
          text-align: left;
          width: 100%;
        }
        .bos-search-menu button:hover { background: rgba(16, 185, 129, 0.12); }
        .bos-search-menu span { color: var(--bos-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bos-alert-toggle {
          align-items: center;
          background: #0f1623;
          border: 1px solid var(--bos-border);
          border-radius: ${fintechTheme.radius.control}px;
          color: var(--bos-text);
          cursor: pointer;
          display: inline-flex;
          gap: 8px;
          height: 42px;
          justify-content: center;
          padding: 0 12px;
          white-space: nowrap;
        }
        .bos-alert-toggle[aria-pressed="true"] { border-color: rgba(16, 185, 129, 0.7); color: var(--bos-up); }
        .bos-alert-dot {
          background: currentColor;
          border-radius: 999px;
          display: inline-block;
          height: 8px;
          width: 8px;
        }
        .bos-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: minmax(260px, 25%) minmax(420px, 50%) minmax(280px, 25%);
          margin-top: 16px;
        }
        .bos-panel {
          background: var(--bos-panel);
          border: 1px solid var(--bos-border);
          border-radius: ${fintechTheme.radius.card}px;
          box-shadow: ${fintechTheme.shadow.panel};
          min-width: 0;
          overflow: hidden;
          padding: 14px;
        }
        .bos-panel-header {
          align-items: center;
          display: flex;
          gap: 12px;
          justify-content: space-between;
          margin-bottom: 12px;
          min-height: 44px;
        }
        .bos-panel-header h2 { font-size: 17px; line-height: 1.2; margin: 2px 0 0; }
        .bos-eyebrow, .bos-meta {
          color: var(--bos-muted);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .bos-segmented {
          background: #0f1623;
          border: 1px solid var(--bos-border);
          border-radius: 7px;
          display: inline-grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }
        .bos-segmented button {
          background: transparent;
          border: 0;
          color: var(--bos-muted);
          cursor: pointer;
          min-height: 34px;
          padding: 0 12px;
        }
        .bos-segmented button[aria-pressed="true"] { background: var(--bos-up); color: #03110c; font-weight: 900; }
        .bos-up { color: var(--bos-up); }
        .bos-down { color: var(--bos-down); }
        .bos-rag { color: #cbd5e1; display: grid; gap: 12px; }
        .bos-rag p { margin: 0; }
        .bos-insight-list {
          background: #0f1623;
          border: 1px solid var(--bos-border);
          border-radius: 8px;
          padding: 12px;
        }
        .bos-insight-list h3, .bos-scenario h3 { font-size: 13px; margin: 0 0 8px; }
        .bos-insight-list ul { margin: 0; padding-left: 18px; }
        .bos-insight-list li { margin: 6px 0; }
        .bos-scenario {
          background: #0f1623;
          border: 1px solid var(--bos-border);
          border-radius: 8px;
          padding: 12px;
        }
        .bos-scenario dl { display: grid; gap: 10px; margin: 0; }
        .bos-scenario div { display: grid; gap: 3px; }
        .bos-scenario dt { color: var(--bos-muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .bos-scenario dd { margin: 0; }
        @media (max-width: 1180px) {
          .bos-header { grid-template-columns: 1fr 1fr; }
          .bos-ticker-tape { border-inline: 0; order: 3; grid-column: 1 / -1; }
          .bos-grid { grid-template-columns: minmax(280px, 1fr) minmax(420px, 1.6fr); }
          .bos-right-panel { grid-column: 1 / -1; }
        }
        @media (max-width: 760px) {
          .bos-shell { padding: 10px; }
          .bos-header { grid-template-columns: 1fr; position: static; }
          .bos-ticker-tape { grid-column: auto; }
          .bos-grid { grid-template-columns: 1fr; }
          .bos-panel { padding: 10px; }
        }
      `}
    </style>
  );
}

export type {
  MarketIndexTicker,
  RagInsight,
  SearchSymbol,
  FintechDashboardLayoutProps,
};
