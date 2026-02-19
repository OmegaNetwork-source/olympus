# Deployment: Price display, News & Swaps

Production needs the **frontend** to reach your **backend** (Render). Price display uses **CoinGecko** by default; **0x** is only required for **swaps**.

---

## Quick checklist

| What you need | Why |
|---------------|-----|
| **Vercel: `VITE_API_URL`** = your Render URL | Frontend must call your API for prices (CoinGecko), news, and swaps. Without it, requests go to Vercel and get 404. |
| **Workaround if price still $0.0000** | Open the site once with `?api=https://YOUR-RENDER-URL.onrender.com` (e.g. `olympus.omeganetwork.co?api=https://olympus-api-n3xm.onrender.com`). The app saves it to localStorage so prices load from then on. |
| **Render: backend running** | Serves `/api/coingecko-price`, `/api/crypto-news`, `/api/zerox/*`. No API key needed for CoinGecko (free). |
| **Render: `ZEROX_API_KEY`** (optional for display) | Only needed when a user **executes a swap**. Header + EZ Peeze price use CoinGecko first. |

---

## 1. Backend (Render)

The backend serves CoinGecko-based prices, news, and (optionally) 0x swap proxy.

### Render → Your Web Service → Environment

| Variable | Value | Required |
|----------|--------|----------|
| `NODE_ENV` | `production` | Recommended |
| **`ZEROX_API_KEY`** or **`VITE_0X_API_KEY`** | Your 0x API key | **Only for swaps** (price display uses CoinGecko) |
| `EZ_PEZE_ESCROW_PRIVATE_KEY` | Escrow wallet key (EZ Peeze) | Optional |
| `OMEGA_RPC` | Omega RPC URL | Optional |

- **Price display:** The app asks your backend for `/api/coingecko-price?id=...`. The backend calls CoinGecko’s free API (no key). So prices work in production as long as the frontend can reach the backend.
- **News:** Same backend fetches Google News RSS (no key).
- **Swaps:** When the user clicks Swap, the frontend calls your backend’s `/api/zerox/quote`; the backend needs `ZEROX_API_KEY` to call 0x. If the key is missing, only the swap fails—price display still works.

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
