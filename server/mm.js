import fetch from 'node-fetch';
import fs from 'fs';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const CONFIG_REFRESH_MS = 3000;

// --- BASE CONFIG (fetched from API, fallback) ---
let MM_BASE = {
    walletAddress: '0x32Be343B94f860124dC4fEe278FDCBD38C102D88',
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

async function fetchMMConfig() {
    try {
        const res = await fetch(`${API_URL}/mm/config`);
        const cfg = await res.json();
        if (cfg && typeof cfg.walletAddress === 'string') {
            const prev = JSON.stringify(MM_BASE);
            MM_BASE = { ...MM_BASE, ...cfg };
            if (JSON.stringify(MM_BASE) !== prev) {
                console.log('[MM] Config updated: spread=', MM_BASE.baseSpread, 'levels=', MM_BASE.ladderLevels, 'meanPrice=', MM_BASE.meanPrice);
            }
        }
    } catch (e) { /* use existing */ }
}

// --- PRICE DRIFT STATE (per pair) ---
const pairState = new Map(); // pairId -> { currentPrice, momentum, volatilityPhase, phaseTimer, activeOrders }

function getPairState(pairId) {
    if (!pairState.has(pairId)) {
        pairState.set(pairId, {
            currentPrice: MM_BASE.meanPrice ?? 0.0847,
            momentum: 0,
            volatilityPhase: 0,
            phaseTimer: 0,
            activeOrders: [],
        });
    }
    return pairState.get(pairId);
}

function driftPrice(state) {
    state.phaseTimer--;
    if (state.phaseTimer <= 0) {
        state.volatilityPhase = Math.random() < 0.3 ? 2 : Math.random() < 0.6 ? 1 : 0;
        state.phaseTimer = Math.floor(Math.random() * 20) + 5;
    }

    const vols = [MM_BASE.volatilityLow, MM_BASE.volatilityMid, MM_BASE.volatilityHigh];
    const volatility = vols[state.volatilityPhase] ?? 0.005;
    if (Math.random() < 0.2) {
        state.momentum += (Math.random() - 0.5) * volatility;
    }
    state.momentum *= 0.92;

    const noise = (Math.random() - 0.5) * volatility * 0.5;
    const meanPrice = MM_BASE.meanPrice ?? 0.0847;
    const pullStrength = Math.abs(state.currentPrice - meanPrice) > meanPrice * 0.15 ? 0.005 : 0.0005;
    const pull = (meanPrice - state.currentPrice) * pullStrength;

    state.currentPrice += state.momentum + noise + pull;
    state.currentPrice = Math.max(MM_BASE.priceMin ?? 0.04, Math.min(MM_BASE.priceMax ?? 0.14, state.currentPrice));

    if (Math.random() < 0.02) {
        const jump = (Math.random() - 0.5) * state.currentPrice * 0.08;
        state.currentPrice += jump;
    }
}

async function clearOldOrders(state) {
    for (const order of state.activeOrders) {
        try {
            await fetch(`${API_URL}/orders/${order.id}`, { method: 'DELETE' });
        } catch (e) { /* ignore */ }
    }
    state.activeOrders = [];
}

async function placeOrder(cfg, state, side, price, amount) {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: MM_BASE.walletAddress,
                side,
                price: parseFloat(price.toFixed(5)),
                amount: Math.floor(amount),
                token: cfg.quoteToken,
                chain: cfg.chain,
                pair: cfg.id,
            })
        });
        const data = await response.json();
        if (data.order) state.activeOrders.push(data.order);
        return data;
    } catch (e) {
        console.error(`[MM ${cfg.id}] Error placing order (${side}):`, e.message);
    }
}

const DEFAULT_MM_PAIR = { id: 'PRE/mUSDC', baseToken: 'PRE', quoteToken: 'mUSDC', chain: 'Omega' };

async function fetchMMPairs() {
    try {
        const res = await fetch(`${API_URL}/pairs`);
        const pairs = await res.json();
        const enabled = (Array.isArray(pairs) ? pairs : []).filter(p => p.mmEnabled);
        if (enabled.length > 0) return enabled;
        return [DEFAULT_MM_PAIR];
    } catch (e) {
        console.error('[MM] Failed to fetch pairs, using default:', e.message);
        return [DEFAULT_MM_PAIR];
    }
}

async function fetchMidPrice(cfg) {
    try {
        const res = await fetch(`${API_URL}/orderbook?pair=${encodeURIComponent(cfg.id)}`);
        const data = await res.json();
        const mid = data?.midPrice;
        if (typeof mid === 'number' && mid > 0) return mid;
    } catch (e) { /* ignore */ }
    return MM_BASE.meanPrice ?? 0.0847;
}

async function updateLiquidityForPair(cfg) {
    const state = getPairState(cfg.id);
    try {
        const bookMid = await fetchMidPrice(cfg);
        const pMin = MM_BASE.priceMin ?? 0.04;
        const pMax = MM_BASE.priceMax ?? 0.14;
        // Use book mid only if within configured range; otherwise use midpoint of range
        let center = bookMid > 0 ? bookMid : (state.currentPrice || (pMin + pMax) / 2);
        if (center < pMin || center > pMax) {
            center = (pMin + pMax) / 2;
        }
        state.currentPrice = center;
        driftPrice(state);
        center = state.currentPrice; // use drifted/clamped price for placing

        await clearOldOrders(state);
        for (let i = 1; i <= MM_BASE.ladderLevels; i++) {
            const spreadMult = 1 + (state.volatilityPhase === 2 ? Math.random() * 0.3 : 0);
            const buyPrice = center - (MM_BASE.baseSpread * i * spreadMult) - (Math.random() * 0.0002);
            const sellPrice = center + (MM_BASE.baseSpread * i * spreadMult) + (Math.random() * 0.0002);
            const amount = MM_BASE.orderSizeBase * (0.6 + Math.random() * 1.2);

            await placeOrder(cfg, state, 'buy', buyPrice, amount);
            await placeOrder(cfg, state, 'sell', sellPrice, amount);
        }
        console.log(`[MM] ${cfg.id}: ${state.activeOrders.length} orders @ ${center.toFixed(5)}`);
    } catch (e) {
        console.error(`[MM ${cfg.id}] Depth Update Error:`, e.message);
    }
}

async function simulateVolumeForPair(cfg) {
    const state = getPairState(cfg.id);
    try {
        const center = state.currentPrice || MM_BASE.meanPrice || 0.0847;
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const tradePrice = side === 'buy'
            ? center + MM_BASE.baseSpread * 2
            : center - MM_BASE.baseSpread * 2;
        const amount = MM_BASE.orderSizeBase * (0.25 + Math.random() * 1.0);

        await placeOrder(cfg, state, side, tradePrice, amount);
    } catch (e) {
        console.error(`[MM ${cfg.id}] Volume Error:`, e.message);
    }
}

async function runMMCycle() {
    const mmPairs = await fetchMMPairs();
    if (mmPairs.length === 0) return;
    for (const cfg of mmPairs) {
        await updateLiquidityForPair(cfg);
    }
}

async function runVolumeCycle() {
    const mmPairs = await fetchMMPairs();
    if (mmPairs.length === 0) return;
    const cfg = mmPairs[Math.floor(Math.random() * mmPairs.length)];
    await simulateVolumeForPair(cfg);
}

async function start() {
    await fetchMMConfig();
    console.log('--- Olympus Market Maker Started ---');
    console.log(`Wallet: ${MM_BASE.walletAddress}`);
    console.log(`Config: spread=${MM_BASE.baseSpread}, levels=${MM_BASE.ladderLevels}, orderSize=${MM_BASE.orderSizeBase}`);
    console.log(`Intervals: update=${MM_BASE.updateInterval}ms, volume=${MM_BASE.volumeInterval}ms`);

    await runMMCycle();

    setInterval(fetchMMConfig, CONFIG_REFRESH_MS);
    setInterval(runMMCycle, MM_BASE.updateInterval);
    setInterval(runVolumeCycle, MM_BASE.volumeInterval);
}

process.on('uncaughtException', (err) => {
    fs.appendFileSync('mm_fatal.log', `Uncaught Exception: ${err.stack}\n`);
    console.error('CRITICAL:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    fs.appendFileSync('mm_fatal.log', `Unhandled Rejection: ${reason}\n`);
    console.error('CRITICAL:', reason);
    process.exit(1);
});

start().catch(err => {
    fs.appendFileSync('mm_fatal.log', `Start Error: ${err.stack}\n`);
    process.exit(1);
});
