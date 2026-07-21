# BuyOrSell 4.0 Quant Signal Engine

## [So do/Kien truc]

```
Realtime ticks / snapshots
        |
        v
Polars micro-batch normalization
        |
        +-- Momentum factor
        +-- Volume Delta / CVD factor
        +-- Foreign Flow factor
        +-- Valuation factor
        |
        v
Deterministic S_BOS + factor breakdown
        |
        v
Redis L2 cache / BFF / AI explanation layer
```

`bos_quant` is the deterministic layer only. It does not fetch data, call LLMs, emit buy/sell decisions, or write narrative text.

## [Thuat toan/Code mau]

```python
import polars as pl
from bos_quant import compute_bos_scores

quotes = pl.DataFrame([
    {
        "symbol": "TCB",
        "price": 34.5,
        "prev_close": 33.8,
        "open": 34.0,
        "volume": 4_052_000,
        "adv20": 3_200_000,
        "buy_volume": 2_300_000,
        "sell_volume": 1_752_000,
        "foreign_buy_value": 92_000_000_000,
        "foreign_sell_value": 61_000_000_000,
        "market_cap": 242_000_000_000_000,
        "pe": 7.8,
        "pb": 1.1,
        "sector_pe": 10.5,
        "sector_pb": 1.5,
        "roe": 0.18,
    }
])

scores = compute_bos_scores(quotes)
```

Output columns include `s_bos`, each factor score, weighted points, raw factor values, foreign net flow, and `data_quality`.

CLI usage:

```powershell
python scripts/bos_quant_cli.py .\quotes.ndjson --top 20 --json
```

## [Ly do ky thuat & Toi uu]

- Polars expressions run vectorized over realtime micro-batches, so ranking hundreds or thousands of symbols stays deterministic and low latency.
- Scores use cross-sectional z-score normalization: each factor becomes `50 + z * 12.5`, clipped to `0..100`.
- Missing factor data is neutralized at `50`, never guessed.
- Default weights: Momentum `35%`, Volume Delta/CVD `25%`, Foreign Flow `25%`, Valuation `15%`.
