# Deployment: 0x API & Google News

To fix **0x API** errors and **"News temporarily unavailable"** in production (e.g. olympus.omeganetwork.co), configure the following.

---

## Quick checklist

| Issue | Fix |
|-------|-----|
| **Prices $0.0000 / "0x API: The input is invalid"** | Render: set `ZEROX_API_KEY`. App now falls back to CoinGecko when 0x fails, so you may see a price even if 0x is wrong. |
| **News "temporarily unavailable"** | **Vercel:** set `VITE_API_URL=https://olympus-api-n3xm.onrender.com` (your Render URL), then **redeploy** the frontend. News is loaded from your backend; if the frontend doesn’t know the backend URL, it never reaches it. |
| **Both still broken** | 1) Open `https://olympus-api-n3xm.onrender.com/api/health` in a browser — should return `{"ok":true,...}`. 2) In Vercel, confirm the env var is set and trigger a new deploy. |

---

## 1. Backend (Render)

The backend (Node API) must run on Render (or another host). It proxies 0x and fetches Google News.

### Render → Your Web Service → Environment

Add:

| Variable | Value | Required |
|----------|--------|----------|
| **`ZEROX_API_KEY`** | Your 0x API key from [0x.org](https://0x.org/docs/api#request-access) | **Yes** (for prices/swaps) |
| `NODE_ENV` | `production` | Recommended |
| `EZ_PEZE_ESCROW_PRIVATE_KEY` | Your escrow wallet key (for EZ Peeze) | Optional |
| `OMEGA_RPC` | Omega RPC URL | Optional |

- **0x:** The server uses `ZEROX_API_KEY` (or `VITE_0X_API_KEY`) when calling `api.0x.org`. Without it, 0x returns errors and you see "$0.0000" and the red banner.
- **News:** Google News RSS is fetched by the server (no API key). As long as the backend is reachable, news works. If news still fails, check that the Render service is running and not blocked by firewall.

After adding env vars, **redeploy** the Render service.

---

## 2. Frontend (Vercel)

The frontend is static (Vite build). It must know the **backend URL** so it can call `/api/zerox/*`, `/api/crypto-news`, `/api/news`, etc.

### Vercel → Your Project → Settings → Environment Variables

Add:

| Variable | Value | Required |
|----------|--------|----------|
| **`VITE_API_URL`** | Your backend URL, e.g. `https://your-app-name.onrender.com` | **Yes** |

- Use the **exact** Render URL (no trailing slash).
- Redeploy the frontend after adding this so the new value is baked into the build.

**You do not need to set the 0x API key in Vercel.** The browser calls your backend; the backend uses `ZEROX_API_KEY` to call 0x.

---

## Checklist

1. **Render:** `ZEROX_API_KEY` set → redeploy API.
2. **Vercel:** `VITE_API_URL` = your Render URL (e.g. `https://olympus-api-n3xm.onrender.com`) → **redeploy frontend** (env vars are baked in at build time).
3. **News:** The frontend calls `VITE_API_URL + "/api/crypto-news"`. If `VITE_API_URL` is not set on Vercel, the app requests `/api/crypto-news` on the same domain (your Vercel site), which has no such route → "News temporarily unavailable". Fix: set `VITE_API_URL` and redeploy.
4. Verify: open `https://your-render-url.onrender.com/api/health` — should return `{"ok":true}`.

---

## Optional: Same host (Vercel serverless)

If you later move the API to Vercel (e.g. serverless functions), set the 0x key in Vercel as well (e.g. `ZEROX_API_KEY`) and point `VITE_API_URL` at that same Vercel project’s API routes.
