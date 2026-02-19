import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";

const app = express();
const PORT = process.env.PORT || 3001;

// Render does not set NODE_ENV=production by default; allow production frontend explicitly so prices work in prod
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://olympus.omeganetwork.co",
  "https://www.olympus.omeganetwork.co",
];
// In production mode allow any origin; otherwise use whitelist (so prod works even if NODE_ENV isn't set on Render)
app.use(cors({
  origin: (origin, cb) => {
    if (process.env.NODE_ENV === "production") return cb(null, true);
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(null, false);
  },
}));
app.use(express.json());

// ─── Admin wallet (only this address sees admin panel) ───
const ADMIN_WALLET = "0xe4eb34392f232c75d0ac3b518ce5e265bcb35e8c";

// ─── Listed Pairs & MM Config ───
const PAIRS_FILE = path.join(process.cwd(), "data", "pairs.json");
const MM_CONFIG_FILE = path.join(process.cwd(), "data", "mm-config.json");
function ensureDataDir() {
  const dir = path.dirname(PAIRS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPairs() {
  ensureDataDir();
  if (fs.existsSync(PAIRS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PAIRS_FILE, "utf8"));
    } catch (e) { /* ignore */ }
  }
  const defaultPairs = [
    { id: "PRE/mUSDC", baseToken: "PRE", quoteToken: "mUSDC", baseAddress: "0xB8149d86Fb75C9A7e3797d6923c12e5076b6AEd9", quoteAddress: "0x24A4704dE79819e4Dcb379cC548426F03f663b09", chain: "Omega", chainId: 1313161916, mmEnabled: true, listedBy: null, listedAt: Date.now() },
  ];
  savePairs(defaultPairs);
  return defaultPairs;
}
function savePairs(pairs) {
  ensureDataDir();
  fs.writeFileSync(PAIRS_FILE, JSON.stringify(pairs, null, 2));
}

const DEFAULT_MM_CONFIG = {
  walletAddress: "0x32Be343B94f860124dC4fEe278FDCBD38C102D88",
  baseSpread: 0.0005,
  ladderLevels: 18,
  orderSizeBase: 25000,
  volumeInterval: 2500,
  updateInterval: 2000,
  meanPrice: 0.0847,
  priceMin: 0.04,
  priceMax: 0.14,
  volatilityLow: 0.001,
  volatilityMid: 0.005,
  volatilityHigh: 0.02,
};

function loadMMConfig() {
  ensureDataDir();
  if (fs.existsSync(MM_CONFIG_FILE)) {
    try {
      return { ...DEFAULT_MM_CONFIG, ...JSON.parse(fs.readFileSync(MM_CONFIG_FILE, "utf8")) };
    } catch (e) { /* ignore */ }
  }
  return { ...DEFAULT_MM_CONFIG };
}

function saveMMConfig(cfg) {
  ensureDataDir();
  fs.writeFileSync(MM_CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

let listedPairs = loadPairs();
const preMusdc = listedPairs.find((p) => p.id === "PRE/mUSDC");
if (preMusdc && preMusdc.mmEnabled === false) {
  preMusdc.mmEnabled = true;
  savePairs(listedPairs);
}

// ─── Order Book & Matching Engine (per pair) ───
const orderBooks = new Map(); // pairId -> { orders, bidsByPrice, asksByPrice, trades }
const MAX_TRADES = 200;

function getOrderBook(pairId) {
  if (!orderBooks.has(pairId)) {
    orderBooks.set(pairId, {
      orders: new Map(),
      bidsByPrice: new Map(),
      asksByPrice: new Map(),
      trades: [],
    });
  }
  return orderBooks.get(pairId);
}

function addToBook(ob, order) {
  const priceMap = order.side === "buy" ? ob.bidsByPrice : ob.asksByPrice;
  if (!priceMap.has(order.price)) priceMap.set(order.price, []);
  priceMap.get(order.price).push(order);
  ob.orders.set(order.id, order);
}

function removeFromBook(ob, order) {
  const priceMap = order.side === "buy" ? ob.bidsByPrice : ob.asksByPrice;
  const list = priceMap.get(order.price);
  if (list) {
    const idx = list.findIndex((o) => o.id === order.id);
    if (idx !== -1) list.splice(idx, 1);
    if (list.length === 0) priceMap.delete(order.price);
  }
  ob.orders.delete(order.id);
}

function getSortedBids(ob) {
  return [...ob.bidsByPrice.entries()].sort((a, b) => b[0] - a[0]);
}

function getSortedAsks(ob) {
  return [...ob.asksByPrice.entries()].sort((a, b) => a[0] - b[0]);
}

function matchOrder(ob, incoming) {
  const isBuy = incoming.side === "buy";
  const oppositeMap = isBuy ? ob.asksByPrice : ob.bidsByPrice;
  const prices = [...oppositeMap.keys()].sort(isBuy ? (a, b) => a - b : (a, b) => b - a);
  const executions = [];

  let remaining = incoming.amount;

  for (const price of prices) {
    if (remaining <= 0) break;
    const priceOk = isBuy ? price <= incoming.price : price >= incoming.price;
    if (!priceOk) break;

    const list = oppositeMap.get(price);
    for (const resting of [...list]) {
      if (remaining <= 0) break;
      const fillAmount = Math.min(remaining, resting.amount - resting.filled);
      if (fillAmount <= 0) continue;

      resting.filled += fillAmount;
      remaining -= fillAmount;

      const trade = {
        id: uuidv4(),
        price: resting.price,
        amount: fillAmount,
        side: incoming.side,
        takerOrderId: incoming.id,
        makerOrderId: resting.id,
        takerAddress: incoming.address,
        makerAddress: resting.address,
        timestamp: Date.now(),
      };
      ob.trades.unshift(trade);
      if (ob.trades.length > MAX_TRADES) ob.trades.pop();
      executions.push(trade);

      if (resting.filled >= resting.amount) {
        removeFromBook(ob, resting);
      }
    }
  }

  incoming.filled = incoming.amount - remaining;
  if (incoming.filled < incoming.amount) {
    addToBook(ob, incoming);
  }

  return executions;
}

// Seed initial order book for a pair
function seedOrderBook(ob, pairId, mid = 0.0847) {
  for (let i = 1; i <= 12; i++) {
    const bidPrice = mid - i * 0.0001 - Math.random() * 0.00005;
    addToBook(ob, {
      id: uuidv4(),
      address: "0x" + "1".repeat(40),
      side: "buy",
      price: bidPrice,
      amount: Math.floor(Math.random() * 30000) + 5000,
      filled: 0,
      timestamp: Date.now() - i * 60000,
    });
  }
  for (let i = 1; i <= 12; i++) {
    const askPrice = mid + i * 0.0001 + Math.random() * 0.00005;
    addToBook(ob, {
      id: uuidv4(),
      address: "0x" + "2".repeat(40),
      side: "sell",
      price: askPrice,
      amount: Math.floor(Math.random() * 30000) + 5000,
      filled: 0,
      timestamp: Date.now() - i * 60000,
    });
  }
}

// Seed default pair
listedPairs.forEach((p) => {
  const ob = getOrderBook(p.id);
  if (ob.orders.size === 0) seedOrderBook(ob, p.id);
});

// WebSocket broadcast (attach to HTTP server for single-port deployment)
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();
wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});
function broadcast(msg) {
  const data = JSON.stringify(msg);
  clients.forEach((c) => {
    if (c.readyState === 1) c.send(data);
  });
}

// ─── REST API ───

// Pairs & token listing
// 0x Swap API proxy (bypasses CORS; use when frontend gets "Failed to fetch")
// Trim key so pasted env vars with newlines/spaces don't break 0x API
const ZEROX_KEY = (process.env.VITE_0X_API_KEY || process.env.ZEROX_API_KEY || "").trim();
if (!ZEROX_KEY) console.warn("[0x] No API key set (VITE_0X_API_KEY or ZEROX_API_KEY). 0x requests may fail.");
else console.log("[0x] API key is set.");

app.get("/api/zerox/price", async (req, res) => {
  try {
    const params = new URLSearchParams(req.query).toString();
    const url = `https://api.0x.org/swap/allowance-holder/price?${params}`;
    const headers = { "0x-version": "v2" };
    if (ZEROX_KEY) headers["0x-api-key"] = ZEROX_KEY;
    const r = await fetch(url, { headers });
    const data = await r.json();
    if (!r.ok) console.warn("[0x] price non-ok:", r.status, data?.reason || data?.message || "");
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ reason: e.message || "0x proxy error" });
  }
});

app.get("/api/zerox/quote", async (req, res) => {
  try {
    const params = new URLSearchParams(req.query).toString();
    const url = `https://api.0x.org/swap/allowance-holder/quote?${params}`;
    const headers = { "0x-version": "v2" };
    if (ZEROX_KEY) headers["0x-api-key"] = ZEROX_KEY;
    const r = await fetch(url, { headers });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ reason: e.message || "0x proxy error" });
  }
});

// Health check (for deployment: verify backend is reachable)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "olympus-api", ts: Date.now() });
});

// Debug: confirm 0x key is loaded (do not use in production for sensitive data)
app.get("/api/debug-0x", (req, res) => {
  res.json({ zeroxKeySet: !!ZEROX_KEY, zeroxKeyLength: ZEROX_KEY ? ZEROX_KEY.length : 0 });
});

// Unified price for zerox pairs: 0x → CoinGecko → CoinPaprika → Binance. One request from frontend.
const PAIR_TO_COINGECKO = {
  "ETH/USDC": "ethereum", "ETH/USDT": "ethereum", "LINK/USDC": "chainlink", "UNI/USDC": "uniswap",
  "AAVE/USDC": "aave", "CRV/USDC": "curve-dao-token", "MATIC/USDC": "matic-network", "ARB/USDC": "arbitrum",
  "LDO/USDC": "lido-dao", "PEPE/USDC": "pepe", "SHIB/USDC": "shiba-inu", "SAND/USDC": "the-sandbox",
  "MANA/USDC": "decentraland", "FLOKI/USDC": "floki", "BONK/USDC": "bonk", "WIF/USDC": "dogwifhat",
  "FET/USDC": "fetch-ai", "DOT/USDC": "polkadot", "MATIC/USDC-POLY": "matic-network", "ETH/USDC-POLY": "ethereum",
  "ETH/USDC-ARB": "ethereum", "ARB/USDC-ARB": "arbitrum", "ETH/USDC-OP": "ethereum", "OP/USDC-OP": "optimism",
  "ETH/USDC-BASE": "ethereum", "DEGEN/USDC-BASE": "degen", "BNB/USDT-BSC": "binancecoin", "AVAX/USDC-AVAX": "avalanche-2",
  "ETH/USDC-AVAX": "ethereum",
};
// CoinPaprika: no API key, free tier 20k/mo. IDs from https://api.coinpaprika.com/v1/coins
const PAIR_TO_COINPAPRIKA = {
  "ETH/USDC": "eth-ethereum", "ETH/USDT": "eth-ethereum", "LINK/USDC": "link-chainlink", "UNI/USDC": "uni-uniswap",
  "AAVE/USDC": "aave-aave", "CRV/USDC": "crv-curve-dao-token", "MATIC/USDC": "matic-polygon", "ARB/USDC": "arb-arbitrum",
  "LDO/USDC": "ldo-lido-dao", "PEPE/USDC": "pepe-pepe", "SHIB/USDC": "shib-shiba-inu", "SAND/USDC": "sand-the-sandbox",
  "MANA/USDC": "mana-decentraland", "FLOKI/USDC": "floki-floki", "BONK/USDC": "bonk-bonk", "WIF/USDC": "wif-dogwifhat",
  "FET/USDC": "fet-fetch", "DOT/USDC": "dot-polkadot", "MATIC/USDC-POLY": "matic-polygon", "ETH/USDC-POLY": "eth-ethereum",
  "ETH/USDC-ARB": "eth-ethereum", "ARB/USDC-ARB": "arb-arbitrum", "ETH/USDC-OP": "eth-ethereum", "OP/USDC-OP": "op-optimism",
  "ETH/USDC-BASE": "eth-ethereum", "BNB/USDT-BSC": "bnb-binance-coin", "AVAX/USDC-AVAX": "avax-avalanche", "ETH/USDC-AVAX": "eth-ethereum",
};
// Price for display only. 0x is NOT used here (only for swaps). Order: CoinGecko → CoinPaprika → Binance.
app.get("/api/price", async (req, res) => {
  const pairId = (req.query.pairId || req.query.pair || "").trim();
  if (!pairId) return res.status(400).json({ error: "Missing pairId" });
  let price = null;
  const cgId = PAIR_TO_COINGECKO[pairId];
  if (cgId) {
    price = await fetchCoingeckoPrice(cgId);
    if (price != null) return res.json({ price, source: "coingecko", pairId });
    const cpId = PAIR_TO_COINPAPRIKA[pairId];
    if (cpId) {
      price = await fetchCoinPaprikaPrice(cpId);
      if (price != null) return res.json({ price, source: "coinpaprika", pairId });
    }
    const sym = CG_TO_BINANCE[cgId];
    if (sym) {
      price = await fetchBinancePrice(sym);
      if (price != null) return res.json({ price, source: "binance", pairId });
    }
  }
  return res.status(502).json({ error: "Price unavailable", pairId });
});

// ─── Price Fallback (CoinGecko -> Binance -> Hardcoded) ───
const coingeckoPriceCache = new Map(); // id -> { price, ts }
const COINGECKO_CACHE_TTL_MS = 60 * 1000;

// Map CoinGecko IDs to Binance Symbols for fallback
const CG_TO_BINANCE = {
  "ethereum": "ETHUSDT",
  "bitcoin": "BTCUSDT",
  "solana": "SOLUSDT",
  "ripple": "XRPUSDT",
  "matic-network": "MATICUSDT",
  "arbitrum": "ARBUSDT",
  "optimism": "OPUSDT",
  "avalanche-2": "AVAXUSDT",
  "binancecoin": "BNBUSDT",
  "dogecoin": "DOGEUSDT",
  "chainlink": "LINKUSDT",
  "uniswap": "UNIUSDT",
  "aave": "AAVEUSDT",
  "cardano": "ADAUSDT",
  "polkadot": "DOTUSDT",
  "shiba-inu": "SHIBUSDT",
  "pepe": "PEPEUSDT",
  "fetch-ai": "FETUSDT",
  "render-token": "RNDRUSDT",
  "near": "NEARUSDT",
  "aptos": "APTUSDT",
  "sui": "SUIUSDT",
  "sei-network": "SEIUSDT",
  "celestia": "TIAUSDT",
  "injective-protocol": "INJUSDT",
  "fantom": "FTMUSDT",
  "the-open-network": "TONUSDT",
  "bonk": "BONKUSDT",
  "floki": "FLOKIUSDT",
  "dogwifhat": "WIFUSDT",
  "worldcoin": "WLDUSDT",
  "jupiter-exchange-solana": "JUPUSDT",
  "raydium": "RAYUSDT",
  "pyth-network": "PYTHUSDT",
  "pudgy-penguins": "PENGUUSDT",
  "official-trump": "TRUMPUSDT",
  "kamino": "KMNOUSDT",
  "meteora": "METUSDT",
  "lido-dao": "LDOUSDT",
  "curve-dao-token": "CRVUSDT",
  "the-sandbox": "SANDUSDT",
  "decentraland": "MANAUSDT",
  "apecoin": "APEUSDT",
  "blockstack": "STXUSDT",
  "dai": "DAIUSDT",
  "usd-coin": "USDCUSDT",
  "tether": "USDTUSDT"
};
// Reverse: Binance symbol -> CoinGecko id (for fallback when Binance is geo-blocked)
const BINANCE_TO_CG = Object.fromEntries(
  Object.entries(CG_TO_BINANCE).map(([id, sym]) => [sym, id])
);

const BINANCE_FETCH_MS = 10000;
async function fetchBinancePrice(symbol) {
  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), BINANCE_FETCH_MS);
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(to);
    if (!r.ok) return null;
    const data = await r.json();
    if (data?.msg && String(data.msg).includes("restricted")) {
      console.warn("[Price] Binance geo-restricted for", symbol);
      return null;
    }
    const price = parseFloat(data?.price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch (e) {
    console.warn("[Price] Binance fetch failed for", symbol, e?.message || e);
    return null;
  }
}

// CoinPaprika: no API key, free tier. Good fallback when CoinGecko rate-limits.
async function fetchCoinPaprikaPrice(coinId) {
  try {
    const r = await fetch(`https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(coinId)}`);
    if (!r.ok) return null;
    const data = await r.json();
    const price = data?.quotes?.USD?.price;
    return typeof price === "number" && price > 0 ? price : null;
  } catch (e) {
    console.warn("[Price] CoinPaprika failed for", coinId, e.message);
    return null;
  }
}

// CoinGecko only — no Binance/other fallbacks so display stays consistent and avoids geo-block/cascading failures
async function fetchCoingeckoPrice(id) {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`,
      { headers: { Accept: "application/json", "User-Agent": "OmegaDEX/1.0" } }
    );
    if (r.ok) {
      const data = await r.json();
      const price = data?.[id]?.usd;
      if (typeof price === "number" && price > 0) return price;
    }
  } catch (e) {
    console.warn("[Price] CoinGecko failed for", id, e.message);
  }
  return null;
}

const coingeckoMarketCache = new Map();
const COINGECKO_MARKET_CACHE_TTL_MS = 90 * 1000;

async function fetchCoingeckoMarket(id) {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(id)}&per_page=1`,
      { headers: { Accept: "application/json", "User-Agent": "OmegaDEX/1.0" } }
    );
    if (!r.ok) return null;
    const arr = await r.json();
    const m = Array.isArray(arr) && arr[0] ? arr[0] : null;
    if (!m) return null;
    const price = m.current_price != null ? Number(m.current_price) : null;
    const volume24h = m.total_volume != null ? Number(m.total_volume) : null;
    const high24h = m.high_24h != null ? Number(m.high_24h) : null;
    const low24h = m.low_24h != null ? Number(m.low_24h) : null;
    const changePercent24h = m.price_change_percentage_24h != null ? Number(m.price_change_percentage_24h) : null;
    const num = (x) => (x != null && Number.isFinite(Number(x)) ? Number(x) : null);
    const str = (x) => (typeof x === "string" && x ? x : null);
    return {
      price: price > 0 ? price : null,
      volume24h: num(volume24h),
      high24h: num(high24h),
      low24h: num(low24h),
      changePercent24h: num(changePercent24h),
      marketCap: num(m.market_cap),
      marketCapRank: m.market_cap_rank != null ? Number(m.market_cap_rank) : null,
      ath: num(m.ath),
      athChangePercent: num(m.ath_change_percentage),
      athDate: str(m.ath_date),
      atl: num(m.atl),
      atlChangePercent: num(m.atl_change_percentage),
      atlDate: str(m.atl_date),
      circulatingSupply: num(m.circulating_supply),
      totalSupply: m.total_supply != null ? num(m.total_supply) : null,
      maxSupply: m.max_supply != null ? num(m.max_supply) : null,
      fullyDilutedValuation: num(m.fully_diluted_valuation),
      lastUpdated: str(m.last_updated),
    };
  } catch (e) {
    console.warn("[Price] CoinGecko market failed for", id, e.message);
    return null;
  }
}

app.get("/api/coingecko-market", async (req, res) => {
  const id = (req.query.id || req.query.coingeckoId || "").trim().toLowerCase();
  if (!id) return res.status(400).json({ error: "Missing id" });
  const cached = coingeckoMarketCache.get(id);
  if (cached && Date.now() - cached.ts < COINGECKO_MARKET_CACHE_TTL_MS) {
    return res.json({ ...cached.data, id });
  }
  let data = await fetchCoingeckoMarket(id);
  // Fallback: if /coins/markets fails (rate limit, timeout), try simple price so frontend at least gets a price
  if (!data?.price) {
    const price = await fetchCoingeckoPrice(id);
    if (price != null && price > 0) {
      data = { price, volume24h: null, high24h: null, low24h: null, changePercent24h: null, marketCap: null, marketCapRank: null, ath: null, athChangePercent: null, athDate: null, atl: null, atlChangePercent: null, atlDate: null, circulatingSupply: null, totalSupply: null, maxSupply: null, fullyDilutedValuation: null, lastUpdated: null };
    }
  }
  if (data?.price) {
    coingeckoMarketCache.set(id, { data, ts: Date.now() });
    return res.json({ ...data, id });
  }
  return res.status(502).json({ error: "Market data unavailable", id });
});

app.get("/api/coingecko-price", async (req, res) => {
  const id = (req.query.id || req.query.coingeckoId || "").trim().toLowerCase();
  if (!id) return res.status(400).json({ error: "Missing id" });

  // Check cache
  const cached = coingeckoPriceCache.get(id);
  if (cached && Date.now() - cached.ts < COINGECKO_CACHE_TTL_MS && cached.price != null) {
    return res.json({ price: cached.price, id });
  }

  // Fetch fresh
  let price = await fetchCoingeckoPrice(id);

  // Retry once if null
  if (price == null) {
    await new Promise((r) => setTimeout(r, 800));
    price = await fetchCoingeckoPrice(id);
  }

  if (price != null) {
    coingeckoPriceCache.set(id, { price, ts: Date.now() });
    return res.json({ price, id });
  }

  return res.status(502).json({ error: "Price unavailable", id });
});

// Binance price proxy; when Binance is geo-blocked, fall back to CoinGecko for known symbols
app.get("/api/binance-price", async (req, res) => {
  const symbol = (req.query.symbol || "").trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: "Missing symbol" });
  try {
    let price = await fetchBinancePrice(symbol);
    if ((price == null || price <= 0) && BINANCE_TO_CG[symbol]) {
      const cgId = BINANCE_TO_CG[symbol];
      price = await fetchCoingeckoPrice(cgId);
      if (price != null && price > 0) return res.json({ price, symbol, source: "coingecko" });
    }
    if (price != null && price > 0) return res.json({ price, symbol });
  } catch (e) {
    console.warn("[Price] Binance proxy failed for", symbol, e.message);
  }
  return res.status(502).json({ error: "Price unavailable", symbol });
});

// Fallback endpoint for non-EVM pairs (e.g. SOL/USDC) if frontend fails
app.get("/api/non-evm-price", async (req, res) => {
  const pairId = (req.query.pairId || "").trim();
  // Map pairId to CoinGecko ID manually if needed, or rely on frontend passing coingeckoId to /api/coingecko-price
  // However, omega-dex.jsx calls this with pairId.
  // We need a small mapping here or logic to extract it.
  // Since omega-dex.jsx usually tries /api/coingecko-price first with the ID, this is a fallback.
  // Let's try to infer from common known pairs.
  let cgId = "";
  if (pairId.includes("SOL")) cgId = "solana";
  else if (pairId.includes("BTC")) cgId = "bitcoin";
  else if (pairId.includes("JUP")) cgId = "jupiter-exchange-solana";
  else if (pairId.includes("RAY")) cgId = "raydium";
  else if (pairId.includes("BONK")) cgId = "bonk";
  else if (pairId.includes("WIF")) cgId = "dogwifhat";
  else if (pairId.includes("PENGU")) cgId = "pudgy-penguins";
  else if (pairId.includes("TRUMP")) cgId = "official-trump";
  else if (pairId.includes("KMNO")) cgId = "kamino";
  else if (pairId.includes("PYTH")) cgId = "pyth-network";
  else if (pairId.includes("MET")) cgId = "meteora";

  if (!cgId) return res.status(400).json({ error: "Unknown pairId" });

  let price = await fetchCoingeckoPrice(cgId);
  if (price != null) return res.json({ price, id: cgId });
  return res.status(502).json({ error: "Price unavailable", pairId });
});

// Crypto news – Google News RSS search for " ticker crypto" (e.g. "ETH crypto")
function parseGoogleNewsRss(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    let url = "";
    const linkMatch = block.match(/<link>\s*([^<]+)\s*<\/link>/i);
    if (linkMatch) url = linkMatch[1].trim();
    if (!url) {
      const hrefMatch = block.match(/https?:\/\/[^\s"'<>]+/);
      if (hrefMatch) url = hrefMatch[0].replace(/[)\]>].*$/, "");
    }
    const pubMatch = block.match(/<pubDate>\s*([^<]+)\s*<\/pubDate>/i);
    const sourceMatch = block.match(/<source[^>]*>([^<]+)<\/source>/i);
    const rawTitle = titleMatch ? titleMatch[1].trim() : "";
    const title = rawTitle
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    if (title && url) {
      items.push({
        title,
        url,
        publishedAt: pubMatch ? pubMatch[1].trim() : null,
        source: sourceMatch ? sourceMatch[1].trim() : "Google News",
      });
    }
  }
  return items;
}

app.get("/api/crypto-news", async (req, res) => {
  const ticker = (req.query.ticker || req.query.q || "").trim().toUpperCase();
  const searchQuery = ticker ? `${ticker} crypto` : "crypto";
  const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  const items = [];
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
    const r = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    const xml = await r.text();
    if (r.ok && xml && xml.includes("<item>")) {
      const parsed = parseGoogleNewsRss(xml);
      items.push(...parsed.slice(0, 25));
    } else {
      console.warn("[crypto-news] No items from Google RSS", { ticker: searchQuery, status: r.status, xmlLen: xml?.length });
    }
    res.json({ items, searchUrl });
  } catch (e) {
    console.warn("[crypto-news] Fetch failed:", e.message);
    res.status(500).json({ items: [], searchUrl, error: e.message || "Failed to fetch news" });
  }
});

// Generic news – Google News RSS search for any query (e.g. prediction event title)
app.get("/api/news", async (req, res) => {
  const q = (req.query.q || req.query.query || "").trim();
  const searchQuery = q || "news";
  const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  const items = [];
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
    const r = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    const xml = await r.text();
    if (r.ok && xml && xml.includes("<item>")) {
      const parsed = parseGoogleNewsRss(xml);
      items.push(...parsed.slice(0, 20));
    } else {
      console.warn("[news] No items from Google RSS", { query: searchQuery, status: r.status, xmlLen: xml?.length });
    }
    res.json({ items, searchUrl, query: searchQuery });
  } catch (e) {
    console.warn("[news] Fetch failed:", e.message);
    res.status(500).json({ items: [], searchUrl, query: searchQuery, error: e.message || "Failed to fetch news" });
  }
});

app.get("/api/pairs", (req, res) => {
  res.json(listedPairs);
});

app.post("/api/pairs", (req, res) => {
  const { baseToken, quoteToken, baseAddress, quoteAddress, chain, chainId, enableMM, baseLogo, quoteLogo } = req.body;
  if (!baseToken || !quoteToken || !baseAddress || !quoteAddress || !chain) {
    return res.status(400).json({ error: "Missing baseToken, quoteToken, baseAddress, quoteAddress, or chain" });
  }
  const pairId = `${baseToken}/${quoteToken}`;
  if (listedPairs.some((p) => p.id === pairId)) {
    return res.status(400).json({ error: "Pair already listed" });
  }
  const pair = {
    id: pairId,
    baseToken,
    quoteToken,
    baseAddress,
    quoteAddress,
    chain,
    chainId: chainId || 1313161916,
    mmEnabled: enableMM === true || enableMM === "true",
    baseLogo: baseLogo || null,
    quoteLogo: quoteLogo || null,
    listedBy: req.body.listedBy || null,
    listedAt: Date.now(),
  };
  listedPairs.push(pair);
  savePairs(listedPairs);
  const ob = getOrderBook(pairId);
  seedOrderBook(ob, pairId);
  res.json({ pair, message: "Token listed" });
});

app.post("/api/mm/enable", (req, res) => {
  const { pair: pairId } = req.body;
  const pair = listedPairs.find((p) => p.id === pairId);
  if (!pair) return res.status(404).json({ error: "Pair not found" });
  pair.mmEnabled = true;
  savePairs(listedPairs);
  res.json({ pair, message: "MM bot enabled for pair" });
});

app.post("/api/mm/disable", (req, res) => {
  const { pair: pairId } = req.body;
  const pair = listedPairs.find((p) => p.id === pairId);
  if (!pair) return res.status(404).json({ error: "Pair not found" });
  pair.mmEnabled = false;
  savePairs(listedPairs);
  res.json({ pair, message: "MM bot disabled for pair" });
});

// MM config (admin only for PUT)
app.get("/api/mm/config", (req, res) => {
  res.json(loadMMConfig());
});

app.put("/api/mm/config", (req, res) => {
  const adminAddr = (req.headers["x-admin-address"] || req.body?.adminAddress || "").toLowerCase();
  if (adminAddr !== ADMIN_WALLET) {
    return res.status(403).json({ error: "Admin wallet required" });
  }
  const current = loadMMConfig();
  const updates = req.body;
  const allowed = [
    "walletAddress", "baseSpread", "ladderLevels", "orderSizeBase",
    "volumeInterval", "updateInterval", "meanPrice", "priceMin", "priceMax",
    "volatilityLow", "volatilityMid", "volatilityHigh",
  ];
  for (const k of allowed) {
    if (updates[k] === undefined) continue;
    if (k === "walletAddress") {
      current[k] = String(updates[k]);
    } else {
      const val = updates[k];
      const num = typeof val === "number" ? val : parseFloat(val);
      if (!Number.isNaN(num)) current[k] = num;
    }
  }
  saveMMConfig(current);
  res.json({ config: current, message: "MM config updated" });
});

// ─── EZ PEZE: Real prediction bets ───
const EZ_PEZE_FILE = path.join(process.cwd(), "data", "ezpeze-bets.json");
const PRE_ADDRESS = "0xB8149d86Fb75C9A7e3797d6923c12e5076b6AEd9";
const OMEGA_RPC = process.env.OMEGA_RPC || "https://0x4e4542bc.rpc.aurora-cloud.dev";
const EZ_ESCROW_KEY = process.env.EZ_PEZE_ESCROW_PRIVATE_KEY || null;
let EZ_ESCROW = null;
if (EZ_ESCROW_KEY) {
  try {
    EZ_ESCROW = new ethers.Wallet(EZ_ESCROW_KEY).address;
  } catch (_) { }
}

let ezBets = new Map(); // id -> bet
function loadEzBets() {
  ensureDataDir();
  if (fs.existsSync(EZ_PEZE_FILE)) {
    try {
      const arr = JSON.parse(fs.readFileSync(EZ_PEZE_FILE, "utf8"));
      ezBets = new Map(arr.map((b) => [b.id, b]));
    } catch (e) { /* ignore */ }
  }
}
function saveEzBets() {
  ensureDataDir();
  fs.writeFileSync(EZ_PEZE_FILE, JSON.stringify([...ezBets.values()], null, 2));
}
loadEzBets();

// 0x pair config for EZ Peeze resolution: pairId -> { chainId, sellToken, buyToken, buyDecimals }
const ZEROX_PAIRS = {
  "ETH/USDC": { chainId: 1, sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "ETH/USDT": { chainId: 1, sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", buyToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7", buyDecimals: 6 },
  "LINK/USDC": { chainId: 1, sellToken: "0x514910771AF9Ca656af840dff83E8264EcF986CA", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "UNI/USDC": { chainId: 1, sellToken: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "AAVE/USDC": { chainId: 1, sellToken: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "CRV/USDC": { chainId: 1, sellToken: "0xD533a949740bb3306d119CC777fa900bA034cd52", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "MATIC/USDC": { chainId: 1, sellToken: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "ARB/USDC": { chainId: 1, sellToken: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "LDO/USDC": { chainId: 1, sellToken: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "PEPE/USDC": { chainId: 1, sellToken: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "SHIB/USDC": { chainId: 1, sellToken: "0x95aD61b0a150d79219dC64Ff2e44dA2d6b229F8E", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "SAND/USDC": { chainId: 1, sellToken: "0x3845badAde8e6dFF049820680d1F14bD3903a5d0", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "MANA/USDC": { chainId: 1, sellToken: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "FLOKI/USDC": { chainId: 1, sellToken: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "BONK/USDC": { chainId: 1, sellToken: "0x1151CB3d861920e07a38e03eEAd12C32178567F6", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "WIF/USDC": { chainId: 1, sellToken: "0x81B4dB0c719DB9bC7A8D8EbCF58CA2162BC53353", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "FET/USDC": { chainId: 1, sellToken: "0xaea46A60368A7bd060eec7DF8Cba43b7EF41ad85", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "DOT/USDC": { chainId: 1, sellToken: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", buyDecimals: 6 },
  "MATIC/USDC-POLY": { chainId: 137, sellToken: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", buyToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", buyDecimals: 6 },
  "ETH/USDC-POLY": { chainId: 137, sellToken: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", buyToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", buyDecimals: 6 },
  "ETH/USDC-ARB": { chainId: 42161, sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", buyToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", buyDecimals: 6 },
  "ARB/USDC-ARB": { chainId: 42161, sellToken: "0x912CE59144191C1204E64559FE8253a0e49E6548", buyToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", buyDecimals: 6 },
  "ETH/USDC-OP": { chainId: 10, sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", buyToken: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", buyDecimals: 6 },
  "OP/USDC-OP": { chainId: 10, sellToken: "0x4200000000000000000000000000000000000042", buyToken: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", buyDecimals: 6 },
  "ETH/USDC-BASE": { chainId: 8453, sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", buyToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", buyDecimals: 6 },
  "DEGEN/USDC-BASE": { chainId: 8453, sellToken: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", buyToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", buyDecimals: 6 },
  "BNB/USDT-BSC": { chainId: 56, sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", buyToken: "0x55d398326f99059fF775485246999027B3197955", buyDecimals: 18 },
  "FLOKI/USDT-BSC": { chainId: 56, sellToken: "0xfb5B838b6cfEEdC2873aB27866079AC55363D37E", buyToken: "0x55d398326f99059fF775485246999027B3197955", buyDecimals: 18 },
  "CAKE/USDT-BSC": { chainId: 56, sellToken: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", buyToken: "0x55d398326f99059fF775485246999027B3197955", buyDecimals: 18 },
  "DOGE/USDT-BSC": { chainId: 56, sellToken: "0xbA2aE424d960c26247Dd6c32edC70B95c946FdFD", buyToken: "0x55d398326f99059fF775485246999027B3197955", buyDecimals: 18 },
  "PEPE/USDT-BSC": { chainId: 56, sellToken: "0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00", buyToken: "0x55d398326f99059fF775485246999027B3197955", buyDecimals: 18 },
  "SHIB/USDT-BSC": { chainId: 56, sellToken: "0x2859e4544C4Bb03966803b044A93563Bd2D0dd4D", buyToken: "0x55d398326f99059fF775485246999027B3197955", buyDecimals: 18 },
  "AVAX/USDC-AVAX": { chainId: 43114, sellToken: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", buyToken: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", buyDecimals: 6 },
  "ETH/USDC-AVAX": { chainId: 43114, sellToken: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", buyToken: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", buyDecimals: 6 },
};

// Non-EVM pairs: EZ Peeze only (no swap). Price from CoinGecko for resolution.
const NON_EVM_PAIRS = {
  "SOL/USDC": { coingeckoId: "solana" },
  "BONK/USDC-SOL": { coingeckoId: "bonk" },
  "JUP/USDC-SOL": { coingeckoId: "jupiter-exchange-solana" },
  "RAY/USDC-SOL": { coingeckoId: "raydium" },
  "PENGU/USDC-SOL": { coingeckoId: "pudgy-penguins" },
  "TRUMP/USDC-SOL": { coingeckoId: "official-trump" },
  "PYTH/USDC-SOL": { coingeckoId: "pyth-network" },
  "MET/USDC-SOL": { coingeckoId: "meteora" },
  "KMNO/USDC-SOL": { coingeckoId: "kamino" },
  "BTC/USDC": { coingeckoId: "bitcoin" },
  "ADA/USDC": { coingeckoId: "cardano" },
  "XRP/USDC": { coingeckoId: "ripple" },
  "DOGE/USDC": { coingeckoId: "dogecoin" },
  "SUI/USDC": { coingeckoId: "sui" },
  "TON/USDC": { coingeckoId: "the-open-network" },
  "AVAX/USDC": { coingeckoId: "avalanche-2" },
  "NEAR/USDC": { coingeckoId: "near" },
  "INJ/USDC": { coingeckoId: "injective-protocol" },
  "TIA/USDC": { coingeckoId: "celestia" },
  "SEI/USDC": { coingeckoId: "sei-network" },
  "STX/USDC": { coingeckoId: "blockstack" },
  "APT/USDC": { coingeckoId: "aptos" },
};

const nonEvmPriceCache = new Map(); // pairId -> { price, ts }
const NON_EVM_PRICE_CACHE_TTL_MS = 60 * 1000;

async function getNonEvmPrice(pairId) {
  const cfg = NON_EVM_PAIRS[pairId];
  if (!cfg?.coingeckoId) return null;
  const cached = nonEvmPriceCache.get(pairId);
  if (cached && Date.now() - cached.ts < NON_EVM_PRICE_CACHE_TTL_MS && cached.price != null) return cached.price;
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cfg.coingeckoId)}&vs_currencies=usd`,
      { headers: { "Accept": "application/json", "User-Agent": "OmegaDEX/1.0" } }
    );
    const data = await r.json();
    const price = data?.[cfg.coingeckoId]?.usd;
    const result = typeof price === "number" ? price : null;
    if (result != null) nonEvmPriceCache.set(pairId, { price: result, ts: Date.now() });
    return result;
  } catch (e) {
    console.error("[EZ PEZE] getNonEvmPrice error:", e.message);
    if (cached?.price != null) return cached.price;
    return null;
  }
}

async function getZeroxMidPrice(pairId) {
  const cfg = ZEROX_PAIRS[pairId];
  if (!cfg) return null;
  const buyDecimals = cfg.buyDecimals ?? 6;
  try {
    const params = new URLSearchParams({
      chainId: String(cfg.chainId),
      sellToken: cfg.sellToken,
      buyToken: cfg.buyToken,
      sellAmount: "1000000000000000000",
      taker: "0x0000000000000000000000000000000000000000",
    });
    const url = `https://api.0x.org/swap/allowance-holder/price?${params}`;
    const headers = { "0x-version": "v2" };
    if (ZEROX_KEY) headers["0x-api-key"] = ZEROX_KEY;
    const r = await fetch(url, { headers });
    const data = await r.json();
    if (!r.ok || !data?.buyAmount) return null;
    return parseFloat(ethers.formatUnits(data.buyAmount, buyDecimals));
  } catch (e) {
    console.error("[EZ PEZE] getZeroxMidPrice error:", e.message);
    return null;
  }
}

function getMidPrice(pairId) {
  const ob = getOrderBook(pairId);
  const bids = getSortedBids(ob);
  const asks = getSortedAsks(ob);
  const bestBid = bids[0]?.[0] ?? 0.0847;
  const bestAsk = asks[0]?.[0] ?? 0.0847;
  return (bestBid + bestAsk) / 2 || 0.0847;
}

async function verifyPreTransfer(txHash, fromAddr, toAddr, amountWei) {
  try {
    const provider = new ethers.JsonRpcProvider(OMEGA_RPC);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return false;
    const iface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
    for (const log of receipt.logs || []) {
      if (log.address?.toLowerCase() !== PRE_ADDRESS.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === "Transfer") {
          const [_from, _to, value] = parsed.args;
          if (_to.toLowerCase() === toAddr.toLowerCase() && _from.toLowerCase() === fromAddr.toLowerCase()) {
            if (BigInt(value.toString()) >= BigInt(amountWei)) return true;
          }
        }
      } catch (_) { }
    }
    return false;
  } catch (e) {
    console.error("[EZ PEZE] verifyPreTransfer error:", e.message);
    return false;
  }
}

async function payoutWinner(address, amountPre) {
  if (!EZ_ESCROW_KEY) {
    console.warn("[EZ PEZE] No EZ_PEZE_ESCROW_PRIVATE_KEY set - skipping payout");
    return { ok: false, error: "Payout not configured" };
  }
  try {
    const provider = new ethers.JsonRpcProvider(OMEGA_RPC);
    const signer = new ethers.Wallet(EZ_ESCROW_KEY, provider);
    const preAbi = ["function transfer(address to, uint256 amount) returns (bool)"];
    const pre = new ethers.Contract(PRE_ADDRESS, preAbi, signer);
    const wei = ethers.parseUnits(String(amountPre), 18);
    const tx = await pre.transfer(address, wei);
    await tx.wait();
    return { ok: true, txHash: tx.hash };
  } catch (e) {
    console.error("[EZ PEZE] Payout error:", e.message);
    return { ok: false, error: e.message };
  }
}

// Resolution loop: every second, resolve due bets
setInterval(async () => {
  const now = Date.now();
  for (const [id, bet] of ezBets) {
    if (bet.status !== "active") continue;
    const expiresAt = bet.placedAt + bet.timeframe * 1000;
    if (now < expiresAt) continue;
    const pairId = bet.pair || "PRE/mUSDC";
    let exitPrice = getMidPrice(pairId);
    if (NON_EVM_PAIRS[pairId]) {
      const nonEvmPrice = await getNonEvmPrice(pairId);
      if (nonEvmPrice != null) exitPrice = nonEvmPrice;
    } else if (ZEROX_PAIRS[pairId]) {
      const zeroxPrice = await getZeroxMidPrice(pairId);
      if (zeroxPrice != null) exitPrice = zeroxPrice;
    }
    const priceUp = exitPrice > bet.entryPrice;
    const won = (bet.direction === "up" && priceUp) || (bet.direction === "down" && !priceUp);
    bet.status = won ? "won" : "lost";
    bet.exitPrice = exitPrice;
    bet.resolvedAt = now;
    if (won) {
      const payoutAmount = bet.amount * 1.5; // 1.5x
      payoutWinner(bet.address, payoutAmount).then((r) => {
        bet.payoutTxHash = r.txHash || null;
        bet.payoutError = r.error || null;
        saveEzBets();
        broadcast({ type: "ezpeze", bet });
      }).catch(() => {
        bet.payoutError = "Payout failed";
        saveEzBets();
        broadcast({ type: "ezpeze", bet });
      });
    }
    saveEzBets();
    broadcast({ type: "ezpeze", bet });
  }
}, 1000);

app.get("/api/ezpeze/config", (req, res) => {
  res.json({
    preAddress: PRE_ADDRESS,
    escrowAddress: EZ_ESCROW,
    chainId: 1313161916,
    payoutsEnabled: !!EZ_ESCROW_KEY,
  });
});

app.post("/api/ezpeze/bet", async (req, res) => {
  const { address, amount, direction, timeframe, pair, txHash, entryPrice: reqEntryPrice } = req.body;
  if (!address || !amount || !direction || !txHash) {
    return res.status(400).json({ error: "Missing address, amount, direction, or txHash" });
  }
  const amt = parseFloat(amount);
  const tf = parseInt(timeframe, 10) || 60;
  if (amt <= 0 || !["up", "down"].includes(String(direction).toLowerCase())) {
    return res.status(400).json({ error: "Invalid amount or direction" });
  }
  if (!EZ_ESCROW) {
    return res.status(503).json({ error: "EZ PEZE escrow not configured. Set EZ_PEZE_ESCROW_PRIVATE_KEY." });
  }
  const wei = ethers.parseUnits(String(amt), 18);
  const verified = await verifyPreTransfer(txHash, address.toLowerCase(), EZ_ESCROW, wei.toString());
  if (!verified) {
    return res.status(400).json({ error: "Transfer verification failed. Ensure you sent the correct amount to the escrow." });
  }
  const pairId = pair || "PRE/mUSDC";
  let entryPrice = reqEntryPrice != null ? parseFloat(reqEntryPrice) : null;
  if (entryPrice == null || isNaN(entryPrice)) {
    if (NON_EVM_PAIRS[pairId]) {
      const nonEvm = await getNonEvmPrice(pairId);
      entryPrice = nonEvm != null ? nonEvm : 0;
    } else {
      const ob = getOrderBook(pairId);
      const bids = getSortedBids(ob);
      const asks = getSortedAsks(ob);
      const bestBid = bids[0]?.[0] ?? 0.0847;
      const bestAsk = asks[0]?.[0] ?? 0.0847;
      entryPrice = (bestBid + bestAsk) / 2 || 0.0847;
    }
  }
  const bet = {
    id: uuidv4(),
    address: address.toLowerCase(),
    amount: amt,
    direction: String(direction).toLowerCase(),
    timeframe: tf,
    pair: pairId,
    entryPrice,
    placedAt: Date.now(),
    txHash,
    status: "active",
  };
  ezBets.set(bet.id, bet);
  saveEzBets();
  broadcast({ type: "ezpeze", bet });
  res.json({ bet, message: "Bet placed" });
});

app.get("/api/ezpeze/bets/:address", (req, res) => {
  const addr = (req.params.address || "").toLowerCase();
  if (!addr) return res.status(400).json({ error: "Address required" });
  const userBets = [...ezBets.values()].filter((b) => b.address === addr);
  userBets.sort((a, b) => (b.placedAt || 0) - (a.placedAt || 0));
  res.json(userBets);
});

app.get("/api/non-evm-price", async (req, res) => {
  const pairId = (req.query.pairId || req.query.pair || "").trim();
  if (!NON_EVM_PAIRS[pairId]) return res.status(400).json({ error: "Unknown non-EVM pair" });
  try {
    const price = await getNonEvmPrice(pairId);
    if (price == null) return res.status(502).json({ error: "Price unavailable" });
    res.json({ price });
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to fetch price" });
  }
});

app.get("/api/orderbook", (req, res) => {
  const pairId = req.query.pair || (listedPairs[0]?.id || "PRE/mUSDC");
  const ob = getOrderBook(pairId);
  const bids = getSortedBids(ob).map(([price, list]) => ({
    price,
    amount: list.reduce((s, o) => s + (o.amount - o.filled), 0),
    total: 0,
  }));
  const asks = getSortedAsks(ob).map(([price, list]) => ({
    price,
    amount: list.reduce((s, o) => s + (o.amount - o.filled), 0),
    total: 0,
  }));

  let bt = 0;
  bids.forEach((b) => {
    bt += b.amount;
    b.total = bt;
  });
  let at = 0;
  asks.forEach((a) => {
    at += a.amount;
    a.total = at;
  });

  const bestBid = bids[0]?.price ?? 0.0847;
  const bestAsk = asks[0]?.price ?? 0.0847;
  const midPrice = (bestBid + bestAsk) / 2 || 0.0847;

  res.json({
    pair: pairId,
    bids: bids.slice(0, 30),
    asks: asks.slice(0, 30),
    midPrice,
  });
});

app.get("/api/trades", (req, res) => {
  const pairId = req.query.pair || (listedPairs[0]?.id || "PRE/mUSDC");
  const ob = getOrderBook(pairId);
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  res.json(
    (ob.trades || []).slice(0, limit).map((t) => ({
      ...t,
      time: new Date(t.timestamp),
    }))
  );
});

app.get("/api/trades/user/:address", (req, res) => {
  const addr = (req.params.address || "").toLowerCase();
  if (!addr) return res.status(400).json({ error: "Address required" });
  const limit = Math.min(parseInt(req.query.limit) || 100, 200);
  const all = [];
  for (const p of listedPairs) {
    const ob = getOrderBook(p.id);
    for (const t of ob.trades || []) {
      if ((t.takerAddress || "").toLowerCase() === addr || (t.makerAddress || "").toLowerCase() === addr) {
        all.push({ ...t, pair: p.id, time: new Date(t.timestamp) });
      }
    }
  }
  all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json(all.slice(0, limit));
});

app.get("/api/orders/:address", (req, res) => {
  const addr = req.params.address?.toLowerCase();
  const pairId = req.query.pair;
  if (!addr) return res.status(400).json({ error: "Address required" });
  let userOrders = [];
  if (pairId) {
    const ob = getOrderBook(pairId);
    userOrders = [...ob.orders.values()].filter(
      (o) => o.address.toLowerCase() === addr && o.filled < o.amount
    );
  } else {
    for (const p of listedPairs) {
      const ob = getOrderBook(p.id);
      const orders = [...ob.orders.values()].filter(
        (o) => o.address.toLowerCase() === addr && o.filled < o.amount
      );
      userOrders.push(...orders.map((o) => ({ ...o, pair: o.pair || p.id })));
    }
  }
  res.json(userOrders);
});

app.post("/api/orders", (req, res) => {
  const { address, side, price, amount, signature, token, chain, pair: pairId } = req.body;
  if (!address || !side || price == null || !amount) {
    return res.status(400).json({ error: "Missing address, side, price, or amount" });
  }
  const amt = parseFloat(amount);
  const pr = parseFloat(price);
  if (amt <= 0 || pr <= 0) {
    return res.status(400).json({ error: "Invalid price or amount" });
  }
  const activePair = pairId || listedPairs[0]?.id || "PRE/mUSDC";
  const ob = getOrderBook(activePair);

  const order = {
    id: uuidv4(),
    address: address.toLowerCase(),
    side: side.toLowerCase(),
    price: pr,
    amount: amt,
    filled: 0,
    timestamp: Date.now(),
    token: token || "USDT",
    chain: chain || "Ethereum",
    pair: activePair,
  };

  const executions = matchOrder(ob, order);
  broadcast({ type: "orderbook", pair: activePair });
  if (executions.length) broadcast({ type: "trades", trades: executions, pair: activePair });
  broadcast({ type: "order", order });

  const result = { order, executions };
  if (order.filled > 0) {
    result.filled = order.filled;
    if (order.filled >= order.amount) result.status = "filled";
    else result.status = "partial";
  } else result.status = "open";

  res.json(result);
});

app.delete("/api/orders/:id", (req, res) => {
  let found = null;
  for (const p of listedPairs) {
    const ob = getOrderBook(p.id);
    const order = ob.orders.get(req.params.id);
    if (order) {
      found = { ob, order };
      break;
    }
  }
  if (!found) return res.status(404).json({ error: "Order not found" });
  const { ob, order } = found;
  removeFromBook(ob, order);
  broadcast({ type: "orderbook", pair: order.pair || listedPairs[0]?.id });
  broadcast({ type: "cancel", orderId: order.id });
  res.json({ canceled: true, orderId: order.id });
});

app.get("/api/depth", (req, res) => {
  const pairId = req.query.pair || (listedPairs[0]?.id || "PRE/mUSDC");
  const ob = getOrderBook(pairId);
  const bids = getSortedBids(ob);
  const asks = getSortedAsks(ob);
  const minP = Math.min(
    ...bids.map(([p]) => p),
    ...asks.map(([p]) => p),
    0.0847
  );
  const maxP = Math.max(
    ...bids.map(([p]) => p),
    ...asks.map(([p]) => p),
    0.0847
  );
  let bc = 0,
    ac = 0;
  const bidDepth = bids.map(([price, list]) => {
    const amt = list.reduce((s, o) => s + (o.amount - o.filled), 0);
    bc += amt;
    return { price, cumulative: bc };
  });
  const askDepth = asks.map(([price, list]) => {
    const amt = list.reduce((s, o) => s + (o.amount - o.filled), 0);
    ac += amt;
    return { price, cumulative: ac };
  });
  res.json({
    bids: bidDepth.reverse(),
    asks: askDepth,
  });
});

// ─── Polymarket prediction markets proxy (avoids CORS) ───
const POLYMARKET_GAMMA = "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB = "https://clob.polymarket.com";
const JUPITER_API = "https://prediction-market-api.jup.ag/api/v1";

// Normalization for Jupiter (Solana)
function normalizeJupiterMarket(m) {
  const yesPrice = (m.pricing?.buyYesPriceUsd || 0) / 1e6;
  const noPrice = (m.pricing?.buyNoPriceUsd || 0) / 1e6;
  return {
    id: m.marketId, // Solana market ID (or proxy ID)
    question: m.metadata?.title || "Unknown",
    conditionId: null,
    slug: null,
    outcomes: ["Yes", "No"],
    outcomePrices: [yesPrice, noPrice],
    yesPrice,
    noPrice,
    volume: (m.pricing?.volume || 0) / 1e6,
    liquidity: 0, // Not provided directly in summary
    description: null,
    active: m.status === "open",
    closed: m.status === "closed",
    endDate: m.metadata?.closeTime || null,
  };
}

function normalizeJupiterEvent(e) {
  const markets = (e.markets || []).map(normalizeJupiterMarket);
  // Jupiter events often have multiple markets (candidates). 
  // We can treat them as a "group" event.
  // We'll pick the first market's prices for the card preview if handling single-market events,
  // but for things like "Presidential Winner", markets are candidates.

  return {
    id: e.eventId,
    slug: e.metadata?.slug || e.eventId,
    title: e.metadata?.title || "Untitled",
    image: e.metadata?.imageUrl || null,
    category: e.category || "unknown",
    endDate: e.metadata?.closeTime || null,
    volume: (parseFloat(e.volumeUsd) || 0) / 1e6,
    volume24h: 0, // Not explicitly in event summary, maybe calculate from markets?
    liquidity: 0,
    commentCount: 0,
    // Bubble up first market data for preview
    yesPrice: markets[0]?.yesPrice ?? null,
    noPrice: markets[0]?.noPrice ?? null,
    numMarkets: markets.length,
    markets,
    url: e.metadata?.slug ? `https://polymarket.com/event/${e.metadata.slug}` : null, // Jupiter often mirrors Poly slugs? Or we just link to internal generic page.
    network: "solana"
  };
}

// Helper: Polymarket returns some fields as JSON strings; safely parse them
function safeParse(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

// Normalize a Polymarket market object with properly parsed fields
function normalizeMarket(m) {
  const outcomes = safeParse(m.outcomes);
  const prices = safeParse(m.outcomePrices).map(Number);
  const tokenIds = safeParse(m.clobTokenIds);
  return {
    id: m.id,
    question: m.question || m.title || "",
    conditionId: m.conditionId || null,
    slug: m.slug || null,
    outcomes,
    outcomePrices: prices,
    yesPrice: prices[0] ?? null,
    noPrice: prices[1] ?? null,
    clobTokenIds: tokenIds,
    yesTokenId: tokenIds[0] || null,
    noTokenId: tokenIds[1] || null,
    volume: parseFloat(m.volume) || 0,
    liquidity: parseFloat(m.liquidity) || 0,
    description: m.description || null,
    active: m.active,
    closed: m.closed,
    endDate: m.endDate || m.end_date_iso || null,
    groupItemTitle: m.groupItemTitle || null,
    image: m.image || m.imageUrl || m.groupItemImage || m.groupItemImageRemote || m.icon || null,
  };
}

// Normalize a Polymarket event
function normalizeEvent(e) {
  const markets = (e.markets || []).map(normalizeMarket);
  const primaryMarket = markets[0] || {};
  return {
    id: e.id,
    slug: e.slug || null,
    title: e.title || "Untitled",
    image: e.image || null,
    category: e.tags?.[0]?.label || null,
    endDate: e.endDate || e.end_date || null,
    volume: parseFloat(e.volume) || 0,
    volume24h: parseFloat(e.volume24hr) || 0,
    liquidity: parseFloat(e.liquidity) || 0,
    commentCount: e.commentCount || 0,
    // For single-market events, bubble up the prices
    yesPrice: primaryMarket.yesPrice ?? null,
    noPrice: primaryMarket.noPrice ?? null,
    yesTokenId: primaryMarket.yesTokenId || null,
    noTokenId: primaryMarket.noTokenId || null,
    numMarkets: markets.length,
    markets,
    url: e.slug ? `https://polymarket.com/event/${e.slug}` : null,
    network: "polygon"
  };
}

// GET /api/prediction/markets — aggregated events from multiple sources
app.get("/api/prediction/markets", async (req, res) => {
  const singleTag = req.query.tag || "";
  try {
    const network = req.query.network || "solana"; // Default to Solana as requested

    // ─── POLYMARKET ONLY ───
    // Using Polymarket as the single source of truth for stability and charts.
    // Solana/Jupiter fetch removed to prevent "fake data" and missing charts.

    // ─── POLYMARKET (EXISTING) ───
    // If a specific tag is requested, do a single fetch for that tag
    if (singleTag) {
      const url = `${POLYMARKET_GAMMA}/events?closed=false&active=true&limit=100&order=volume24hr&ascending=false&tag_slug=${encodeURIComponent(singleTag)}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(r.status).json({ error: "Gamma API error" });
      const data = await r.json();
      const list = (Array.isArray(data) ? data : data.events || [])
        .filter((e) => { const end = e.endDate || e.end_date; return !(end && new Date(end).getTime() < Date.now()); })
        .map((e) => { const n = normalizeEvent(e); n.section = "category"; return n; });
      return res.json(list);
    }

    // Multiple parallel fetches to get deep coverage across categories + sort modes
    const POPULAR_TAGS = [
      "crypto", "bitcoin", "ethereum", "xrp",
      "sports", "soccer", "mlb",
      "politics", "elections", "world-elections",
      "ai", "culture", "business", "finance",
      "geopolitics", "economy", "esports",
    ];

    const fetchEventsPage = async (params, section = "trending") => {
      try {
        const url = `${POLYMARKET_GAMMA}/events?closed=false&active=true&${params}`;
        const r = await fetch(url);
        if (!r.ok) return [];
        const data = await r.json();
        return (Array.isArray(data) ? data : data.events || [])
          .filter((e) => { const end = e.endDate || e.end_date; return !(end && new Date(end).getTime() < Date.now()); })
          .map((e) => { const n = normalizeEvent(e); n.section = section; return n; });
      } catch { return []; }
    };

    // Fan out: trending, new, and many tags for broad coverage (more APIs = fuller list)
    const fetches = [
      fetchEventsPage("limit=60&order=volume24hr&ascending=false", "trending"),
      fetchEventsPage("limit=30&order=startDate&ascending=false", "new"),
      fetchEventsPage("limit=50&order=volume24hr&ascending=false&tag_slug=politics", "category"),
      fetchEventsPage("limit=50&order=volume24hr&ascending=false&tag_slug=crypto", "category"),
      fetchEventsPage("limit=50&order=volume24hr&ascending=false&tag_slug=sports", "category"),
      fetchEventsPage("limit=40&order=volume24hr&ascending=false&tag_slug=ai", "category"),
      fetchEventsPage("limit=40&order=volume24hr&ascending=false&tag_slug=business", "category"),
      fetchEventsPage("limit=40&order=volume24hr&ascending=false&tag_slug=finance", "category"),
      fetchEventsPage("limit=35&order=volume24hr&ascending=false&tag_slug=geopolitics", "category"),
      fetchEventsPage("limit=35&order=volume24hr&ascending=false&tag_slug=culture", "category"),
      fetchEventsPage("limit=30&order=volume24hr&ascending=false&tag_slug=elections", "category"),
    ];

    const results = await Promise.all(fetches);
    const flat = results.flat();

    // Deduplicate by event id, keeping the first occurrence (which has the highest-priority section)
    const seen = new Set();
    const deduped = [];
    for (const ev of flat) {
      if (!ev.id || seen.has(ev.id)) continue;
      seen.add(ev.id);
      deduped.push(ev);
    }

    // Sort final list: trending first (by volume24h), then new (by date)
    deduped.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));

    res.json(deduped);
  } catch (err) {
    console.warn("Prediction markets error:", err);
    res.status(500).json({ error: "Failed to fetch markets" });
  }
});

// GET /api/prediction/event/:slug — full event detail
app.get("/api/prediction/event/:slug", async (req, res) => {
  try {
    const network = req.query.network || "solana";

    // POLYMARKET ONLY
    // Removed Jupiter/Solana event lookup to ensure consistent data structure (tokens, etc)

    const r = await fetch(`${POLYMARKET_GAMMA}/events?slug=${encodeURIComponent(req.params.slug)}`);
    if (!r.ok) return res.status(r.status).json({ error: "Event not found" });
    const data = await r.json();
    const raw = Array.isArray(data) ? data[0] : data;
    if (!raw) return res.status(404).json({ error: "Event not found" });
    res.json(normalizeEvent(raw));
  } catch (err) {
    console.warn("Event detail error:", err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// GET /api/prediction/price?token_id=...&side=buy — live CLOB price
app.get("/api/prediction/price", async (req, res) => {
  const { token_id, side } = req.query;
  if (!token_id) return res.status(400).json({ error: "token_id required" });
  try {
    const r = await fetch(`${POLYMARKET_CLOB}/price?token_id=${encodeURIComponent(token_id)}&side=${side || "buy"}`);
    if (!r.ok) return res.status(r.status).json({ error: "CLOB price error" });
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

// GET /api/prediction/book?token_id=... — orderbook depth
app.get("/api/prediction/book", async (req, res) => {
  const { token_id } = req.query;
  if (!token_id) return res.status(400).json({ error: "token_id required" });
  try {
    const r = await fetch(`${POLYMARKET_CLOB}/book?token_id=${encodeURIComponent(token_id)}`);
    if (!r.ok) return res.status(r.status).json({ error: "CLOB book error" });
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orderbook" });
  }
});

// GET /api/prediction/tags — available categories
app.get("/api/prediction/tags", async (_req, res) => {
  try {
    const r = await fetch(`${POLYMARKET_GAMMA}/tags?limit=100`);
    if (!r.ok) return res.status(r.status).json({ error: "Tags error" });
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// GET /api/prediction/chart — price history (writeup: token_id + interval + fidelity)
// Query: yesTokenId, noTokenId, range = 1d | 1w | 1m | 3m | all
app.get("/api/prediction/chart", async (req, res) => {
  const { network, yesTokenId, noTokenId, range } = req.query;
  try {
    if (network === "solana") {
      return res.json({ yes: [], no: [] });
    }
    if (!yesTokenId && !noTokenId) return res.json({ yes: [], no: [] });

    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" };

    // Writeup: interval 1d/1w/1m/3m/all, fidelity 60 (hourly) for 1d/1w, 1440 (daily) for 1m/3m/all
    const rangeToInterval = (r) => {
      const s = String(r || "1w").toLowerCase();
      if (["1d", "1w", "1m", "3m", "all"].includes(s)) return s;
      if (s === "1h" || s === "6h") return "1d";
      return "1w";
    };
    const interval = rangeToInterval(range);
    const fidelity = (interval === "1d" || interval === "1w") ? 60 : 1440;
    const clobInterval = interval === "all" ? "all" : interval;

    const fetchHistory = async (tid) => {
      if (!tid) return [];
      try {
        const url = `${POLYMARKET_CLOB}/prices-history?token_id=${encodeURIComponent(tid)}&interval=${clobInterval}&fidelity=${fidelity}`;
        const r = await fetch(url, { headers });
        const data = r.ok ? await r.json() : { history: [] };
        let history = (data.history || []).sort((a, b) => (a.t || 0) - (b.t || 0));
        if (history.length === 0) {
          const bookUrl = `${POLYMARKET_CLOB}/book?token_id=${encodeURIComponent(tid)}`;
          const bookR = await fetch(bookUrl, { headers });
          if (bookR.ok) {
            const book = await bookR.json();
            const bestBid = book.bids?.[0]?.price ? parseFloat(book.bids[0].price) : 0;
            const bestAsk = book.asks?.[0]?.price ? parseFloat(book.asks[0].price) : 0;
            if (bestBid > 0 || bestAsk > 0) {
              const mid = (bestBid && bestAsk) ? (bestBid + bestAsk) / 2 : (bestBid || bestAsk);
              const nowSec = Math.floor(Date.now() / 1000);
              history = [
                { t: nowSec - 86400 * 7, p: mid },
                { t: nowSec, p: mid }
              ];
            }
          }
        }
        return history.map((p) => ({
          time: p.t,
          value: typeof p.p === "number" ? p.p : parseFloat(p.p) || 0
        }));
      } catch (e) {
        console.error("Chart fetch error", e);
        return [];
      }
    };

    const [yesHist, noHist] = await Promise.all([
      fetchHistory(yesTokenId),
      fetchHistory(noTokenId)
    ]);
    res.json({ yes: yesHist, no: noHist });
  } catch (e) {
    console.error("Chart Error", e);
    res.json({ yes: [], no: [] });
  }
});

// GET /api/prediction/activity — recent trades
app.get("/api/prediction/activity", async (req, res) => {
  const { marketId, network, yesTokenId, noTokenId } = req.query;
  try {
    // POLYMARKET (CLOB)
    // Fetch trades for YES and NO tokens
    const fetchTokenTrades = async (tid, side) => {
      if (!tid) return [];
      try {
        const r = await fetch(`${POLYMARKET_CLOB}/trades?market=${tid}`);
        if (!r.ok) return [];
        const d = await r.json();
        return (Array.isArray(d) ? d : []).map(t => ({
          id: t.match_id || t.timestamp,
          type: t.side, // buy/sell
          side: side,
          amount: parseFloat(t.size).toFixed(2),
          price: parseFloat(t.price).toFixed(2),
          time: new Date(Number(t.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          address: t.maker_address ? (t.maker_address.slice(0, 4) + "..." + t.maker_address.slice(-4)) : "0x..."
        }));
      } catch { return []; }
    };

    const [yesTrades, noTrades] = await Promise.all([
      fetchTokenTrades(yesTokenId, "yes"),
      fetchTokenTrades(noTokenId, "no")
    ]);
    const all = [...yesTrades, ...noTrades].sort((a, b) => b.time < a.time ? -1 : 1).slice(0, 20);
    return res.json(all);
  } catch (err) {
    console.error("Activity fetch error", err);
    res.json([]);
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Start (Express + WebSocket on same port for Render/Vercel compatibility)
httpServer.listen(PORT, () => {
  console.log(`Omega DEX API http://localhost:${PORT}`);
  console.log(`WebSocket on same port`);
});
