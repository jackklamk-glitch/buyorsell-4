import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";

import type { BosSignalMarker, OhlcvBar } from "../types/market";

interface TickerChartProps {
  bars: OhlcvBar[];
  markers: BosSignalMarker[];
  height?: number;
}

export function TickerChart({ bars, markers, height = 520 }: TickerChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const normalizedMarkers = useMemo(
    () =>
      markers
        .slice()
        .sort((left, right) => left.time.localeCompare(right.time))
        .map<SeriesMarker<Time>>((marker) => ({
          time: marker.time as Time,
          position: marker.signal === "BUY" ? "belowBar" : "aboveBar",
          color: marker.signal === "BUY" ? "#10B981" : "#EF4444",
          shape: marker.signal === "BUY" ? "arrowUp" : "arrowDown",
          text: `${marker.signal} S_BOS ${marker.sBos.toFixed(1)}`,
        })),
    [markers],
  );

  useEffect(() => {
    if (!hostRef.current) return;

    const chart = createChart(hostRef.current, {
      autoSize: true,
      height,
      layout: {
        background: { color: "#0B0E14" },
        textColor: "#CBD5E1",
      },
      grid: {
        vertLines: { color: "#1F2937" },
        horzLines: { color: "#1F2937" },
      },
      rightPriceScale: {
        borderColor: "#263244",
        scaleMargins: { top: 0.08, bottom: 0.24 },
      },
      timeScale: {
        borderColor: "#263244",
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 4,
        timeVisible: true,
      },
      crosshair: { mode: 1 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#38BDF866",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!candleSeries || !volumeSeries) return;

    const candleData: CandlestickData<Time>[] = bars.map((bar) => ({
      time: bar.time as Time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));
    const volumeData: HistogramData<Time>[] = bars.map((bar) => ({
      time: bar.time as Time,
      value: bar.volume,
      color: bar.close >= bar.open ? "#10B98155" : "#EF444455",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    createSeriesMarkers(candleSeries, normalizedMarkers);
    chartRef.current?.timeScale().fitContent();
  }, [bars, normalizedMarkers]);

  return (
    <section aria-label="TradingView lightweight ticker chart" style={shellStyle}>
      <div ref={hostRef} style={{ height, minHeight: 320, width: "100%" }} />
    </section>
  );
}

const shellStyle: React.CSSProperties = {
  border: "1px solid #263244",
  borderRadius: 8,
  minWidth: 0,
  overflow: "hidden",
};
