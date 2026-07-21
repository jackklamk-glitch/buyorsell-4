import { createRoot } from "react-dom/client";

import { VirtualSignalTable } from "./components/VirtualSignalTable";
import type { SignalRow } from "./types/market";

const demoRows: SignalRow[] = [
  {
    id: "demo-TCB",
    symbol: "TCB",
    companyName: "Techcombank",
    signal: "WATCH",
    sBos: 63.5,
    price: 34.5,
    priceChangePct: 1.2,
    volume: 4_052_000,
    updatedAt: new Date().toISOString(),
    factors: { momentum: 70, volumeDelta: 62, foreignFlow: 58, valuation: 60 },
  },
];

function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e2e8f0",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
      }}
    >
      <VirtualSignalTable rows={demoRows} height={220} />
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
