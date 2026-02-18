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

const API = "/api/prediction";

/** Fetch prediction markets (server does multi-source aggregation). */
export async function fetchPredictionMarkets(tag = "") {
  try {
    let url = `${API}/markets`;
    if (tag) url += `?tag=${encodeURIComponent(tag)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load prediction markets");
    return await res.json();
  } catch (err) {
    console.warn("Prediction markets fetch failed:", err);
    return [];
  }
}

/** Fetch full event detail by slug. */
export async function fetchPredictionEvent(slug) {
  try {
    const res = await fetch(`${API}/event/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("Event not found");
    return await res.json();
  } catch (err) {
    console.warn("Prediction event fetch failed:", err);
    return null;
  }
}

/** Fetch live CLOB price for a token. */
export async function fetchClobPrice(tokenId, side = "buy") {
  try {
    const res = await fetch(`${API}/price?token_id=${encodeURIComponent(tokenId)}&side=${side}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
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
