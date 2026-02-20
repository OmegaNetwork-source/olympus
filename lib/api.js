const getApiBase = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const api = params.get("api");
    if (api) return api;
    // Local dev: when app is on localhost, use local API so you don't need VITE_API_URL
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) return import.meta.env.VITE_API_URL || "http://localhost:3001";
  }
  return import.meta.env.VITE_API_URL || "https://olympus-api-n3xm.onrender.com";
};

const API_BASE = getApiBase();
const API = API_BASE ? `${API_BASE.replace(/\/$/, "")}/api` : "/api";
const WS_URL = API_BASE
  ? `${API_BASE.startsWith("https") ? "wss" : "ws"}://${new URL(API_BASE).host}`
  : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.hostname}:3002`;

const API_UNAVAILABLE = "API server unavailable. Run: npm run dev:api";

async function safeJson(res) {
  const text = await res.text();
  if (!text || text.trim() === "") {
    throw new Error(API_UNAVAILABLE);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(API_UNAVAILABLE);
  }
}

export async function fetchPairs() {
  try {
    const res = await fetch(`${API}/pairs`);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to fetch pairs");
    return data;
  } catch (e) {
    if (e.message === API_UNAVAILABLE) throw e;
    throw new Error("Failed to fetch pairs");
  }
}

export async function listToken(params) {
  const res = await fetch(`${API}/pairs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to list token");
  return data;
}

export async function enableMM(pairId) {
  const res = await fetch(`${API}/mm/enable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pair: pairId }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to enable MM");
  return data;
}

export async function disableMM(pairId) {
  const res = await fetch(`${API}/mm/disable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pair: pairId }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to disable MM");
  return data;
}

export async function fetchMMConfig() {
  const res = await fetch(`${API}/mm/config`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch MM config");
  return data;
}

export async function updateMMConfig(adminAddress, config) {
  const addr = (adminAddress || "").toLowerCase();
  const numKeys = ["baseSpread", "ladderLevels", "orderSizeBase", "volumeInterval", "updateInterval", "meanPrice", "priceMin", "priceMax", "volatilityLow", "volatilityMid", "volatilityHigh"];
  const sanitized = { ...config, adminAddress: addr };
  for (const k of numKeys) {
    if (config[k] !== undefined) {
      const n = typeof config[k] === "number" ? config[k] : parseFloat(config[k]);
      sanitized[k] = Number.isNaN(n) ? config[k] : n;
    }
  }
  const res = await fetch(`${API}/mm/config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Address": addr,
    },
    body: JSON.stringify(sanitized),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to update MM config");
  return data;
}

export async function fetchOrderBook(pairId) {
  try {
    const url = pairId ? `${API}/orderbook?pair=${encodeURIComponent(pairId)}` : `${API}/orderbook`;
    const res = await fetch(url);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to fetch orderbook");
    return data;
  } catch (e) {
    if (e.message === API_UNAVAILABLE) throw e;
    throw new Error(API_UNAVAILABLE);
  }
}

export async function fetchTrades(limit = 50, pairId) {
  try {
    const q = new URLSearchParams({ limit });
    if (pairId) q.set("pair", pairId);
    const res = await fetch(`${API}/trades?${q}`);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to fetch trades");
    return data;
  } catch (e) {
    if (e.message === API_UNAVAILABLE) throw e;
    throw new Error(API_UNAVAILABLE);
  }
}

export async function fetchDepth(pairId) {
  try {
    const url = pairId ? `${API}/depth?pair=${encodeURIComponent(pairId)}` : `${API}/depth`;
    const res = await fetch(url);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to fetch depth");
    return data;
  } catch (e) {
    if (e.message === API_UNAVAILABLE) throw e;
    throw new Error(API_UNAVAILABLE);
  }
}

export async function fetchUserOrders(address, pairId) {
  if (!address) return [];
  const url = pairId
    ? `${API}/orders/${encodeURIComponent(address)}?pair=${encodeURIComponent(pairId)}`
    : `${API}/orders/${encodeURIComponent(address)}`;
  const res = await fetch(url);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch orders");
  return data;
}

export async function fetchUserTrades(address, limit = 100) {
  if (!address) return [];
  const res = await fetch(`${API}/trades/user/${encodeURIComponent(address)}?limit=${limit}`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch user trades");
  return data;
}

export async function placeOrder(orderParams) {
  const body = { ...orderParams };
  if (orderParams.pair) body.pair = orderParams.pair;
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      address: orderParams.address.toLowerCase(),
      price: parseFloat(orderParams.price),
      amount: parseFloat(orderParams.amount),
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to place order");
  return data;
}

export async function cancelOrder(orderId) {
  const res = await fetch(`${API}/orders/${orderId}`, { method: "DELETE" });
  if (!res.ok) {
    let data = {};
    try { data = await safeJson(res); } catch (_) { }
    throw new Error(data.error || "Failed to cancel order");
  }
  return safeJson(res);
}

// EZ PEZE
export async function fetchEzPezeConfig() {
  const res = await fetch(`${API}/ezpeze/config`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch EZ PEZE config");
  return data;
}

export async function placeEzPezeBet({ address, amount, direction, timeframe, pair, txHash, entryPrice, leverage }) {
  const res = await fetch(`${API}/ezpeze/bet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: address.toLowerCase(),
      amount: parseFloat(amount),
      direction: String(direction).toLowerCase(),
      timeframe: parseInt(timeframe, 10) || 60,
      pair: pair || "PRE/mUSDC",
      txHash,
      entryPrice: entryPrice != null ? parseFloat(entryPrice) : undefined,
      leverage: leverage != null && leverage !== "" ? Number(leverage) : undefined,
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to place bet");
  return data;
}

export async function fetchEzPezeBets(address) {
  if (!address) return [];
  const res = await fetch(`${API}/ezpeze/bets/${encodeURIComponent(address)}`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch bets");
  return data;
}

// Referral: 100 PRE for referee, 500 PRE claimable for referrer
export async function fetchReferralConfig() {
  const res = await fetch(`${API}/referral/config`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch referral config");
  return data;
}

export async function fetchReferralMe(address) {
  if (!address) return null;
  const res = await fetch(`${API}/referral/me?address=${encodeURIComponent(address)}`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch referral status");
  return data;
}

export async function claimReferralReferee({ address, code }) {
  const res = await fetch(`${API}/referral/claim-referee`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: address.toLowerCase(), code: (code || "").trim() }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to claim");
  return data;
}

export async function claimReferralReferrer(address) {
  const res = await fetch(`${API}/referral/claim-referrer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: address.toLowerCase() }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to claim referrer reward");
  return data;
}

// Omega chain block explorer (for tx links)
export const OMEGA_EXPLORER_TX = (txHash) => `https://0x4e4542bc.explorer.aurora-cloud.dev/tx/${txHash}`;

// Earn tasks: Omega Music video reward
export async function fetchEarnMe(address) {
  if (!address) return null;
  const res = await fetch(`${API}/earn/me?address=${encodeURIComponent(address.toLowerCase())}`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to fetch earn status");
  return data;
}

export async function claimEarnOmegaMusic(address) {
  const res = await fetch(`${API}/earn/claim-omega-music`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: address.toLowerCase() }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Claim failed");
  return data;
}

export async function generateInitialReferralCodes(adminAddress, count = 20) {
  const res = await fetch(`${API}/referral/admin/generate-initial-codes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Address": (adminAddress || "").toLowerCase(),
    },
    body: JSON.stringify({ count }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to generate codes");
  return data;
}

export function createOrderBookSocket(onMessage) {
  let ws;
  let closed = false;

  function connect() {
    ws = new WebSocket(WS_URL);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMessage(msg);
      } catch (_) { }
    };
    ws.onclose = () => {
      if (!closed) setTimeout(connect, 1000);
    };
    ws.onerror = () => { };
  }

  connect();

  return {
    close() {
      closed = true;
      if (ws) ws.close();
    }
  };
}
