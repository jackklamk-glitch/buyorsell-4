import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { SignalRow } from "../types/market";

interface VirtualSignalTableProps {
  rows: SignalRow[];
  height?: number;
  onSelect?: (row: SignalRow) => void;
}

export function VirtualSignalTable({
  rows,
  height = 640,
  onSelect,
}: VirtualSignalTableProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 10,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const header = useMemo(
    () => (
      <div style={headerStyle}>
        <span>Symbol</span>
        <span>Signal</span>
        <span>S_BOS</span>
        <span>Price %</span>
        <span>Volume</span>
        <span>Updated</span>
      </div>
    ),
    [],
  );

  return (
    <section aria-label="Virtualized signal table">
      {header}
      <div ref={parentRef} style={{ ...viewportStyle, height }}>
        <div style={{ height: totalSize, position: "relative" }}>
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect?.(row)}
                style={{
                  ...rowStyle,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <strong>{row.symbol}</strong>
                <span>{row.signal}</span>
                <span>{row.sBos.toFixed(2)}</span>
                <span style={{ color: row.priceChangePct >= 0 ? "#22c55e" : "#ef4444" }}>
                  {row.priceChangePct.toFixed(2)}%
                </span>
                <span>{Intl.NumberFormat("vi-VN").format(row.volume)}</span>
                <span>{new Date(row.updatedAt).toLocaleTimeString("vi-VN")}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const headerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
  gap: 12,
  padding: "10px 12px",
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  borderBottom: "1px solid #23344f",
};

const viewportStyle: React.CSSProperties = {
  overflow: "auto",
  border: "1px solid #23344f",
  borderRadius: 8,
  background: "#020617",
};

const rowStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  minHeight: 72,
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
  gap: 12,
  alignItems: "center",
  padding: "12px",
  border: 0,
  borderBottom: "1px solid #1e293b",
  background: "transparent",
  color: "#e2e8f0",
  textAlign: "left",
  cursor: "pointer",
};
