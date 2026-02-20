/**
 * Uniswap Trading API client - https://docs.uniswap.org/trading-api
 * Used as fallback when 0x swap fails. All requests go through backend proxy so API key stays server-side.
 */

const UNISWAP_NATIVE = "0x0000000000000000000000000000000000000000";
const NATIVE_SENTINELS = new Set([
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
]);

const getApiBase = () => {
  const fallback = "https://olympus-api-n3xm.onrender.com";
  if (typeof window === "undefined") return fallback;
  try {
    const params = new URLSearchParams(window.location.search);
    let api = params.get("api");
    if (!api && window.location.search) {
      const m = window.location.search.match(/\?api-?(https?:\/\/[^\s&]+)/i);
      if (m) api = m[1];
    }
    if (api && (api.startsWith("http://") || api.startsWith("https://"))) return api.replace(/\/$/, "");
    const env = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || fallback).trim();
    if (env) return env.replace(/\/$/, "");
    const stored = localStorage.getItem("omega-api-url");
    if (stored && (stored.startsWith("http://") || stored.startsWith("https://"))) return stored.replace(/\/$/, "");
  } catch (_) {}
  return fallback;
};

const API_BASE = getApiBase();
const PROXY_QUOTE = `${API_BASE}/api/uniswap/quote`;
const PROXY_SWAP = `${API_BASE}/api/uniswap/swap`;

function toUniswapToken(address) {
  if (!address || typeof address !== "string") return address;
  const a = address.toLowerCase();
  return NATIVE_SENTINELS.has(a) ? UNISWAP_NATIVE : address;
}

/**
 * Get quote for exact sell amount (EXACT_INPUT).
 * @param {Object} p - { chainId, sellToken, buyToken, sellAmount (wei string), taker, slippageTolerance }
 */
export async function getQuote(p) {
  const body = {
    tokenIn: toUniswapToken(p.sellToken),
    tokenOut: toUniswapToken(p.buyToken),
    tokenInChainId: p.chainId,
    tokenOutChainId: p.chainId,
    type: "EXACT_INPUT",
    amount: String(p.sellAmount),
    swapper: p.taker || p.swapper,
    slippageTolerance: p.slippageTolerance ?? 0.5,
  };
  const res = await fetch(PROXY_QUOTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Uniswap quote failed (${res.status})`);
  return data;
}

/**
 * Get quote for exact buy amount (EXACT_OUTPUT).
 * @param {Object} p - { chainId, sellToken, buyToken, buyAmount (wei string), taker, slippageTolerance }
 */
export async function getQuoteForBuyAmount(p) {
  const body = {
    tokenIn: toUniswapToken(p.sellToken),
    tokenOut: toUniswapToken(p.buyToken),
    tokenInChainId: p.chainId,
    tokenOutChainId: p.chainId,
    type: "EXACT_OUTPUT",
    amount: String(p.buyAmount),
    swapper: p.taker || p.swapper,
    slippageTolerance: p.slippageTolerance ?? 0.5,
  };
  const res = await fetch(PROXY_QUOTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Uniswap quote failed (${res.status})`);
  return data;
}

/**
 * Convert a Uniswap quote into an unsigned transaction. Pass the quote response and the part you need (e.g. classicQuote).
 * @param {Object} opts - { classicQuote?, wrapUnwrapQuote?, bridgeQuote? } (one required; no Permit2 for now)
 * @returns {Promise<{ swap: { to, from, data, value, chainId, gasLimit?, maxFeePerGas?, maxPriorityFeePerGas? } }>}
 */
export async function getSwapTransaction(opts) {
  const body = {};
  if (opts.classicQuote) body.classicQuote = opts.classicQuote;
  else if (opts.wrapUnwrapQuote) body.wrapUnwrapQuote = opts.wrapUnwrapQuote;
  else if (opts.bridgeQuote) body.bridgeQuote = opts.bridgeQuote;
  else throw new Error("Uniswap swap: provide classicQuote, wrapUnwrapQuote, or bridgeQuote");
  const res = await fetch(PROXY_SWAP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Uniswap swap failed (${res.status})`);
  if (!data.swap || !data.swap.data) throw new Error("Uniswap returned invalid transaction (missing data)");
  return data;
}

/**
 * Pick the swap-ready quote from Uniswap quote response (CLASSIC, WRAP, UNWRAP, etc.) for use with getSwapTransaction.
 */
export function getSwapQuoteFromResponse(quoteResponse) {
  const q = quoteResponse;
  if (q.classicQuote) return { classicQuote: q.classicQuote };
  if (q.wrapUnwrapQuote) return { wrapUnwrapQuote: q.wrapUnwrapQuote };
  if (q.bridgeQuote) return { bridgeQuote: q.bridgeQuote };
  return null;
}
