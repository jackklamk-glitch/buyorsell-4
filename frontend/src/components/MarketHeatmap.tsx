import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import type { BosFactorBreakdown, BosSignal } from "../types/market";

export type HeatmapSizeMetric = "marketCap" | "sessionVolume";

export interface MarketHeatmapTicker {
  symbol: string;
  companyName: string;
  sector: string;
  marketCap: number;
  sessionVolume: number;
  matchedPrice: number;
  priceChangePct: number;
  sBos: number;
  signal: BosSignal;
  factors: BosFactorBreakdown;
}

interface MarketHeatmapProps {
  data: MarketHeatmapTicker[];
  height?: number;
  defaultSizeMetric?: HeatmapSizeMetric;
  onSelectTicker?: (symbol: string) => void;
}

interface TreemapDatum {
  name: string;
  value: [number, number];
  itemStyle: { color: string };
  ticker: MarketHeatmapTicker;
}

export function MarketHeatmap({
  data,
  height = 620,
  defaultSizeMetric = "marketCap",
  onSelectTicker,
}: MarketHeatmapProps) {
  const [sizeMetric, setSizeMetric] = useState<HeatmapSizeMetric>(defaultSizeMetric);

  const option = useMemo<EChartsOption>(() => {
    const treeData: TreemapDatum[] = data.map((ticker) => ({
      name: ticker.symbol,
      value: [Math.max(1, ticker[sizeMetric]), ticker.sBos],
      itemStyle: { color: getBosColor(ticker.sBos) },
      ticker,
    }));

    return {
      backgroundColor: "transparent",
      animationDurationUpdate: 180,
      tooltip: {
        confine: true,
        backgroundColor: "#151D2A",
        borderColor: "#263244",
        textStyle: { color: "#E5E7EB" },
        formatter: (params: unknown) => {
          const item = (Array.isArray(params) ? params[0] : params) as {
            data?: TreemapDatum;
          };
          const ticker = item.data?.ticker;
          if (!ticker) return "";
          return [
            `<strong>${ticker.symbol}</strong> - ${ticker.companyName}`,
            `Ngành: ${ticker.sector}`,
            `Giá khớp: ${formatNumber(ticker.matchedPrice)}`,
            `Tăng/Giảm: ${ticker.priceChangePct.toFixed(2)}%`,
            `Khối lượng: ${formatNumber(ticker.sessionVolume)}`,
            `S_BOS: ${ticker.sBos.toFixed(2)}`,
            `Hành động: ${ticker.signal}`,
          ].join("<br/>");
        },
      },
      series: [
        {
          type: "treemap",
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          upperLabel: { show: false },
          label: {
            show: true,
            formatter: (params: unknown) => {
              const item = params as { data?: TreemapDatum | null };
              const ticker = item.data?.ticker;
              if (!ticker) return "";
              return `{symbol|${ticker.symbol}}\n{score|S_BOS ${ticker.sBos.toFixed(0)}}`;
            },
            rich: {
              symbol: { color: "#F8FAFC", fontSize: 14, fontWeight: 900 },
              score: { color: "#CBD5E1", fontSize: 11, lineHeight: 18 },
            },
          },
          itemStyle: {
            borderColor: "#0B0E14",
            borderWidth: 2,
            gapWidth: 2,
          },
          emphasis: {
            itemStyle: {
              borderColor: "#E5E7EB",
              borderWidth: 2,
            },
          },
          data: treeData,
        },
      ],
    };
  }, [data, sizeMetric]);

  return (
    <section aria-label="Market heatmap treemap">
      <div style={toolbarStyle}>
        <span style={toolbarLabelStyle}>Kích thước ô</span>
        <button
          type="button"
          aria-pressed={sizeMetric === "marketCap"}
          onClick={() => setSizeMetric("marketCap")}
          style={segmentButtonStyle(sizeMetric === "marketCap")}
        >
          Vốn hóa
        </button>
        <button
          type="button"
          aria-pressed={sizeMetric === "sessionVolume"}
          onClick={() => setSizeMetric("sessionVolume")}
          style={segmentButtonStyle(sizeMetric === "sessionVolume")}
        >
          Thanh khoản
        </button>
        <div style={legendStyle} aria-label="S_BOS color legend">
          <LegendSwatch color="#EF4444" label="< 40" />
          <LegendSwatch color="#F59E0B" label="40-60" />
          <LegendSwatch color="#10B981" label="> 70" />
        </div>
      </div>
      <ReactECharts
        option={option}
        style={{ height, width: "100%" }}
        notMerge
        lazyUpdate
        onEvents={{
          click: (params: { data?: TreemapDatum }) => {
            const symbol = params.data?.ticker.symbol;
            if (symbol) onSelectTicker?.(symbol);
          },
        }}
      />
    </section>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span style={legendItemStyle}>
      <span style={{ ...legendDotStyle, background: color }} />
      {label}
    </span>
  );
}

function getBosColor(sBos: number) {
  if (sBos < 40) return "#EF4444";
  if (sBos <= 60) return "#F59E0B";
  if (sBos > 70) return "#10B981";
  return "#38BDF8";
}

function formatNumber(value: number) {
  return Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

const toolbarStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 12,
};

const toolbarLabelStyle: React.CSSProperties = {
  color: "#94A3B8",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

function segmentButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "#10B981" : "#0F1623",
    border: "1px solid #263244",
    borderRadius: 6,
    color: active ? "#03110C" : "#CBD5E1",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 34,
    padding: "0 11px",
  };
}

const legendStyle: React.CSSProperties = {
  alignItems: "center",
  display: "inline-flex",
  gap: 8,
  marginLeft: "auto",
};

const legendItemStyle: React.CSSProperties = {
  alignItems: "center",
  color: "#CBD5E1",
  display: "inline-flex",
  fontSize: 12,
  gap: 5,
};

const legendDotStyle: React.CSSProperties = {
  borderRadius: 999,
  display: "inline-block",
  height: 9,
  width: 9,
};
