# Price API – manual tests (curl)

Use these from a terminal to confirm the Render API and 0x are working. Replace `API_BASE` with your Render URL (e.g. `https://olympus-api-n3xm.onrender.com`).

**Backend price order:** 0x → CoinGecko → **CoinPaprika** (no key, easy fallback) → Binance.

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

## 3. Unified price (0x → CoinGecko → CoinPaprika → Binance on server)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/price?pairId=ETH/USDC"
# Expect: {"price":1940.5,"source":"0x","pairId":"ETH/USDC"}  (or source "coingecko"/"coinpaprika"/"binance")
# If 502: all sources failed (check Render logs).
```

## 4. 0x price proxy (raw 0x API via your backend)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/zerox/price?chainId=1&sellToken=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&buyToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&sellAmount=1000000000000000000&taker=0x0000000000000000000000000000000000000000"
# Expect: JSON with "buyAmount" (USDC units). 400 = bad params or 0x API issue; 502 = proxy error.
```

## 5. CoinGecko (can 502 from Render due to rate limit)

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/coingecko-price?id=ethereum"
# Expect: {"price":1940.5,"id":"ethereum"}  or 502 if CoinGecko fails.
```

## 6. Binance proxy

```bash
curl -s "https://olympus-api-n3xm.onrender.com/api/binance-price?symbol=ETHUSDT"
# Expect: {"price":1940.5,"symbol":"ETHUSDT"}  or 502 if Binance fails.
```

## Why the chart shows price but the header / EZ Peeze don't

The **chart** is TradingView's embed widget: it loads a symbol (e.g. `BINANCE:ETHUSDC`) and TradingView's servers pull Binance data and draw the chart. That happens **inside their iframe** – our app never receives that price. The **header and EZ Peeze** read from React state (`orderBook.midPrice`), which we set only when our own price fetches succeed (backend, then CORS-proxy fallback using the **same** Binance symbol as the chart). TradingView does not expose a "price API" – we mirror their source (Binance) ourselves.

**TradingView does not offer a public REST API** for “get current price for symbol X”. The chart widget gets data from a **datafeed** you plug in (e.g. Binance). So the chart and our header price use different paths: the chart uses the TradingView datafeed (Binance/etc.), while we use the backend’s `/api/price` (0x, CoinGecko, CoinPaprika, Binance). Adding “TradingView API” isn’t an option; we rely on these backends instead.

## If prices still show $0.0000 in the app

1. **Redeploy API on Render** after setting env (so `/api/price` and trimmed key are live).
2. In Render dashboard, set **ZEROX_API_KEY** (or VITE_0X_API_KEY) with your 0x API key; ensure no extra newline when pasting.
3. Run test 3: if `/api/price?pairId=ETH/USDC` returns a number, the frontend will use it.
4. Check Render logs for `[0x] price non-ok:` or CoinGecko/CoinPaprika/Binance errors.
