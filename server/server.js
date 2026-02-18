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

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? true
    : ["http://localhost:5173", "http://127.0.0.1:5173"],
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
setInterval(() => {
  const now = Date.now();
  for (const [id, bet] of ezBets) {
    if (bet.status !== "active") continue;
    const expiresAt = bet.placedAt + bet.timeframe * 1000;
    if (now < expiresAt) continue;
    const pairId = bet.pair || "PRE/mUSDC";
    const exitPrice = getMidPrice(pairId);
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
  const { address, amount, direction, timeframe, pair, txHash } = req.body;
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
  const ob = getOrderBook(pairId);
  const bids = getSortedBids(ob);
  const asks = getSortedAsks(ob);
  const bestBid = bids[0]?.[0] ?? 0.0847;
  const bestAsk = asks[0]?.[0] ?? 0.0847;
  const entryPrice = (bestBid + bestAsk) / 2 || 0.0847;
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
  };
}

// GET /api/prediction/markets — aggregated events from multiple sources
app.get("/api/prediction/markets", async (req, res) => {
  const singleTag = req.query.tag || "";
  try {
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

    // Fan out: trending, new, and per-tag fetches
    const fetches = [
      // Trending — top 100 by 24h volume
      fetchEventsPage("limit=100&order=volume24hr&ascending=false", "trending"),
      // New — most recently created/started
      fetchEventsPage("limit=80&order=startDate&ascending=false", "new"),
      // All-time volume for catching big markets not trending today
      fetchEventsPage("limit=60&order=volume&ascending=false", "popular"),
      // Per-tag deep fetches
      ...POPULAR_TAGS.map((tag) =>
        fetchEventsPage(`limit=40&order=volume24hr&ascending=false&tag_slug=${encodeURIComponent(tag)}`, "category")
      ),
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

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Start (Express + WebSocket on same port for Render/Vercel compatibility)
httpServer.listen(PORT, () => {
  console.log(`Omega DEX API http://localhost:${PORT}`);
  console.log(`WebSocket on same port`);
});
