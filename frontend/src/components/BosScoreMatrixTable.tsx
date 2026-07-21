import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { BosSignal, SignalRow } from "../types/market";

export interface BosScoreMatrixTableProps {
  rows: SignalRow[];
  height?: number;
  onSelectTicker?: (symbol: string) => void;
}

type BosRankFilter = "ALL" | "STRONG_BUY" | "NEUTRAL" | "RISK";

const COLUMN_TEMPLATE =
  "104px 92px 132px 112px 118px 124px 114px 82px 82px 88px 88px 112px 88px 94px 132px 112px";
const SYMBOL_COL_WIDTH = 104;
const ROW_HEIGHT = 52;

export function BosScoreMatrixTable({
  rows,
  height = 620,
  onSelectTicker,
}: BosScoreMatrixTableProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sector, setSector] = useState("ALL");
  const [rank, setRank] = useState<BosRankFilter>("ALL");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 140);
    return () => window.clearTimeout(timer);
  }, [query]);

  const sectors = useMemo(() => {
    const unique = new Set(rows.map((row) => row.sector || "VN").filter(Boolean));
    return ["ALL", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return rows
      .filter((row) => {
        const haystack = `${row.symbol} ${row.companyName} ${row.sector}`.toLowerCase();
        const matchesSearch = !needle || haystack.includes(needle);
        const matchesSector = sector === "ALL" || row.sector === sector;
        const matchesRank =
          rank === "ALL"
          || (rank === "STRONG_BUY" && row.sBos >= 70)
          || (rank === "NEUTRAL" && row.sBos >= 40 && row.sBos <= 60)
          || (rank === "RISK" && row.sBos < 40);
        return matchesSearch && matchesSector && matchesRank;
      })
      .sort((a, b) => b.sBos - a.sBos || a.symbol.localeCompare(b.symbol));
  }, [debouncedQuery, rank, rows, sector]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <section className="bos-matrix" aria-label="BOS score matrix">
      <MatrixStyles height={height} />
      <div className="bos-matrix-toolbar">
        <input
          aria-label="Tim nhanh ma co phieu"
          placeholder="Tim ma, cong ty..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Loc nganh"
          value={sector}
          onChange={(event) => setSector(event.target.value)}
        >
          {sectors.map((item) => (
            <option key={item} value={item}>
              {item === "ALL" ? "Tat ca nganh" : item}
            </option>
          ))}
        </select>
        <select
          aria-label="Loc xep hang S_BOS"
          value={rank}
          onChange={(event) => setRank(event.target.value as BosRankFilter)}
        >
          <option value="ALL">Tat ca S_BOS</option>
          <option value="STRONG_BUY">Mua manh &gt;= 70</option>
          <option value="NEUTRAL">Trung lap 40-60</option>
          <option value="RISK">Rui ro &lt; 40</option>
        </select>
        <span className="bos-matrix-count">{filteredRows.length.toLocaleString("vi-VN")} dong</span>
      </div>

      <div className="bos-matrix-scroll" ref={parentRef}>
        <div className="bos-matrix-inner" style={{ height: rowVirtualizer.getTotalSize() + ROW_HEIGHT }}>
          <div className="bos-matrix-row bos-matrix-head">
            <HeaderCell sticky left={0}>Ma CP</HeaderCell>
            <HeaderCell sticky left={SYMBOL_COL_WIDTH}>S_BOS</HeaderCell>
            <HeaderCell>Nganh</HeaderCell>
            <HeaderCell>Momentum</HeaderCell>
            <HeaderCell>Volume/CVD</HeaderCell>
            <HeaderCell>Foreign Flow</HeaderCell>
            <HeaderCell>Valuation</HeaderCell>
            <HeaderCell>P/E</HeaderCell>
            <HeaderCell>P/B</HeaderCell>
            <HeaderCell>ROE %</HeaderCell>
            <HeaderCell>EPS %</HeaderCell>
            <HeaderCell>No/VCSH</HeaderCell>
            <HeaderCell>RSI 14</HeaderCell>
            <HeaderCell>1M %</HeaderCell>
            <HeaderCell>NN 5 phien</HeaderCell>
            <HeaderCell>Khuyen nghi</HeaderCell>
          </div>

          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = filteredRows[virtualRow.index];
            return (
              <button
                className="bos-matrix-row bos-matrix-body-row"
                key={`${row.id}-${virtualRow.index}`}
                onClick={() => onSelectTicker?.(row.symbol)}
                style={{ transform: `translateY(${virtualRow.start + ROW_HEIGHT}px)` }}
                type="button"
              >
                <BodyCell sticky left={0}>
                  <strong>{row.symbol}</strong>
                  <span>{row.companyName}</span>
                </BodyCell>
                <BodyCell sticky left={SYMBOL_COL_WIDTH}>
                  <ScoreBadge value={row.sBos} />
                </BodyCell>
                <BodyCell>{row.sector || "--"}</BodyCell>
                <BodyCell mono>{formatScore(row.factors.momentum)}</BodyCell>
                <BodyCell mono>{formatScore(row.factors.volumeDelta)}</BodyCell>
                <BodyCell mono>{formatScore(row.factors.foreignFlow)}</BodyCell>
                <BodyCell mono>{formatScore(row.factors.valuation)}</BodyCell>
                <BodyCell mono>{formatOptionalNumber(row.pe)}</BodyCell>
                <BodyCell mono>{formatOptionalNumber(row.pb)}</BodyCell>
                <BodyCell mono>{formatPct(row.roePct)}</BodyCell>
                <BodyCell mono>{formatPct(row.epsGrowthPct)}</BodyCell>
                <BodyCell mono>{formatOptionalNumber(row.debtToEquity)}</BodyCell>
                <BodyCell mono>{formatOptionalNumber(row.rsi14)}</BodyCell>
                <BodyCell mono tone={toneFromNumber(row.oneMonthChangePct)}>{formatSignedPct(row.oneMonthChangePct)}</BodyCell>
                <BodyCell mono tone={toneFromNumber(row.foreignNet5dBillion)}>{formatBillion(row.foreignNet5dBillion)}</BodyCell>
                <BodyCell>
                  <ActionBadge signal={row.signal} sBos={row.sBos} />
                </BodyCell>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HeaderCell({
  children,
  left,
  sticky = false,
}: {
  children: ReactNode;
  left?: number;
  sticky?: boolean;
}) {
  return (
    <div className={sticky ? "bos-matrix-cell bos-matrix-sticky" : "bos-matrix-cell"} style={sticky ? { left } : undefined}>
      {children}
    </div>
  );
}

function BodyCell({
  children,
  left,
  mono = false,
  sticky = false,
  tone,
}: {
  children: ReactNode;
  left?: number;
  mono?: boolean;
  sticky?: boolean;
  tone?: "up" | "down" | "flat";
}) {
  const className = [
    "bos-matrix-cell",
    sticky ? "bos-matrix-sticky" : "",
    mono ? "bos-matrix-mono" : "",
    tone ? `bos-tone-${tone}` : "",
  ].filter(Boolean).join(" ");
  return (
    <div className={className} style={sticky ? { left } : undefined}>
      {children}
    </div>
  );
}

function ScoreBadge({ value }: { value: number }) {
  const tone = value >= 70 ? "buy" : value < 40 ? "sell" : "watch";
  return <span className={`bos-score-badge bos-score-${tone}`}>{value.toFixed(0)}</span>;
}

function ActionBadge({ signal, sBos }: { signal: BosSignal; sBos: number }) {
  const action = signal === "SELL" || sBos < 40 ? "BAN" : sBos >= 70 ? "MUA" : "THEO DOI";
  const tone = action === "MUA" ? "buy" : action === "BAN" ? "sell" : "watch";
  return <span className={`bos-action-badge bos-action-${tone}`}>{action}</span>;
}

function formatScore(value: number) {
  return Number.isFinite(value) ? value.toFixed(0) : "--";
}

function formatOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "--";
}

function formatPct(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}%` : "--";
}

function formatSignedPct(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatBillion(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} ty`;
}

function toneFromNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

function MatrixStyles({ height }: { height: number }) {
  return (
    <style>
      {`
        .bos-matrix { display: grid; gap: 12px; min-width: 0; }
        .bos-matrix-toolbar {
          align-items: center;
          display: grid;
          gap: 8px;
          grid-template-columns: minmax(170px, 1fr) minmax(130px, 0.55fr) minmax(150px, 0.65fr) auto;
        }
        .bos-matrix-toolbar input,
        .bos-matrix-toolbar select {
          background: #0f1623;
          border: 1px solid var(--bos-border, #263244);
          border-radius: 7px;
          color: var(--bos-text, #e5e7eb);
          height: 38px;
          min-width: 0;
          outline: none;
          padding: 0 10px;
        }
        .bos-matrix-toolbar input:focus,
        .bos-matrix-toolbar select:focus {
          border-color: var(--bos-up, #10b981);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.14);
        }
        .bos-matrix-count {
          color: var(--bos-muted, #94a3b8);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .bos-matrix-scroll {
          border: 1px solid var(--bos-border, #263244);
          border-radius: 8px;
          height: ${height}px;
          max-width: 100%;
          overflow: auto;
          position: relative;
          scrollbar-gutter: stable;
        }
        .bos-matrix-inner {
          min-width: 1660px;
          position: relative;
          width: max-content;
        }
        .bos-matrix-row {
          display: grid;
          grid-template-columns: ${COLUMN_TEMPLATE};
          min-width: 1660px;
          width: 100%;
        }
        .bos-matrix-head {
          background: #111827;
          border-bottom: 1px solid var(--bos-border, #263244);
          height: ${ROW_HEIGHT}px;
          left: 0;
          position: sticky;
          top: 0;
          z-index: 12;
        }
        .bos-matrix-body-row {
          background: transparent;
          border: 0;
          border-bottom: 1px solid rgba(38, 50, 68, 0.74);
          color: inherit;
          cursor: pointer;
          height: ${ROW_HEIGHT}px;
          left: 0;
          padding: 0;
          position: absolute;
          text-align: left;
        }
        .bos-matrix-body-row:hover .bos-matrix-cell { background: rgba(16, 185, 129, 0.08); }
        .bos-matrix-cell {
          align-content: center;
          background: #151d2a;
          color: var(--bos-text, #e5e7eb);
          font-size: 12px;
          min-width: 0;
          overflow: hidden;
          padding: 7px 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bos-matrix-head .bos-matrix-cell {
          background: #111827;
          color: var(--bos-muted, #94a3b8);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
        }
        .bos-matrix-sticky {
          box-shadow: 1px 0 0 var(--bos-border, #263244);
          position: sticky;
          z-index: 8;
        }
        .bos-matrix-head .bos-matrix-sticky { z-index: 14; }
        .bos-matrix-cell strong {
          color: #f8fafc;
          display: block;
          font-size: 13px;
          line-height: 1.15;
        }
        .bos-matrix-cell span:not(.bos-score-badge):not(.bos-action-badge) {
          color: var(--bos-muted, #94a3b8);
          display: block;
          font-size: 11px;
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bos-matrix-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-variant-numeric: tabular-nums;
        }
        .bos-score-badge,
        .bos-action-badge {
          border-radius: 6px;
          display: inline-flex;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
          font-weight: 950;
          justify-content: center;
          min-width: 58px;
          padding: 5px 8px;
        }
        .bos-action-badge { min-width: 76px; }
        .bos-score-buy,
        .bos-action-buy { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .bos-score-watch,
        .bos-action-watch { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .bos-score-sell,
        .bos-action-sell { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .bos-tone-up { color: #34d399; }
        .bos-tone-down { color: #f87171; }
        .bos-tone-flat { color: var(--bos-muted, #94a3b8); }
        @media (max-width: 760px) {
          .bos-matrix-toolbar { grid-template-columns: 1fr; }
          .bos-matrix-count { justify-self: start; }
        }
      `}
    </style>
  );
}
