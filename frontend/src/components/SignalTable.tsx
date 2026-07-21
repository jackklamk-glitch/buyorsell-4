import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { BosFactorBreakdown, BosSignal } from "../types/market";

type SignalFilter = "all" | "strongBuy" | "volumeSpike" | "foreignNetBuy";

export interface QuantSignalRow {
  id: string;
  symbol: string;
  sector: string;
  matchedPrice: number;
  priceChangePct: number;
  volume: number;
  avgVolume20d: number;
  sBos: number;
  signal: BosSignal;
  foreignNetValue: number;
  updatedAt: string;
  factors: BosFactorBreakdown;
}

interface SignalTableProps {
  rows: QuantSignalRow[];
  height?: number;
  onSelectTicker?: (symbol: string) => void;
}

const filters: Array<{ id: SignalFilter; label: string }> = [
  { id: "all", label: "Tat ca" },
  { id: "strongBuy", label: "S_BOS > 70" },
  { id: "volumeSpike", label: "Dot bien KL" },
  { id: "foreignNetBuy", label: "NN mua rong" },
];

export function SignalTable({
  rows,
  height = 640,
  onSelectTicker,
}: SignalTableProps) {
  const [activeFilter, setActiveFilter] = useState<SignalFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query.trim().toUpperCase()), 180);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (debouncedQuery && !`${row.symbol} ${row.sector}`.toUpperCase().includes(debouncedQuery)) return false;
        if (activeFilter === "strongBuy") return row.sBos > 70;
        if (activeFilter === "volumeSpike") return row.volume >= row.avgVolume20d * 1.8;
        if (activeFilter === "foreignNetBuy") return row.foreignNetValue > 0;
        return true;
      }),
    [activeFilter, debouncedQuery, rows],
  );

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    estimateSize: () => 64,
    getScrollElement: () => parentRef.current,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <section aria-label="Virtualized quant signal table">
      <div style={filterBarStyle}>
        <input
          aria-label="Quick search ticker"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tim ma..."
          style={quickSearchStyle}
          value={query}
        />
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
            style={filterButtonStyle(activeFilter === filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div style={headerStyle}>
        <span>Ma CP</span>
        <span>Gia khop</span>
        <span>% Tang/Giam</span>
        <span>Khoi luong</span>
      </div>

      <div ref={parentRef} style={{ ...viewportStyle, height }}>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
          {virtualItems.map((virtualRow) => {
            const row = filteredRows[virtualRow.index];
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelectTicker?.(row.symbol)}
                style={{
                  ...rowStyle,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span style={symbolCellStyle}>
                  <strong>{row.symbol}</strong>
                  <small>{row.sector} · {row.signal}</small>
                </span>
                <span style={numericCellStyle}>{formatCurrency(row.matchedPrice)}</span>
                <span style={{ ...numericCellStyle, color: getChangeTone(row.priceChangePct), fontWeight: 900 }}>
                  {formatChangePct(row.priceChangePct)}
                </span>
                <span style={numericCellStyle}>{formatCompactVolume(row.volume)}</span>
              </button>
            );
          })}
          {filteredRows.length === 0 ? (
            <div style={emptyStateStyle}>Khong co tin hieu phu hop bo loc.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatChangePct(value: number) {
  if (!Number.isFinite(value)) return "0.00%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getChangeTone(value: number) {
  if (value > 0) return "#10B981";
  if (value < 0) return "#EF4444";
  return "#F59E0B";
}

function formatCompactVolume(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  return Intl.NumberFormat("vi-VN").format(Math.round(value));
}

const filterBarStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
  marginBottom: 10,
};

const quickSearchStyle: React.CSSProperties = {
  background: "#0F1623",
  border: "1px solid #263244",
  borderRadius: 6,
  color: "#E5E7EB",
  fontWeight: 800,
  gridColumn: "1 / -1",
  minHeight: 34,
  minWidth: 0,
  outline: "none",
  padding: "0 10px",
};

function filterButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "#10B981" : "#0F1623",
    border: "1px solid #263244",
    borderRadius: 6,
    color: active ? "#03110C" : "#CBD5E1",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 34,
    padding: "0 10px",
  };
}

const tableColumns = "minmax(74px, 1.05fr) minmax(70px, 0.9fr) minmax(88px, 1fr) minmax(88px, 1fr)";

const headerStyle: React.CSSProperties = {
  color: "#94A3B8",
  display: "grid",
  fontSize: 11,
  fontWeight: 900,
  gap: 8,
  gridTemplateColumns: tableColumns,
  minWidth: 0,
  padding: "10px 18px 10px 12px",
  textTransform: "uppercase",
};

const viewportStyle: React.CSSProperties = {
  background: "#0B0E14",
  border: "1px solid #263244",
  borderRadius: 8,
  overflowX: "hidden",
  overflowY: "auto",
  paddingRight: 2,
  scrollbarGutter: "stable",
};

const rowStyle: React.CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: 0,
  borderBottom: "1px solid #1F2937",
  color: "#E5E7EB",
  cursor: "pointer",
  display: "grid",
  gap: 8,
  gridTemplateColumns: tableColumns,
  left: 0,
  minHeight: 64,
  minWidth: 0,
  overflow: "hidden",
  padding: "10px 18px 10px 12px",
  position: "absolute",
  textAlign: "left",
  top: 0,
  width: "100%",
};

const symbolCellStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  minWidth: 0,
};

const numericCellStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontVariantNumeric: "tabular-nums",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const emptyStateStyle: React.CSSProperties = {
  color: "#94A3B8",
  display: "grid",
  inset: 0,
  placeItems: "center",
  position: "absolute",
};
