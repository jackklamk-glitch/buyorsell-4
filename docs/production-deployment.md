# BuyOrSell 4.0 Production Deployment

## [So do/Kien truc]

```
GitHub Actions
  test -> build Docker images -> push GHCR -> SSH deploy
        |
        v
docker compose
  redis
  quant-engine
  web-bff
```

`quant-engine` exposes `/health` and `/score`. `web-bff` exposes `/api/health`, `/api/bff-dashboard`, alerts, and the existing Vnstock APIs.

## [Thuat toan/Code mau]

Local server bootstrap:

```bash
mkdir -p /opt/buyorsell-4
cd /opt/buyorsell-4
cp .env.production.example .env
docker compose up -d
```

Required GitHub Actions secrets:

- `PROD_SERVER_HOST`
- `PROD_SERVER_USER`
- `PROD_SSH_PRIVATE_KEY`

Runtime environment:

- `REDIS_PASSWORD`
- `OPENAI_API_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `TELEGRAM_ALERT_WEBHOOK_URL`
- `ZALO_OA_WEBHOOK_URL`

## [Ly do ky thuat & Toi uu]

- Multi-stage Dockerfiles keep runtime images smaller than builder images.
- Redis is shared by rate limiting, stale cache, and future watchlist/ranking caches.
- Health checks protect deployment by verifying both Python and Node services.
- Root workflow `.github/workflows/buyorsell-4-ci-cd.yml` is the workflow GitHub will execute for this workspace repo.
