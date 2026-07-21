# BuyOrSell 4.0 Frontend Visualization Layer

## [So do/Kien truc]

```
BFF / Redis L2 cache
  normalized quotes + S_BOS + factor breakdown
        |
        v
React TypeScript visualization components
        |
        +-- InteractiveTreemapHeatmap: ECharts treemap
        +-- TickerProfileChart: TradingView Lightweight Charts
        +-- VirtualSignalTable: TanStack Virtual
```

The frontend receives deterministic values from the Quant Signal Engine. It does not calculate trading signals.

## [Thuat toan/Code mau]

```tsx
<InteractiveTreemapHeatmap
  data={heatmapNodes}
  onSelect={(node) => openTickerProfile(node.symbol)}
/>

<TickerProfileChart
  bars={ohlcvBars}
  markers={bosSignalMarkers}
/>

<VirtualSignalTable
  rows={signalRows}
  onSelect={(row) => openTickerProfile(row.symbol)}
/>
```

Treemap controls:

- Size metric: `marketCap` or `volume`.
- Color metric: `priceChangePct` or `sBos`.
- Tooltip: `S_BOS`, factor breakdown, and signal.

Ticker profile chart:

- Candlestick OHLCV data is rendered by Lightweight Charts.
- BUY markers are placed `belowBar`; SELL markers are placed `aboveBar`.
- Marker time must equal the deterministic signal timestamp from the Quant Signal Engine.

## [Ly do ky thuat & Toi uu]

- ECharts treemap handles hundreds of symbols without manual layout code.
- Lightweight Charts keeps OHLCV rendering GPU-friendly and fast.
- TanStack Virtual renders only visible signal rows with overscan, so long lists avoid DOM pressure and stay responsive near 60fps.
