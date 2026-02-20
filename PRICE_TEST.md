# Price API – manual tests (curl)

Use these from a terminal to confirm the Render API and 0x are working. Replace `API_BASE` with your Render URL (e.g. `https://olympus-api-n3xm.onrender.com`).

**Relayer (intended design):** The website does **not** call Binance from the browser (CORS). The **API server** calls Binance one-to-one, gets the price, and relays it back. So: **Browser → your API → Binance → your API → Browser**. The `/api/binance-price?symbol=XXX` endpoint is this relayer. Display price never comes from 0x (0x is for swaps only).

**Backend unified price order (for `/api/price`):** CoinGecko → CoinPaprika → Binance (no 0x for display).

## 1. Health (no key needed)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/health"
# Expect: {"ok":true,"service":"olympus-api","ts":...}
```

## 2. 0x key present (Render env)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/debug-0x"
# Expect: {"zeroxKeySet":true,"zeroxKeyLength":36}  (or similar length)
# If zeroxKeySet is false, set ZEROX_API_KEY or VITE_0X_API_KEY in Render and redeploy.
# Trim the key: no leading/trailing spaces or newlines (server trims automatically).
```

## 3. Binance relayer (primary for display: server → Binance → response)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/binance-price?symbol=AAVEUSDT"
# Expect: {"price":123.45,"symbol":"AAVEUSDT"}  (or 502 if Binance unreachable).
# This is the one-to-one relayer: your server calls Binance, returns the number.
```

## 4. Unified price (CoinGecko → CoinPaprika → Binance on server)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/price?pairId=ETH/USDC"
# Expect: {"price":1940.5,"source":"coingecko","pairId":"ETH/USDC"}  (or "coinpaprika"/"binance")
# If 502: all sources failed (check Render logs).
```

## 5. 0x price proxy (swaps only; not used for display) (raw 0x API via your backend)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/zerox/price?chainId=1&sellToken=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&buyToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&sellAmount=1000000000000000000&taker=0x0000000000000000000000000000000000000000"
# Expect: JSON with "buyAmount" (USDC units). 400 = bad params or 0x API issue; 502 = proxy error.
```

## 6. CoinGecko (can 502 from Render due to rate limit)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/coingecko-price?id=ethereum"
# Expect: {"price":1940.5,"id":"ethereum"}  or 502 if CoinGecko fails.
```

## 7. Binance proxy (same as #3; alternate test)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/binance-price?symbol=ETHUSDT"
# Expect: {"price":1940.5,"symbol":"ETHUSDT"}  or 502 if Binance fails.
```

## Why we can't "scrape" the price from the chart

The **chart** is TradingView's embedded widget (script/iframe from their domain). It receives Binance data **internally** and draws the chart. There is **no way** for our app to read that price back: TradingView does not expose a JavaScript API or callback for "current price" from the embed. So we **cannot** scrape the price off the chart. The only reliable approach is the **relayer**: our API server requests Binance (one-to-one), then returns the price to the website.

## Why the chart can show price but the header / EZ Peeze show $0.0000

The chart and our header use **different data paths**. The chart is fed by TradingView's own datafeed (Binance). Our **header and EZ Peeze** use React state (`orderBook.midPrice`), which we set only when **our** fetches succeed: first the relayer (`/api/binance-price` or your API_BASE), then CORS proxy, then `/api/price` / CoinGecko. If those fail (e.g. API not running locally, or timeout), the header stays at $0.0000 even though the chart shows a number.

 **TradingView does not offer a public REST API** for “get current price for symbol X”. The chart widget gets data from a **datafeed** you plug in (e.g. Binance). So the chart and our header price use different paths: the chart uses the TradingView datafeed (Binance/etc.), while we use the backend’s `/api/price` (0x, CoinGecko, CoinPaprika, Binance). Adding “TradingView API” isn’t an option; we rely on these backends instead.

## If prices still show $0.0000 in the app

1. **Ensure the API is reachable**: Local dev tries API_BASE (e.g. Render) first when on localhost so "npm run dev" alone can show prices.
2. Run **Binance relayer** test: `curl "https://olympus-api-n3xm.onrender.com/api/binance-price?symbol=AAVEUSDT"` – expect `{"price":...,"symbol":"AAVEUSDT"}`.
3. If 502: check Render logs; ensure the server can reach `https://api.binance.com/api/v3/ticker/price?symbol=...`.
4. Redeploy API on Render after any env changes.

## Production (olympus.omeganetwork.co) – “works local, not public”

- **CORS**: The API allows `https://olympus.omeganetwork.co`, `https://www.olympus.omeganetwork.co`, and any `*.omeganetwork.co`. If you use a different origin, set **NODE_ENV=production** on Render so the server allows any origin.
- **API URL**: The frontend uses `VITE_API_URL` / `VITE_API_BASE` at build time, or falls back to `https://olympus-api-n3xm.onrender.com`. No env needed for that fallback.
- **Cold start**: Render free tier spins down after ~15 min. The first request can take 30+ seconds. The app uses a 25s timeout and retries every 4s (up to 5 times), so after the service wakes, prices should appear. For faster first load, use a keep-warm cron (e.g. hit `/api/health` every 10 min) or a paid Render plan.
- **Same-origin /api**: The app tries same-origin `/api/coingecko-price` and `/api/coingecko-market` first. If your host (e.g. Vercel/Netlify) proxies `/api/*` to the Render API URL, prices will work without cross-origin and can avoid cold-start timeouts from the browser.
