import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

import type { MarketHeatmapNode } from "../types/market";

type SizeMetric = "marketCap" | "volume";
type ColorMetric = "priceChangePct" | "sBos";

interface InteractiveTreemapHeatmapProps {
  data: MarketHeatmapNode[];
  height?: number;
  onSelect?: (node: MarketHeatmapNode) => void;
}

interface TreemapDatum {
  name: string;
  value: [number, number, number];
  node: MarketHeatmapNode;
}

export function InteractiveTreemapHeatmap({
  data,
  height = 520,
  onSelect,
}: InteractiveTreemapHeatmapProps) {
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>("marketCap");
  const [colorMetric, setColorMetric] = useState<ColorMetric>("sBos");

  const option = useMemo<EChartsOption>(() => {
    const colorRange: [number, number] =
      colorMetric === "sBos" ? [0, 100] : [-7, 7];

    const treeData: TreemapDatum[] = data.map((node) => ({
      name: node.symbol,
      value: [
        Math.max(1, node[sizeMetric]),
        colorMetric === "sBos" ? node.sBos : node.priceChangePct,
        node.sBos,
      ],
      node,
    }));

    return {
      animationDurationUpdate: 220,
      tooltip: {
        confine: true,
        formatter: (params: unknown) => {
          const event = (Array.isArray(params) ? params[0] : params) as {
            data?: TreemapDatum | null;
          };
          const node = event.data?.node;
          if (!node) return "";
          return [
            `<b>${node.symbol}</b> - ${node.companyName}`,
            `Tin hieu: ${node.signal}`,
            `S_BOS: ${node.sBos.toFixed(2)}`,
            `Gia: ${node.priceChangePct.toFixed(2)}%`,
            `Momentum: ${node.factors.momentum.toFixed(2)}`,
            `CVD: ${node.factors.volumeDelta.toFixed(2)}`,
            `Foreign: ${node.factors.foreignFlow.toFixed(2)}`,
            `Valuation: ${node.factors.valuation.toFixed(2)}`,
          ].join("<br/>");
        },
      },
      visualMap: {
        show: true,
        min: colorRange[0],
        max: colorRange[1],
        dimension: 1,
        orient: "horizontal",
        left: 12,
        bottom: 8,
        inRange: {
          color:
            colorMetric === "sBos"
              ? ["#991b1b", "#f59e0b", "#16a34a"]
              : ["#dc2626", "#334155", "#16a34a"],
        },
      },
      series: [
        {
          type: "treemap",
          roam: false,
          breadcrumb: { show: false },
          nodeClick: false,
          upperLabel: { show: false },
          label: {
            show: true,
            formatter: "{b}",
            fontWeight: 700,
            color: "#f8fafc",
          },
          itemStyle: {
            borderColor: "#0f172a",
            borderWidth: 2,
            gapWidth: 2,
          },
          levels: [
            {
              itemStyle: {
                borderColor: "#020617",
                borderWidth: 2,
                gapWidth: 2,
              },
            },
          ],
          data: treeData,
        },
      ],
    };
  }, [colorMetric, data, sizeMetric]);

  return (
    <section aria-label="Interactive market heatmap">
      <div style={toolbarStyle}>
        <SegmentedControl
          label="Size"
          value={sizeMetric}
          options={[
            ["marketCap", "Market Cap"],
            ["volume", "Volume"],
          ]}
          onChange={(value) => setSizeMetric(value as SizeMetric)}
        />
        <SegmentedControl
          label="Color"
          value={colorMetric}
          options={[
            ["sBos", "S_BOS"],
            ["priceChangePct", "Price %"],
          ]}
          onChange={(value) => setColorMetric(value as ColorMetric)}
        />
      </div>
      <ReactECharts
        option={option}
        style={{ height, width: "100%" }}
        notMerge
        lazyUpdate
        onEvents={{
          click: (params: { data?: TreemapDatum }) => {
            if (params.data?.node) onSelect?.(params.data.node);
          },
        }}
      />
    </section>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div style={segmentedGroupStyle} aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          style={{
            ...segmentStyle,
            background: value === id ? "#22d3ee" : "#0f172a",
            color: value === id ? "#02111f" : "#cbd5e1",
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 12,
};

const segmentedGroupStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: 2,
  border: "1px solid #23344f",
  borderRadius: 8,
  overflow: "hidden",
};

const segmentStyle: React.CSSProperties = {
  border: 0,
  padding: "8px 12px",
  fontWeight: 800,
  cursor: "pointer",
};
