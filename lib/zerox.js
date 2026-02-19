/**
 * 0x Swap API client - https://docs.0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api
 * Aggregates 150+ DEX sources. Add swapFeeBps/swapFeeRecipient to monetize.
 * Uses backend proxy (/api/zerox/*) to avoid CORS; falls back to direct 0x API.
 */
const API_KEY = import.meta.env.VITE_0X_API_KEY || "";
const FEE_RECIPIENT = import.meta.env.VITE_0X_FEE_RECIPIENT || "";
const FEE_BPS = parseInt(import.meta.env.VITE_0X_FEE_BPS || "0", 10) || 0;

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
  } catch (_) { }
  return fallback;
};

const API_BASE = getApiBase();

const PROXY_BASE = `${API_BASE}/api/zerox`;
const DIRECT_BASE = "https://api.0x.org/swap/allowance-holder";

function headers() {
  const h = { "0x-version": "v2" };
  if (API_KEY) h["0x-api-key"] = API_KEY;
  return h;
}

function useProxy() {
  return true;
}

async function fetch0x(path, params) {
  const url = useProxy()
    ? `${PROXY_BASE}${path}?${params}`
    : `${DIRECT_BASE}${path}?${params}`;
  return fetch(url, { headers: useProxy() ? {} : headers() });
}

/**
 * Get indicative price (read-only, no commitment)
 * @param {Object} p - { chainId, sellToken, buyToken, sellAmount, taker }
 */
export async function getPrice(p) {
  const params = new URLSearchParams({
    chainId: String(p.chainId),
    sellToken: p.sellToken,
    buyToken: p.buyToken,
    sellAmount: String(p.sellAmount),
    taker: p.taker || "0x0000000000000000000000000000000000000000",
  });
  if (FEE_RECIPIENT && FEE_BPS > 0) {
    params.set("swapFeeRecipient", FEE_RECIPIENT);
    params.set("swapFeeBps", String(FEE_BPS));
    params.set("swapFeeToken", p.sellToken);
  }
  const res = await fetch0x("/price", params);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("0x API returned invalid response. Check network and API key.");
  }
  if (!res.ok) {
    const msg = data?.reason || data?.message || data?.validationErrors?.[0]?.reason || "0x price failed";
    throw new Error(msg);
  }
  return data;
}

/**
 * Get firm quote and transaction to submit
 * @param {Object} p - { chainId, sellToken, buyToken, sellAmount, taker }
 */
export async function getQuote(p) {
  const params = new URLSearchParams({
    chainId: String(p.chainId),
    sellToken: p.sellToken,
    buyToken: p.buyToken,
    sellAmount: String(p.sellAmount),
    taker: p.taker,
  });
  if (FEE_RECIPIENT && FEE_BPS > 0) {
    params.set("swapFeeRecipient", FEE_RECIPIENT);
    params.set("swapFeeBps", String(FEE_BPS));
    params.set("swapFeeToken", p.sellToken);
  }
  const res = await fetch0x("/quote", params);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("0x API returned invalid response.");
  }
  if (!res.ok) throw new Error(data?.reason || data?.message || "0x quote failed");
  return data;
}

/** Get quote when user wants to buy X amount of buyToken (use sellAmount derived or inverse) */
export async function getQuoteForBuyAmount(p) {
  const params = new URLSearchParams({
    chainId: String(p.chainId),
    sellToken: p.sellToken,
    buyToken: p.buyToken,
    buyAmount: String(p.buyAmount),
    taker: p.taker,
  });
  if (FEE_RECIPIENT && FEE_BPS > 0) {
    params.set("swapFeeRecipient", FEE_RECIPIENT);
    params.set("swapFeeBps", String(FEE_BPS));
    params.set("swapFeeToken", p.sellToken);
  }
  const res = await fetch0x("/quote", params);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("0x API returned invalid response.");
  }
  if (!res.ok) throw new Error(data?.reason || data?.message || "0x quote failed");
  return data;
}

// Ethereum mainnet (chainId 1)
export const ETH_NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const WETH_ETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const USDT_ETH = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
export const DAI_ETH = "0x6B175474E89094C44Da98b954Eedeac495271d0F";
export const WBTC_ETH = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
export const LINK_ETH = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
export const UNI_ETH = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
export const AAVE_ETH = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
export const CRV_ETH = "0xD533a949740bb3306d119CC777fa900bA034cd52";
export const MKR_ETH = "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2";
export const MATIC_ETH = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0"; // WMATIC on Ethereum
export const ARB_ETH = "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1";
export const OP_ETH = "0x4200000000000000000000000000000000000042";
export const SNX_ETH = "0xC011a73ee8576Fb46F5E1c5751cA3B9F0D2F6F2";
export const LDO_ETH = "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32";
export const PEPE_ETH = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";
export const SHIB_ETH = "0x95aD61b0a150d79219dC64Ff2e44dA2d6b229F8E";
export const SAND_ETH = "0x3845badAde8e6dFF049820680d1F14bD3903a5d0";
export const MANA_ETH = "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942";
// Meme & popular (Ethereum)
export const FLOKI_ETH = "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E";
export const BONK_ETH = "0x1151CB3d861920e07a38e03eEAd12C32178567F6";
export const WIF_ETH = "0x81B4dB0c719DB9bC7A8D8EbCF58CA2162BC53353";
export const RENDER_ETH = "0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24";
export const FET_ETH = "0xaea46A60368A7bd060eec7DF8Cba43b7EF41ad85";
export const DOT_ETH = "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402";
export const APT_ETH = "0x42aD8AED9519efc6dC8B699d261A25cF79021596"; // Aptos (wrapped/bridged on Ethereum)
// Polygon (137)
export const WMATIC_POLY = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
export const USDC_POLY = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
export const WETH_POLY = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
// Arbitrum (42161)
export const ETH_NATIVE_ARB = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export const ARB_ARB = "0x912CE59144191C1204E64559FE8253a0e49E6548";
// Optimism (10)
export const ETH_NATIVE_OP = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const USDC_OP = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
export const OP_OP = "0x4200000000000000000000000000000000000042";
// Base (8453)
export const ETH_NATIVE_BASE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const DEGEN_BASE = "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed";
// BNB Chain (56)
export const BNB_NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
export const USDC_BSC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
export const FLOKI_BSC = "0xfb5B838b6cfEEdC2873aB27866079AC55363D37E";
export const CAKE_BSC = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";
export const DOGE_BSC = "0xbA2aE424d960c26247Dd6c32edC70B95c946FdFD";
export const PEPE_BSC = "0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00";
export const SHIB_BSC = "0x2859e4544C4Bb03966803b044A93563Bd2D0dd4D";
// Avalanche C-Chain (43114)
export const WAVAX_AVAX = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
export const USDC_AVAX = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
export const WETH_AVAX = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB";
