# BuyOrSell 4.0 Alerting & API Governance

## [So do/Kien truc]

```
Realtime/BFF request
        |
        +-- Token Bucket rate limiter
        +-- Circuit Breaker + stale cache
        |
        v
Signals + RAG + Alerts
        |
        +-- Web Push service worker
        +-- Telegram webhook
        +-- Zalo OA webhook
```

Tầng 4 evaluates rules. Tầng 5 protects and aggregates APIs for the React UI.

## [Thuat toan/Code mau]

Rules engine:

```js
const { evaluateRules } = require('./api/lib/alert-rules');

const alerts = evaluateRules(currentRows, previousRows, [
  { id: 'bos_breakout', field: 's_bos', op: '>', value: 70 },
  { id: 'rsi_oversold', field: 'rsi14', op: '<', value: 30 },
  { id: 'foreign_turn', field: 'foreign_net_flow', op: 'crosses_above', value: 0 },
]);
```

BFF endpoint:

```http
GET /api/bff-dashboard?limit=20&includeRag=1
```

Response shape:

```json
{
  "ok": true,
  "data_degraded": false,
  "data": {
    "summary": {},
    "signals": [],
    "rag": {},
    "alerts": []
  }
}
```

Webhook dispatch uses these environment variables when configured:

- `TELEGRAM_ALERT_WEBHOOK_URL`
- `ZALO_OA_WEBHOOK_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## [Ly do ky thuat & Toi uu]

- Token Bucket is O(1) per request and backed by Redis when env is present.
- Circuit Breaker prevents repeated upstream pressure and returns cached stale data with `data_degraded=true`.
- BFF reduces frontend latency by combining Quant, RAG, and Alerts into one request.
- Alerts are rule-based and deterministic; webhooks are optional side effects guarded by explicit request payload/env.
