/**
 * Polymarket prediction markets API client.
 * All data fetched via backend proxy to avoid CORS.
 *
 * Endpoints:
 *   GET /api/prediction/markets?limit=20&tag=crypto  — trending events
 *   GET /api/prediction/event/:slug                  — event detail + markets
 *   GET /api/prediction/price?token_id=...&side=buy  — live CLOB price
 *   GET /api/prediction/book?token_id=...            — orderbook depth
 *   GET /api/prediction/tags                         — category tags
 */

const API_BASE = import.meta.env.VITE_API_URL || "https://olympus-api-n3xm.onrender.com";
const API = API_BASE ? `${API_BASE.replace(/\/$/, "")}/api/prediction` : "/api/prediction";

/** Fetch prediction markets (server does multi-source aggregation). */
export async function fetchPredictionMarkets(tag = "", network = "solana") {
  try {
    let url = `${API}/markets?network=${encodeURIComponent(network)}`;
    if (tag) url += `&tag=${encodeURIComponent(tag)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

/** Fetch full event detail by slug. */
export async function fetchPredictionEvent(slug, network = "solana") {
  try {
    const url = `${API}/event/${encodeURIComponent(slug)}?network=${encodeURIComponent(network)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Event not found");
    return await res.json();
  } catch (err) {
    console.warn(err);
    return null;
  }
}

/** Fetch live CLOB price for a token. */
export async function fetchClobPrice(tokenId, side = "buy") {
  // This probably only works for Polymarket/CLOB. 
  // For Jupiter, we might need a different price fetcher or just use the cached price from the event.
  try {
    const res = await fetch(`${API_BASE}/api/prediction/price?token_id=${tokenId}&side=${side}`);
    if (!res.ok) throw new Error("Price error");
    return await res.json();
  } catch (err) {
    return { price: 0 };
  }
}

/** Fetch orderbook for a token. */
export async function fetchOrderbook(tokenId) {
  try {
    const res = await fetch(`${API}/book?token_id=${encodeURIComponent(tokenId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** Fetch available category tags. */
export async function fetchPredictionTags() {
  try {
    const res = await fetch(`${API}/tags`);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

// Keep backwards compat alias
export const fetchAllPredictionMarkets = (limit) => fetchPredictionMarkets(limit);
