# Omega Limit Order Exchange

A fully functional limit order DEX UI with real order book, matching engine, and wallet connection.

## Quick Start

**Terminal 1 - Backend API:**
```bash
npm run dev:api
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Then open http://localhost:5173

## Features

- **Real order book** – Live bids/asks with instant matching
- **MetaMask wallet** – Connect with any EVM wallet
- **Place & cancel orders** – Limit and market orders
- **Real-time updates** – WebSocket push for order book and trades
- **Pro & Easy modes** – Full trading UI or simplified swap-style

## Architecture

- **Frontend**: React + Vite, connects to `/api` (proxied to backend)
- **Backend**: Express on port 3001, WebSocket on 3002
- **Order matching**: Price-time priority, instant execution

## Requirements

- MetaMask (or compatible Web3 wallet) for order placement
- Backend must be running for order book and trades

## EZ PEZE (Real Prediction Bets)

EZ PEZE uses real PRE for price-up/down bets with 1.5x payout to winners.

**Server setup:**
1. Create a new wallet to use as escrow
2. Fund it with PRE on Omega Network
3. Set the private key when starting the API:
   ```bash
   EZ_PEZE_ESCROW_PRIVATE_KEY=0x... npm run dev:api
   ```
4. Optional: `OMEGA_RPC` to override the Omega RPC URL

Without the escrow key, bets cannot be placed (frontend will show "Escrow not configured").

## Deployment (Render + Vercel)

### 1. API (Render Web Service)
- Connect repo to Render, create **Web Service**
- **Build:** `npm install`
- **Start:** `node server/server.js`
- **Env vars:**
  - `EZ_PEZE_ESCROW_PRIVATE_KEY` (optional, for EZ Peeze)
  - `NODE_ENV=production`
  - **`ZEROX_API_KEY`** – Your [0x API key](https://0x.org/docs/api#request-access) (required for swap prices and quotes; without it you get "0x API returned invalid response")
  - `OMEGA_RPC` (optional)
- Uses `PORT` from Render automatically. **News (Google News RSS)** is fetched by this server; no extra API key needed.

### 2. MM Bot (Render Background Worker)
- Same repo, create **Background Worker**
- **Start:** `node server/mm.js`
- **Env var:** `API_URL=https://your-api.onrender.com/api`

### 3. Frontend (Vercel)
- Connect repo, deploy with **Vite** (build command: `npm run build`, output: `dist`)
- **Env vars (Settings → Environment Variables):**
  - **`VITE_API_URL`** – Your backend URL, e.g. `https://your-app-name.onrender.com` (no trailing slash). Required so the app can call the API for 0x proxy, news, pairs, EZ Peeze, etc.
- You do **not** need to put the 0x API key in Vercel; the backend uses it. News is served by the same backend.
