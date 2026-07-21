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
  { id: "all", label: "Tất cả" },
  { id: "strongBuy", label: "Tín hiệu MUA mạnh" },
  { id: "volumeSpike", label: "Đột biến Khối lượng" },
  { id: "foreignNetBuy", label: "Khối ngoại Mua ròng" },
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
        if (activeFilter === "strongBuy") return row.sBos >= 80;
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
          placeholder="Tìm mã..."
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

      <div style={tableScrollStyle}>
        <div style={headerStyle}>
          <span>Mã CP</span>
          <span>Ngành</span>
          <span>Giá Khớp</span>
          <span>% Tăng/Giảm</span>
          <span>Khối Lượng</span>
          <span>Điểm S_BOS</span>
          <span>Hành Động</span>
        </div>

        <div ref={parentRef} style={{ ...viewportStyle, height }}>
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
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
                  <strong>{row.symbol}</strong>
                  <span>{row.sector}</span>
                  <span style={numericCellStyle}>{formatCurrency(row.matchedPrice)}</span>
                  <span style={{ color: row.priceChangePct >= 0 ? "#10B981" : "#EF4444" }}>
                    {row.priceChangePct >= 0 ? "+" : ""}
                    {row.priceChangePct.toFixed(2)}%
                  </span>
                  <span style={numericCellStyle}>{formatNumber(row.volume)}</span>
                  <span style={{ ...numericCellStyle, color: getBosTone(row.sBos), fontWeight: 900 }}>
                    {row.sBos.toFixed(1)}
                  </span>
                  <span style={actionPillStyle(row.signal)}>{row.signal}</span>
                </button>
              );
            })}
            {filteredRows.length === 0 ? (
              <div style={emptyStateStyle}>Không có tín hiệu phù hợp bộ lọc.</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function getBosTone(sBos: number) {
  if (sBos < 40) return "#EF4444";
  if (sBos <= 60) return "#F59E0B";
  if (sBos > 70) return "#10B981";
  return "#38BDF8";
}

function formatNumber(value: number) {
  return Intl.NumberFormat("vi-VN").format(value);
}

function formatCurrency(value: number) {
  return Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

const filterBarStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 10,
};

const quickSearchStyle: React.CSSProperties = {
  background: "#0F1623",
  border: "1px solid #263244",
  borderRadius: 6,
  color: "#E5E7EB",
  fontWeight: 800,
  minHeight: 34,
  minWidth: 120,
  outline: "none",
  padding: "0 10px",
};

const tableScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  overflowY: "hidden",
  width: "100%",
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

const headerStyle: React.CSSProperties = {
  color: "#94A3B8",
  display: "grid",
  fontSize: 11,
  fontWeight: 900,
  gap: 10,
  gridTemplateColumns: "0.75fr 1fr 0.9fr 0.95fr 1fr 0.85fr 0.9fr",
  minWidth: 820,
  padding: "10px 12px",
  textTransform: "uppercase",
};

const viewportStyle: React.CSSProperties = {
  background: "#0B0E14",
  border: "1px solid #263244",
  borderRadius: 8,
  overflowX: "hidden",
  overflowY: "auto",
};

const rowStyle: React.CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: 0,
  borderBottom: "1px solid #1F2937",
  color: "#E5E7EB",
  cursor: "pointer",
  display: "grid",
  gap: 10,
  gridTemplateColumns: "0.75fr 1fr 0.9fr 0.95fr 1fr 0.85fr 0.9fr",
  left: 0,
  minHeight: 64,
  minWidth: 820,
  padding: "10px 12px",
  position: "absolute",
  textAlign: "left",
  top: 0,
  width: "100%",
};

const numericCellStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontVariantNumeric: "tabular-nums",
};

function actionPillStyle(signal: BosSignal): React.CSSProperties {
  const color = signal === "BUY" ? "#10B981" : signal === "SELL" || signal === "AVOID" ? "#EF4444" : "#F59E0B";
  return {
    border: `1px solid ${color}66`,
    borderRadius: 999,
    color,
    display: "inline-flex",
    fontSize: 11,
    fontWeight: 900,
    justifyContent: "center",
    maxWidth: 84,
    padding: "4px 8px",
  };
}

const emptyStateStyle: React.CSSProperties = {
  color: "#94A3B8",
  display: "grid",
  inset: 0,
  placeItems: "center",
  position: "absolute",
};
