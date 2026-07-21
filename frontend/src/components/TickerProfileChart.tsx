import { useEffect, useRef } from "react";
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

interface TickerProfileChartProps {
  bars: OhlcvBar[];
  markers: BosSignalMarker[];
  height?: number;
}

export function TickerProfileChart({
  bars,
  markers,
  height = 420,
}: TickerProfileChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const chart = createChart(hostRef.current, {
      height,
      layout: {
        background: { color: "#020617" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", timeVisible: true },
      crosshair: { mode: 1 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#38bdf8",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: Math.floor(entry.contentRect.width), height });
    });
    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
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
      color: bar.close >= bar.open ? "#16a34a66" : "#dc262666",
    }));
    const seriesMarkers: SeriesMarker<Time>[] = markers.map((marker) => ({
      time: marker.time as Time,
      position: marker.signal === "BUY" ? "belowBar" : "aboveBar",
      color: marker.signal === "BUY" ? "#22c55e" : "#ef4444",
      shape: marker.signal === "BUY" ? "arrowUp" : "arrowDown",
      text: `${marker.signal} S_BOS ${marker.sBos.toFixed(1)}`,
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    createSeriesMarkers(candleSeries, seriesMarkers);
    chartRef.current?.timeScale().fitContent();
  }, [bars, markers]);

  return <div ref={hostRef} style={{ width: "100%", height }} />;
}
