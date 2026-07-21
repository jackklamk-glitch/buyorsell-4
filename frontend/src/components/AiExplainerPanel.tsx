import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

export interface RagCitation {
  id: string;
  source: string;
  title: string;
  url?: string;
  publishedAt?: string;
}

export interface RagNarrativeItem {
  title: string;
  detail: string;
  citations: RagCitation[];
}

export interface BosRagExplanationViewModel {
  symbol: string;
  sBos: number;
  weightBreakdown: {
    momentum: number;
    volumeDelta: number;
    foreignFlow: number;
    valuation: number;
  };
  keyCatalysts: RagNarrativeItem[];
  risks: RagNarrativeItem[];
  actionableScenario: {
    stance: string;
    entryZone: string;
    stopLoss: string;
    takeProfit: string;
    invalidation: string;
  };
}

interface AiExplainerPanelProps {
  explanation: BosRagExplanationViewModel;
  height?: number;
}

export function AiExplainerPanel({
  explanation,
  height = 260,
}: AiExplainerPanelProps) {
  const radarOption = useMemo<EChartsOption>(
    () => ({
      backgroundColor: "transparent",
      radar: {
        indicator: [
          { name: "Momentum", max: 100 },
          { name: "Volume/CVD", max: 100 },
          { name: "Foreign Flow", max: 100 },
          { name: "Valuation", max: 100 },
        ],
        radius: "62%",
        splitNumber: 4,
        axisName: { color: "#CBD5E1", fontSize: 11 },
        axisLine: { lineStyle: { color: "#263244" } },
        splitLine: { lineStyle: { color: "#263244" } },
        splitArea: {
          areaStyle: { color: ["rgba(21, 29, 42, 0.58)", "rgba(15, 22, 35, 0.72)"] },
        },
      },
      series: [
        {
          type: "radar",
          symbol: "circle",
          symbolSize: 5,
          data: [
            {
              value: [
                explanation.weightBreakdown.momentum,
                explanation.weightBreakdown.volumeDelta,
                explanation.weightBreakdown.foreignFlow,
                explanation.weightBreakdown.valuation,
              ],
              name: "Quant Factors",
              areaStyle: { color: "rgba(16, 185, 129, 0.24)" },
              lineStyle: { color: "#10B981", width: 2 },
              itemStyle: { color: "#10B981" },
            },
          ],
        },
      ],
      tooltip: { confine: true },
    }),
    [explanation.weightBreakdown],
  );

  return (
    <section aria-label="AI RAG explainer" style={panelStyle}>
      <div style={summaryGridStyle}>
        <div style={scoreCardStyle}>
          <span style={eyebrowStyle}>S_BOS</span>
          <strong style={scoreStyle}>{explanation.sBos.toFixed(1)}</strong>
          <span style={stanceStyle}>{explanation.actionableScenario.stance}</span>
        </div>
        <div style={radarWrapStyle}>
          <ReactECharts option={radarOption} style={{ height, width: "100%" }} notMerge lazyUpdate />
        </div>
      </div>

      <NarrativeSection icon="🚀" title="Động lực chính" items={explanation.keyCatalysts} tone="#10B981" />
      <NarrativeSection icon="⚠️" title="Rủi ro cần theo dõi" items={explanation.risks} tone="#EF4444" />

      <section style={scenarioStyle} aria-label="Actionable scenario">
        <h3 style={sectionTitleStyle}>🎯 Kịch bản hành động</h3>
        <dl style={scenarioGridStyle}>
          <ScenarioTerm label="Vùng giá Mua" value={explanation.actionableScenario.entryZone} />
          <ScenarioTerm label="Stop-loss" value={explanation.actionableScenario.stopLoss} />
          <ScenarioTerm label="Take-profit" value={explanation.actionableScenario.takeProfit} />
          <ScenarioTerm label="Vô hiệu" value={explanation.actionableScenario.invalidation} />
        </dl>
      </section>
    </section>
  );
}

function NarrativeSection({
  icon,
  title,
  items,
  tone,
}: {
  icon: string;
  title: string;
  items: RagNarrativeItem[];
  tone: string;
}) {
  return (
    <section style={narrativeSectionStyle}>
      <h3 style={{ ...sectionTitleStyle, color: tone }}>
        {icon} {title}
      </h3>
      <div style={narrativeListStyle}>
        {items.map((item) => (
          <article key={item.title} style={narrativeCardStyle}>
            <h4 style={narrativeTitleStyle}>{item.title}</h4>
            <p style={narrativeDetailStyle}>{item.detail}</p>
            <div style={citationListStyle}>
              {item.citations.map((citation) => (
                <CitationChip citation={citation} key={citation.id} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CitationChip({ citation }: { citation: RagCitation }) {
  const label = `${citation.source}: ${citation.title}`;
  if (citation.url) {
    return (
      <a href={citation.url} style={citationChipStyle} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return <span style={citationChipStyle}>{label}</span>;
}

function ScenarioTerm({ label, value }: { label: string; value: string }) {
  return (
    <div style={scenarioItemStyle}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  minWidth: 0,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "minmax(116px, 0.7fr) minmax(0, 1.3fr)",
  minWidth: 0,
};

const scoreCardStyle: React.CSSProperties = {
  alignContent: "center",
  background: "#0F1623",
  border: "1px solid #263244",
  borderRadius: 8,
  display: "grid",
  gap: 6,
  minWidth: 0,
  padding: 12,
};

const eyebrowStyle: React.CSSProperties = {
  color: "#94A3B8",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
};

const scoreStyle: React.CSSProperties = {
  color: "#10B981",
  fontSize: 34,
  lineHeight: 1,
};

const stanceStyle: React.CSSProperties = {
  color: "#E5E7EB",
  fontSize: 12,
  fontWeight: 900,
};

const radarWrapStyle: React.CSSProperties = {
  background: "#0F1623",
  border: "1px solid #263244",
  borderRadius: 8,
  minWidth: 0,
};

const narrativeSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  margin: 0,
};

const narrativeListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const narrativeCardStyle: React.CSSProperties = {
  background: "#0F1623",
  border: "1px solid #263244",
  borderRadius: 8,
  minWidth: 0,
  padding: 10,
};

const narrativeTitleStyle: React.CSSProperties = {
  color: "#E5E7EB",
  fontSize: 13,
  margin: "0 0 5px",
};

const narrativeDetailStyle: React.CSSProperties = {
  color: "#CBD5E1",
  margin: 0,
  overflowWrap: "anywhere",
};

const citationListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 8,
  minWidth: 0,
};

const citationChipStyle: React.CSSProperties = {
  background: "rgba(56, 189, 248, 0.12)",
  border: "1px solid rgba(56, 189, 248, 0.35)",
  borderRadius: 999,
  color: "#BAE6FD",
  fontSize: 11,
  maxWidth: "100%",
  overflow: "hidden",
  padding: "4px 7px",
  textDecoration: "none",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const scenarioStyle: React.CSSProperties = {
  background: "#0F1623",
  border: "1px solid #263244",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 12,
};

const scenarioGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  margin: 0,
};

const scenarioItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
};
