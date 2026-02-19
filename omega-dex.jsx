import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import OmegaLogo from "./OmegaLogo.jsx";
import Casino from "./Casino.jsx";
import OlympusLogo from "./OlympusLogo.jsx";
import { useWallet } from "./lib/useWallet.js";
import {
  fetchOrderBook,
  fetchTrades,
  fetchDepth,
  fetchUserOrders,
  fetchUserTrades,
  fetchPairs,
  listToken,
  enableMM,
  disableMM,
  fetchMMConfig,
  updateMMConfig,
  placeOrder as apiPlaceOrder,
  cancelOrder as apiCancelOrder,
  createOrderBookSocket,
  fetchEzPezeConfig,
  placeEzPezeBet,
  fetchEzPezeBets,
} from "./lib/api.js";
import { fetchPredictionMarkets, fetchPredictionEvent } from "./lib/predictionApi.js";
import { placePolymarketOrder } from "./lib/polymarketOrder.js";
import {
  getPrice, getQuote, getQuoteForBuyAmount,
  ETH_NATIVE, USDC_ETH, USDT_ETH, DAI_ETH, WBTC_ETH, LINK_ETH, UNI_ETH, AAVE_ETH, CRV_ETH, MKR_ETH,
  MATIC_ETH, ARB_ETH, OP_ETH, SNX_ETH, LDO_ETH, PEPE_ETH, SHIB_ETH, SAND_ETH, MANA_ETH,
  FLOKI_ETH, BONK_ETH, WIF_ETH, RENDER_ETH, FET_ETH, DOT_ETH, APT_ETH,
  WETH_ETH, WMATIC_POLY, USDC_POLY, WETH_POLY, ETH_NATIVE_ARB, USDC_ARB, ARB_ARB,
  ETH_NATIVE_OP, USDC_OP, OP_OP, ETH_NATIVE_BASE, USDC_BASE, DEGEN_BASE, BNB_NATIVE, USDT_BSC, USDC_BSC,
  FLOKI_BSC, CAKE_BSC, DOGE_BSC, PEPE_BSC, SHIB_BSC,
  WAVAX_AVAX, USDC_AVAX, WETH_AVAX,
} from "./lib/zerox.js";
import TradingViewChart from "./components/TradingViewChart.jsx";
import CryptoNews from "./components/CryptoNews.jsx";
import PredictionNews from "./components/PredictionNews.jsx";
import PredictionChart from "./components/PredictionChart.jsx";
import TradingViewTechnical from "./components/TradingViewTechnical.jsx";

// ─── Theme System: Dark (default) + Light ───
const DARK_THEME = {
  glass: {
    bg: "rgba(255,255,255,0.05)", bgHover: "rgba(255,255,255,0.08)", bgActive: "rgba(255,255,255,0.12)",
    border: "rgba(255,255,255,0.1)", text: "#ffffff", textSecondary: "rgba(255,255,255,0.7)", textTertiary: "rgba(255,255,255,0.4)",
    green: "#30d158", red: "#ff453a", accent: "#bf5af2", gold: "#fbbf24",
  },
  panel: {
    background: "rgba(25, 25, 25, 0.6)", backdropFilter: "blur(40px) saturate(150%)", WebkitBackdropFilter: "blur(40px) saturate(150%)",
    border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 40,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
  },
  panelInner: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24 },
  page: { background: "#08080a" },
  orbs: [
    { background: "radial-gradient(circle, rgba(191,90,242,0.2) 0%, transparent 70%)", filter: "blur(100px)" },
    { background: "radial-gradient(circle, rgba(48,209,88,0.15) 0%, transparent 70%)", filter: "blur(120px)" },
  ],
  headerShadow: "0 10px 40px rgba(0,0,0,0.3)",
  chart: { grid: "rgba(255,255,255,0.03)", label: "rgba(255,255,255,0.6)", text: "#fff", depthLabel: "rgba(255,255,255,0.2)", volGreen: "rgba(48,209,88,0.15)", volRed: "rgba(255,69,58,0.15)" },
  orderBook: { askBar: "rgba(255,69,58,0.12)", bidBar: "rgba(50,215,75,0.12)" },
};

const LIGHT_THEME = {
  glass: {
    bg: "rgba(255,255,255,0.8)", bgHover: "rgba(251,191,36,0.1)", bgActive: "rgba(251,191,36,0.15)",
    border: "rgba(0,0,0,0.18)", text: "#1a1a1a", textSecondary: "rgba(26,26,26,0.7)", textTertiary: "rgba(26,26,26,0.5)",
    green: "#16a34a", red: "#dc2626", accent: "#D4AF37", gold: "#D4AF37",
  },
  panel: {
    background: "rgba(255,255,255,0.95)", backdropFilter: "blur(24px) saturate(120%)", WebkitBackdropFilter: "blur(24px) saturate(120%)",
    border: "1px solid rgba(0,0,0,0.2)", borderRadius: 40,
    boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
  },
  panelInner: { background: "rgba(255,250,240,0.8)", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 24 },
  page: { background: "linear-gradient(180deg, #FFFEF9 0%, #FFF9E6 50%, #FFF5D6 100%)" },
  orbs: [
    { background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.05) 40%, transparent 70%)", filter: "blur(80px)" },
    { background: "radial-gradient(circle, rgba(255,215,0,0.12) 0%, rgba(212,175,55,0.04) 50%, transparent 70%)", filter: "blur(100px)" },
  ],
  headerShadow: "0 4px 24px rgba(212,175,55,0.1)",
  chart: { grid: "rgba(26,26,26,0.06)", label: "rgba(26,26,26,0.5)", text: "#1a1a1a", depthLabel: "rgba(26,26,26,0.4)", volGreen: "rgba(22,163,74,0.2)", volRed: "rgba(220,38,38,0.2)" },
  orderBook: { askBar: "rgba(220,38,38,0.15)", bidBar: "rgba(22,163,74,0.15)" },
};

const THEMES = { dark: DARK_THEME, light: LIGHT_THEME };
const ThemeContext = createContext({ theme: "dark", t: DARK_THEME, setTheme: () => { } });
const ADMIN_WALLET = "0xe4eb34392f232c75d0ac3b518ce5e265bcb35e8c";
const useTheme = () => useContext(ThemeContext);

// SVG Filter for Refraction & Chromatic Aberration
const LiquidGlassSVG = () => (
  <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
    <defs>
      <filter id="liquid-glass-filter" x="-20%" y="-20%" width="140%" height="140%">
        {/* Chromatic Aberration: Split RGB */}
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />

        {/* Refractive Turbulence */}
        <feTurbulence type="fractalNoise" baseFrequency="0.005" numOctaves="2" result="noise" />

        {/* Shift channels differently for aberration */}
        <feDisplacementMap in="r" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" result="rDisp" />
        <feDisplacementMap in="g" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" result="gDisp" />
        <feDisplacementMap in="b" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="bDisp" />

        {/* Recombine */}
        <feBlend in="rDisp" in2="gDisp" mode="screen" result="rg" />
        <feBlend in="rg" in2="bDisp" mode="screen" result="refracted" />

        {/* Specular Edge Lighting */}
        <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
        <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1.2" specularExponent="30" lightingColor="#ffffff" result="spec">
          <fePointLight x={-5000} y={-10000} z={20000} />
        </feSpecularLighting>

        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
        <feComposite in="refracted" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.8" k4="0" />
      </filter>
    </defs>
  </svg>
);


// ─── Constants ───
const CHAINS = [
  { id: 1, name: "Ethereum", symbol: "ETH", icon: "⟠" },
  { id: 56, name: "BNB Chain", symbol: "BNB", icon: "◆" },
  { id: 137, name: "Polygon", symbol: "MATIC", icon: "⬡" },
  { id: 42161, name: "Arbitrum", symbol: "ARB", icon: "◈" },
  { id: 10, name: "Optimism", symbol: "OP", icon: "◉" },
  { id: 43114, name: "Avalanche", symbol: "AVAX", icon: "▲" },
  { id: 8453, name: "Base", symbol: "BASE", icon: "◎" },
  { id: 101, name: "Solana", symbol: "SOL", icon: "≡" },
  { id: 1313161916, name: "Omega", symbol: "OMEGA", icon: "Ω" },
];


const TOKENS = {
  1: ["ETH", "USDC", "USDT", "DAI", "WBTC", "LINK"],
  56: ["BNB", "BUSD", "USDT", "CAKE", "XRP"],
  137: ["MATIC", "USDC", "USDT", "AAVE", "WETH"],
  42161: ["ETH", "USDC", "ARB", "GMX", "WBTC"],
  10: ["ETH", "USDC", "OP", "SNX", "WBTC"],
  43114: ["AVAX", "USDC", "USDT", "JOE", "WETH"],
  8453: ["ETH", "USDC", "USDbC", "cbETH"],
  101: ["SOL", "USDC", "USDT", "RAY", "JUP"],
  1313161916: ["PRE", "mUSDC", "OMEGA"],
};

const TOKEN_ADDRESSES = {
  1313161916: {
    "PRE": "0xB8149d86Fb75C9A7e3797d6923c12e5076b6AEd9",
    "mUSDC": "0x24A4704dE79819e4Dcb379cC548426F03f663b09",
    "OMEGA": "0x0000000000000000000000000000000000000000"
  }
};


// ─── Depth Chart ───
const DepthChart = ({ depthData }) => {
  const { t } = useTheme();
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !depthData || !depthData.bids?.length || !depthData.asks?.length) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const rw = w / 2, rh = h / 2;
    ctx.clearRect(0, 0, rw, rh);

    const allP = [...depthData.bids, ...depthData.asks].map((d) => d.price);
    const maxC = Math.max(...depthData.bids.map((d) => d.cumulative), ...depthData.asks.map((d) => d.cumulative));
    const minP = Math.min(...allP), maxP = Math.max(...allP);
    const pad = 30;
    const xS = (p) => pad + ((p - minP) / (maxP - minP)) * (rw - pad * 2);
    const yS = (v) => rh - pad - (v / maxC) * (rh - pad * 2);

    ctx.strokeStyle = t.chart.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) { const y = pad + (i / 4) * (rh - pad * 2); ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(rw - pad, y); ctx.stroke(); }

    ctx.beginPath();
    ctx.moveTo(xS(depthData.bids[0].price), rh - pad);
    depthData.bids.forEach((d) => ctx.lineTo(xS(d.price), yS(d.cumulative)));
    ctx.lineTo(xS(depthData.bids[depthData.bids.length - 1].price), rh - pad);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, 0, 0, rh);
    bg.addColorStop(0, "rgba(45,212,160,0.25)"); bg.addColorStop(1, "rgba(45,212,160,0.01)");
    ctx.fillStyle = bg; ctx.fill();
    ctx.beginPath();
    depthData.bids.forEach((d, i) => i === 0 ? ctx.moveTo(xS(d.price), yS(d.cumulative)) : ctx.lineTo(xS(d.price), yS(d.cumulative)));
    ctx.strokeStyle = t.glass.green; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xS(depthData.asks[0].price), rh - pad);
    depthData.asks.forEach((d) => ctx.lineTo(xS(d.price), yS(d.cumulative)));
    ctx.lineTo(xS(depthData.asks[depthData.asks.length - 1].price), rh - pad);
    ctx.closePath();
    const ag = ctx.createLinearGradient(0, 0, 0, rh);
    ag.addColorStop(0, "rgba(248,113,113,0.25)"); ag.addColorStop(1, "rgba(248,113,113,0.01)");
    ctx.fillStyle = ag; ctx.fill();
    ctx.beginPath();
    depthData.asks.forEach((d, i) => i === 0 ? ctx.moveTo(xS(d.price), yS(d.cumulative)) : ctx.lineTo(xS(d.price), yS(d.cumulative)));
    ctx.strokeStyle = t.glass.red; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = t.chart.depthLabel;
    ctx.font = "9px -apple-system, SF Pro Text, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) { const p = minP + (i / 4) * (maxP - minP); ctx.fillText(p.toFixed(4), xS(p), rh - 10); }
  }, [depthData, t]);
  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
};

// ─── Mini Candlestick Chart ───
// Uses a rolling candle buffer: generates history once, then updates
// the last candle in-place on each price tick. Closes & opens a new
// candle every few seconds so the chart evolves naturally.
const MiniChart = ({ activeTool, drawings, onAddDrawing, midPrice, trades: liveTrades, chartTf }) => {
  const { t } = useTheme();
  const canvasRef = useRef(null);
  const chartState = useRef({ candles: [], tf: "", lastNewCandle: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const rw = w / 2, rh = h / 2;

    const currentMid = midPrice || 0.0847;

    // Timeframe config — tickMs = how often we close a candle (compressed for demo)
    const tfConfig = {
      "1m": { count: 60, stepMs: 60000, tickMs: 3000, labelFmt: "mm" },
      "5m": { count: 60, stepMs: 300000, tickMs: 5000, labelFmt: "HH:mm" },
      "15m": { count: 48, stepMs: 900000, tickMs: 8000, labelFmt: "HH:mm" },
      "1H": { count: 48, stepMs: 3600000, tickMs: 10000, labelFmt: "HH:00" },
      "4H": { count: 42, stepMs: 14400000, tickMs: 12000, labelFmt: "HH:00" },
      "1D": { count: 30, stepMs: 86400000, tickMs: 15000, labelFmt: "M/D" },
      "1W": { count: 24, stepMs: 604800000, tickMs: 20000, labelFmt: "M/D" },
    };
    const cfg = tfConfig[chartTf] || tfConfig["1H"];
    const volScale = { "1m": 0.3, "5m": 0.5, "15m": 0.7, "1H": 1, "4H": 1.5, "1D": 2.5, "1W": 4 }[chartTf] || 1;
    const state = chartState.current;

    // ── Generate initial history on mount or TF change ──
    if (state.tf !== chartTf) {
      const candles = [];
      let price = currentMid * 0.88;
      let momentum = 0;
      let seed = 314159 + cfg.count * 7;
      const sr = () => { seed = (seed * 16807) % 2147483647; return (seed & 0x7fffffff) / 0x7fffffff; };

      for (let i = 0; i < cfg.count; i++) {
        const open = price;
        const pull = (currentMid - price) / (cfg.count - i) * 1.2;
        if (sr() < 0.15) momentum = (sr() - 0.4) * currentMid * 0.03 * volScale;
        momentum *= 0.88;
        const noise = (sr() - 0.5) * currentMid * 0.018 * volScale;
        const change = pull + momentum + noise;
        const close = open + change;
        const wU = sr() * currentMid * 0.008 * volScale;
        const wD = sr() * currentMid * 0.008 * volScale;
        candles.push({
          open, close,
          high: Math.max(open, close) + wU,
          low: Math.min(open, close) - wD,
          vol: (sr() * 80 + 20) * (1 + Math.abs(change) / currentMid * 30),
        });
        price = close;
      }
      state.candles = candles;
      state.tf = chartTf;
      state.lastNewCandle = Date.now();
    }

    // ── Update the LAST candle in-place (no new random = no jitter) ──
    if (state.candles.length > 0) {
      const last = state.candles[state.candles.length - 1];
      last.close = currentMid;
      last.high = Math.max(last.high, currentMid);
      last.low = Math.min(last.low, currentMid);
    }

    // ── Close current candle & open a new one every tickMs ──
    const now = Date.now();
    if (now - state.lastNewCandle > cfg.tickMs) {
      state.candles.push({
        open: currentMid,
        close: currentMid,
        high: currentMid,
        low: currentMid,
        vol: 30 + Math.random() * 60,
      });
      // Keep array capped
      while (state.candles.length > cfg.count + 15) state.candles.shift();
      state.lastNewCandle = now;
    }

    // ── Draw ──
    const candles = state.candles;
    const allP = candles.flatMap(c => [c.high, c.low]);
    const minP = Math.min(...allP);
    const maxP = Math.max(...allP);
    const priceRange = maxP - minP || 0.001;

    ctx.clearRect(0, 0, rw, rh);
    const padR = 45, padB = 20, padT = 10, padL = 10;
    const barW = (rw - padL - padR) / candles.length;

    // Grid
    ctx.strokeStyle = t.chart.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = padT + (i / 4) * (rh - padT - padB);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(rw - padR, y); ctx.stroke();
      ctx.fillStyle = t.chart.label;
      ctx.font = "bold 9px 'SF Mono', monospace";
      ctx.textAlign = "left";
      const p = maxP - (i / 4) * priceRange;
      ctx.fillText(p.toFixed(4), rw - padR + 8, y + 3);
    }

    // Current price line
    const currentY = padT + ((maxP - currentMid) / priceRange) * (rh - padT - padB);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = t.glass.green;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, currentY); ctx.lineTo(rw - padR, currentY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = t.glass.green;
    ctx.font = "bold 9px 'SF Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillRect(rw - padR + 2, currentY - 7, 42, 14);
    ctx.fillStyle = t.glass.text;
    ctx.fillText(currentMid.toFixed(4), rw - padR + 4, currentY + 3);

    // DRAWINGS
    drawings.forEach(d => {
      ctx.strokeStyle = d.color || t.glass.accent;
      ctx.setLineDash(d.dash ? [5, 5] : []);
      ctx.lineWidth = 1.5;
      if (d.type === "line") {
        ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
      } else if (d.type === "rect") {
        ctx.fillStyle = d.color + "22";
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeRect(d.x, d.y, d.w, d.h);
      }
    });
    ctx.setLineDash([]);

    candles.forEach((c, i) => {
      const x = padL + i * barW;
      const isGreen = c.close >= c.open;
      const color = isGreen ? t.glass.green : t.glass.red;
      const yH = padT + ((maxP - c.high) / priceRange) * (rh - padT - padB);
      const yL = padT + ((maxP - c.low) / priceRange) * (rh - padT - padB);
      const yO = padT + ((maxP - c.open) / priceRange) * (rh - padT - padB);
      const yC = padT + ((maxP - c.close) / priceRange) * (rh - padT - padB);

      ctx.strokeStyle = color; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x + barW / 2, yH); ctx.lineTo(x + barW / 2, yL); ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, Math.min(yO, yC), Math.max(barW - 2, 1.5), Math.max(Math.abs(yO - yC), 0.5));
    });

    // Time labels
    ctx.fillStyle = t.chart.label;
    ctx.textAlign = "center";
    ctx.font = "bold 9px 'SF Pro Text', sans-serif";
    const labelCount = 5;
    for (let i = 0; i < labelCount; i++) {
      const x = padL + (i / (labelCount - 1)) * (rw - padL - padR);
      const t = new Date(now - (labelCount - 1 - i) * cfg.stepMs * (cfg.count / labelCount));
      let label;
      if (cfg.labelFmt === "mm" || cfg.labelFmt === "HH:mm") {
        label = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
      } else if (cfg.labelFmt === "HH:00") {
        label = `${t.getHours().toString().padStart(2, '0')}:00`;
      } else {
        label = `${t.getMonth() + 1}/${t.getDate()}`;
      }
      ctx.fillText(label, x, rh - 6);
    }

    // VOLUME BARS
    const maxVol = Math.max(...candles.map(c => c.vol || 50), 1);
    candles.forEach((c, i) => {
      const x = padL + i * barW;
      const vH = ((c.vol || 50) / maxVol) * 40;
      ctx.fillStyle = c.close >= c.open ? t.chart.volGreen : t.chart.volRed;
      ctx.fillRect(x + 1, rh - 35 - vH, barW - 2, vH);
    });
  }, [drawings, midPrice, liveTrades, chartTf, t]);


  const handleCanvasClick = (e) => {
    if (!activeTool) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "↗") {
      onAddDrawing({ type: "line", x1: x - 40, y1: y + 20, x2: x + 40, y2: y - 20, color: t.glass.accent });
    } else if (activeTool === "▭") {
      onAddDrawing({ type: "rect", x: x - 25, y: y - 15, w: 50, h: 30, color: t.glass.accent });
    } else if (activeTool === "⌘") {
      onAddDrawing({ type: "line", x1: 0, y1: y, x2: 400, y2: y, color: t.glass.accent, dash: true });
    } else if (activeTool === "T") {
      onAddDrawing({ type: "text", x: x, y: y, text: "OMEGA BREAKOUT", color: t.glass.text });
    } else if (activeTool === "📏") {
      onAddDrawing({ type: "line", x1: x, y1: y, x2: x, y2: y - 100, color: t.glass.text, dash: true, width: 0.5 });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{
        width: "100%", height: "100%", display: "block",
        cursor: activeTool ? "crosshair" : "default"
      }}
    />
  );
};



// ─── Casino Games (Slots, Poker, Blackjack, Roulette) ───
function CasinoGames({ game, onBack, balance, setBalance, theme, t }) {
  const panel = theme === "dark" ? { background: "rgba(25, 25, 25, 0.6)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24 } : { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 24 };
  const btn = (primary) => ({
    padding: "10px 20px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: primary ? t.glass.gold : (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
    color: primary ? "#000" : t.glass.text,
  });

  // ─── Slots ───
  const SLOT_SYMBOLS = ["🍒", "🍋", "7", "BAR", "💎"];
  const [slotsReels, setSlotsReels] = useState(["?", "?", "?"]);
  const [slotsSpinning, setSlotsSpinning] = useState(false);
  const [slotsResult, setSlotsResult] = useState(null);
  const [slotsBet, setSlotsBet] = useState(10);
  const spinSlots = () => {
    if (slotsSpinning || balance < slotsBet) return;
    setBalance((b) => b - slotsBet);
    setSlotsResult(null);
    setSlotsSpinning(true);
    let step = 0;
    const interval = setInterval(() => {
      setSlotsReels([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ]);
      step++;
      if (step > 8) {
        clearInterval(interval);
        const r1 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        const r2 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        const r3 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        setSlotsReels([r1, r2, r3]);
        setSlotsSpinning(false);
        const win = r1 === r2 && r2 === r3;
        const two = (r1 === r2 || r2 === r3 || r1 === r3);
        let payout = 0;
        if (win) payout = slotsBet * 10;
        else if (two) payout = Math.floor(slotsBet * 0.5);
        setBalance((b) => b + payout);
        setSlotsResult(win ? "Big win!" : two ? "Two match!" : "No match");
      }
    }, 120);
  };

  // ─── Poker (5-card draw, show hand rank) ───
  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const [pokerHand, setPokerHand] = useState([]);
  const [pokerBet, setPokerBet] = useState(10);
  const dealPoker = () => {
    if (balance < pokerBet) return;
    setBalance((b) => b - pokerBet);
    const deck = [];
    for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) deck.push({ suit: SUITS[s], rank: RANKS[r], value: r });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const hand = deck.slice(0, 5);
    setPokerHand(hand);
    const rank = getPokerRank(hand);
    let mult = 0;
    if (rank === "Royal Flush") mult = 100;
    else if (rank === "Straight Flush") mult = 50;
    else if (rank === "Four of a Kind") mult = 25;
    else if (rank === "Full House") mult = 9;
    else if (rank === "Flush") mult = 6;
    else if (rank === "Straight") mult = 4;
    else if (rank === "Three of a Kind") mult = 3;
    else if (rank === "Two Pair") mult = 2;
    else if (rank === "Pair") mult = 1;
    setBalance((b) => b + pokerBet * (1 + mult));
  };
  function getPokerRank(hand) {
    const values = hand.map((c) => c.value).sort((a, b) => a - b);
    const suits = hand.map((c) => c.suit);
    const count = (arr, v) => arr.filter((x) => x === v).length;
    const isFlush = suits.every((s) => s === suits[0]);
    const isStraight = (() => {
      const v = [...new Set(values)].sort((a, b) => a - b);
      if (v.length !== 5) return false;
      return v[4] - v[0] === 4 || (v[0] === 0 && v[1] === 9 && v[2] === 10 && v[3] === 11 && v[4] === 12);
    })();
    const freq = {};
    values.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
    const counts = Object.values(freq).sort((a, b) => b - a);
    if (isFlush && isStraight && values.includes(12) && values.includes(11)) return "Royal Flush";
    if (isFlush && isStraight) return "Straight Flush";
    if (counts[0] === 4) return "Four of a Kind";
    if (counts[0] === 3 && counts[1] === 2) return "Full House";
    if (isFlush) return "Flush";
    if (isStraight) return "Straight";
    if (counts[0] === 3) return "Three of a Kind";
    if (counts[0] === 2 && counts[1] === 2) return "Two Pair";
    if (counts[0] === 2) return "Pair";
    return "High Card";
  }

  // ─── Blackjack ───
  const [bjDealer, setBjDealer] = useState([]);
  const [bjPlayer, setBjPlayer] = useState([]);
  const [bjDealerHole, setBjDealerHole] = useState(null);
  const [bjBet, setBjBet] = useState(10);
  const [bjPhase, setBjPhase] = useState("bet"); // bet | play | done
  const [bjMessage, setBjMessage] = useState("");
  const deck = useMemo(() => {
    const d = [];
    const rankStr = (v) => (v === 1 ? "A" : v === 11 ? "J" : v === 12 ? "Q" : v === 13 ? "K" : String(v));
    for (let s = 0; s < 4; s++) for (let v = 1; v <= 13; v++) d.push({ suit: SUITS[s], value: Math.min(v, 10), soft: v === 1, rank: rankStr(v) });
    return d;
  }, []);
  const shuffle = (d) => {
    const out = [...d];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const score = (cards) => {
    let total = cards.reduce((s, c) => s + c.value, 0);
    const aces = cards.filter((c) => c.soft);
    aces.forEach(() => { if (total + 10 <= 21) total += 10; });
    return total;
  };
  const [bjDeck, setBjDeck] = useState([]);
  const startBlackjack = () => {
    if (balance < bjBet || bjPhase !== "bet") return;
    setBalance((b) => b - bjBet);
    const shuf = shuffle(deck);
    const p1 = [shuf.pop(), shuf.pop()];
    const d1 = [shuf.pop(), shuf.pop()];
    setBjDeck(shuf);
    setBjPlayer(p1);
    setBjDealer([d1[0]]);
    setBjDealerHole(d1[1]);
    setBjPhase("play");
    setBjMessage("");
    if (score(p1) === 21) endBlackjack(p1, [d1[0], d1[1]], shuf);
  };
  const endBlackjack = (playerCards, dealerCards, shuf) => {
    let d = [...dealerCards];
    let deckLeft = [...shuf];
    while (score(d) < 17) {
      d.push(deckLeft.pop());
    }
    setBjDealer([d[0], d[1], ...d.slice(2)]);
    setBjDealerHole(null);
    const ps = score(playerCards);
    const ds = score(d);
    let msg = "";
    let win = 0;
    if (ps > 21) { msg = "Bust!"; win = 0; }
    else if (ds > 21) { msg = "Dealer bust. You win!"; win = 2; }
    else if (ps > ds) { msg = "You win!"; win = 2; }
    else if (ps < ds) { msg = "Dealer wins."; win = 0; }
    else { msg = "Push."; win = 1; }
    setBjMessage(msg);
    setBalance((b) => b + bjBet * (win === 2 ? 2 : win));
    setBjPhase("done");
  };
  const hitBlackjack = () => {
    if (bjPhase !== "play" || bjDeck.length === 0) return;
    const card = bjDeck[bjDeck.length - 1];
    const newPlayer = [...bjPlayer, card];
    setBjPlayer(newPlayer);
    setBjDeck(bjDeck.slice(0, -1));
    if (score(newPlayer) >= 21) endBlackjack(newPlayer, [bjDealer[0], bjDealerHole], bjDeck.slice(0, -1));
  };
  const standBlackjack = () => {
    if (bjPhase !== "play") return;
    const dealerCards = [bjDealer[0], bjDealerHole];
    endBlackjack(bjPlayer, dealerCards, bjDeck);
  };

  // ─── Roulette ───
  const [rouletteBet, setRouletteBet] = useState(10);
  const [rouletteChoice, setRouletteChoice] = useState("red"); // red | black | number
  const [rouletteNumber, setRouletteNumber] = useState(17);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState(null);
  const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const spinRoulette = () => {
    if (rouletteSpinning || balance < rouletteBet) return;
    setBalance((b) => b - rouletteBet);
    setRouletteResult(null);
    setRouletteSpinning(true);
    setTimeout(() => {
      const num = Math.floor(Math.random() * 37); // 0-36
      const isRed = REDS.includes(num);
      let payout = 0;
      if (rouletteChoice === "red" && isRed) payout = rouletteBet * 2;
      else if (rouletteChoice === "black" && num > 0 && !isRed) payout = rouletteBet * 2;
      else if (rouletteChoice === "number" && num === rouletteNumber) payout = rouletteBet * 36;
      setBalance((b) => b + payout);
      setRouletteResult({ num, isRed, payout });
      setRouletteSpinning(false);
    }, 2000);
  };

  const backBar = (
    <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
      <button type="button" onClick={onBack} style={btn(false)}>← Back</button>
    </div>
  );

  if (game === "slots") {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {backBar}
        <div style={{ ...panel, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: t.glass.text }}>🎰 Slots</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20, fontSize: 32, minHeight: 56 }}>
            {slotsReels.map((s, i) => (
              <div key={i} style={{ width: 72, height: 56, background: theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.08)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid " + t.glass.border }}>{s}</div>
            ))}
          </div>
          {slotsResult && <div style={{ textAlign: "center", marginBottom: 12, fontWeight: 600, color: t.glass.gold }}>{slotsResult}</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: t.glass.textSecondary }}>Bet:</label>
            <input type="number" min={1} max={balance} value={slotsBet} onChange={(e) => setSlotsBet(Number(e.target.value) || 1)} style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "#fff", color: t.glass.text }} />
            <button type="button" onClick={spinSlots} disabled={slotsSpinning || balance < slotsBet} style={btn(true)}>{slotsSpinning ? "Spinning…" : "Spin"}</button>
          </div>
        </div>
      </div>
    );
  }

  if (game === "poker") {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {backBar}
        <div style={{ ...panel, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: t.glass.text }}>🃏 Poker (5-card)</div>
          {pokerHand.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {pokerHand.map((c, i) => (
                  <span key={i} style={{ padding: "8px 10px", background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 14 }}>{c.rank}{c.suit}</span>
                ))}
              </div>
              <div style={{ marginTop: 8, textAlign: "center", fontWeight: 600, color: t.glass.gold }}>{getPokerRank(pokerHand)}</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: t.glass.textSecondary }}>Bet:</label>
            <input type="number" min={1} max={balance} value={pokerBet} onChange={(e) => setPokerBet(Number(e.target.value) || 1)} style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "#fff", color: t.glass.text }} />
            <button type="button" onClick={dealPoker} disabled={balance < pokerBet} style={btn(true)}>Deal</button>
          </div>
        </div>
      </div>
    );
  }

  if (game === "blackjack") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {backBar}
        <div style={{ ...panel, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: t.glass.text }}>🂡 Blackjack</div>
          {bjPhase !== "bet" && (
            <>
              <div style={{ marginBottom: 8, fontSize: 11, color: t.glass.textTertiary }}>Dealer</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 20, minHeight: 44 }}>
                {bjDealer.map((c, i) => (
                  <span key={i} style={{ padding: "6px 10px", background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 13 }}>{c.rank}{c.suit}</span>
                ))}
                {bjDealerHole && <span style={{ padding: "6px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 13 }}>?</span>}
              </div>
              <div style={{ marginBottom: 8, fontSize: 11, color: t.glass.textTertiary }}>You ({score(bjPlayer)})</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {bjPlayer.map((c, i) => (
                  <span key={i} style={{ padding: "6px 10px", background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 13 }}>{c.rank}{c.suit}</span>
                ))}
              </div>
              {bjMessage && <div style={{ marginBottom: 12, fontWeight: 600, color: t.glass.gold }}>{bjMessage}</div>}
              {bjPhase === "play" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={hitBlackjack} style={btn(true)}>Hit</button>
                  <button type="button" onClick={standBlackjack} style={btn(false)}>Stand</button>
                </div>
              )}
              {bjPhase === "done" && (
                <button type="button" onClick={() => { setBjPhase("bet"); setBjDealer([]); setBjPlayer([]); setBjDealerHole(null); setBjMessage(""); }} style={btn(true)}>New hand</button>
              )}
            </>
          )}
          {bjPhase === "bet" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 12, color: t.glass.textSecondary }}>Bet:</label>
              <input type="number" min={1} max={balance} value={bjBet} onChange={(e) => setBjBet(Number(e.target.value) || 1)} style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "#fff", color: t.glass.text }} />
              <button type="button" onClick={startBlackjack} disabled={balance < bjBet} style={btn(true)}>Deal</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (game === "roulette") {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {backBar}
        <div style={{ ...panel, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: t.glass.text }}>🎡 Roulette</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: t.glass.textSecondary }}>Bet on:</label>
            <select value={rouletteChoice} onChange={(e) => setRouletteChoice(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "#fff", color: t.glass.text }}>
              <option value="red">Red (2x)</option>
              <option value="black">Black (2x)</option>
              <option value="number">Number (36x)</option>
            </select>
            {rouletteChoice === "number" && (
              <input type="number" min={0} max={36} value={rouletteNumber} onChange={(e) => setRouletteNumber(Number(e.target.value) || 0)} style={{ width: 60, padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "#fff", color: t.glass.text }} />
            )}
          </div>
          {rouletteResult && (
            <div style={{ marginBottom: 12, padding: 12, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 12 }}>
              <span style={{ color: t.glass.text }}>Landed: </span>
              <span style={{ fontWeight: 700, color: rouletteResult.isRed ? t.glass.red : t.glass.text }}>{rouletteResult.num}</span>
              {rouletteResult.payout > 0 && <span style={{ color: t.glass.green, marginLeft: 8 }}>+${rouletteResult.payout}</span>}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: t.glass.textSecondary }}>Bet:</label>
            <input type="number" min={1} max={balance} value={rouletteBet} onChange={(e) => setRouletteBet(Number(e.target.value) || 1)} style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "#fff", color: t.glass.text }} />
            <button type="button" onClick={spinRoulette} disabled={rouletteSpinning || balance < rouletteBet} style={btn(true)}>{rouletteSpinning ? "Spinning…" : "Spin"}</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main Component ───
const DEFAULT_ORDERBOOK = { asks: [], bids: [], midPrice: 0.0847 };

// 0x Swap pairs - EVM focus; same style as ETH (TradingView chart, News, EZ Peeze)
const ZEROX_PAIRS = [
  // ─── Ethereum (1) ───
  { id: "ETH/USDC", baseToken: "ETH", quoteToken: "USDC", chainId: 1, baseAddress: ETH_NATIVE, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:ETHUSDC" },
  { id: "ETH/USDT", baseToken: "ETH", quoteToken: "USDT", chainId: 1, baseAddress: ETH_NATIVE, quoteAddress: USDT_ETH, tradingViewSymbol: "BINANCE:ETHUSDT" },
  { id: "LINK/USDC", baseToken: "LINK", quoteToken: "USDC", chainId: 1, baseAddress: LINK_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:LINKUSDT" },
  { id: "UNI/USDC", baseToken: "UNI", quoteToken: "USDC", chainId: 1, baseAddress: UNI_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:UNIUSDT" },
  { id: "AAVE/USDC", baseToken: "AAVE", quoteToken: "USDC", chainId: 1, baseAddress: AAVE_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:AAVEUSDT" },
  { id: "CRV/USDC", baseToken: "CRV", quoteToken: "USDC", chainId: 1, baseAddress: CRV_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:CRVUSDT" },
  { id: "MATIC/USDC", baseToken: "MATIC", quoteToken: "USDC", chainId: 1, baseAddress: MATIC_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:MATICUSDT" },
  { id: "ARB/USDC", baseToken: "ARB", quoteToken: "USDC", chainId: 1, baseAddress: ARB_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:ARBUSDT" },
  { id: "LDO/USDC", baseToken: "LDO", quoteToken: "USDC", chainId: 1, baseAddress: LDO_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:LDOUSDT" },
  { id: "PEPE/USDC", baseToken: "PEPE", quoteToken: "USDC", chainId: 1, baseAddress: PEPE_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:PEPEUSDT" },
  { id: "SHIB/USDC", baseToken: "SHIB", quoteToken: "USDC", chainId: 1, baseAddress: SHIB_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:SHIBUSDT" },
  { id: "SAND/USDC", baseToken: "SAND", quoteToken: "USDC", chainId: 1, baseAddress: SAND_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:SANDUSDT" },
  { id: "MANA/USDC", baseToken: "MANA", quoteToken: "USDC", chainId: 1, baseAddress: MANA_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:MANAUSDT" },
  { id: "FLOKI/USDC", baseToken: "FLOKI", quoteToken: "USDC", chainId: 1, baseAddress: FLOKI_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:FLOKIUSDT" },
  { id: "BONK/USDC", baseToken: "BONK", quoteToken: "USDC", chainId: 1, baseAddress: BONK_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:BONKUSDT" },
  { id: "WIF/USDC", baseToken: "WIF", quoteToken: "USDC", chainId: 1, baseAddress: WIF_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:WIFUSDT" },
  { id: "FET/USDC", baseToken: "FET", quoteToken: "USDC", chainId: 1, baseAddress: FET_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:FETUSDT" },
  { id: "DOT/USDC", baseToken: "DOT", quoteToken: "USDC", chainId: 1, baseAddress: DOT_ETH, quoteAddress: USDC_ETH, tradingViewSymbol: "BINANCE:DOTUSDT" },
  // ─── Polygon (137) ───
  { id: "MATIC/USDC-POLY", baseToken: "MATIC", quoteToken: "USDC", chainId: 137, baseAddress: WMATIC_POLY, quoteAddress: USDC_POLY, tradingViewSymbol: "BINANCE:MATICUSDT" },
  { id: "ETH/USDC-POLY", baseToken: "ETH", quoteToken: "USDC", chainId: 137, baseAddress: WETH_POLY, quoteAddress: USDC_POLY, tradingViewSymbol: "BINANCE:ETHUSDC" },
  // ─── Arbitrum (42161) ───
  { id: "ETH/USDC-ARB", baseToken: "ETH", quoteToken: "USDC", chainId: 42161, baseAddress: ETH_NATIVE_ARB, quoteAddress: USDC_ARB, tradingViewSymbol: "BINANCE:ETHUSDC" },
  { id: "ARB/USDC-ARB", baseToken: "ARB", quoteToken: "USDC", chainId: 42161, baseAddress: ARB_ARB, quoteAddress: USDC_ARB, tradingViewSymbol: "BINANCE:ARBUSDT" },
  // ─── Optimism (10) ───
  { id: "ETH/USDC-OP", baseToken: "ETH", quoteToken: "USDC", chainId: 10, baseAddress: ETH_NATIVE_OP, quoteAddress: USDC_OP, tradingViewSymbol: "BINANCE:ETHUSDC" },
  { id: "OP/USDC-OP", baseToken: "OP", quoteToken: "USDC", chainId: 10, baseAddress: OP_OP, quoteAddress: USDC_OP, tradingViewSymbol: "BINANCE:OPUSDT", quoteDecimals: 6 },
  // ─── Base (8453) ───
  { id: "ETH/USDC-BASE", baseToken: "ETH", quoteToken: "USDC", chainId: 8453, baseAddress: ETH_NATIVE_BASE, quoteAddress: USDC_BASE, tradingViewSymbol: "BINANCE:ETHUSDC" },
  { id: "DEGEN/USDC-BASE", baseToken: "DEGEN", quoteToken: "USDC", chainId: 8453, baseAddress: DEGEN_BASE, quoteAddress: USDC_BASE, tradingViewSymbol: "BINANCE:DEGENUSDT" },
  // ─── BNB Chain (56) ─── (BSC USDT = 18 decimals)
  { id: "BNB/USDT-BSC", baseToken: "BNB", quoteToken: "USDT", chainId: 56, baseAddress: BNB_NATIVE, quoteAddress: USDT_BSC, tradingViewSymbol: "BINANCE:BNBUSDT", quoteDecimals: 18 },
  { id: "FLOKI/USDT-BSC", baseToken: "FLOKI", quoteToken: "USDT", chainId: 56, baseAddress: FLOKI_BSC, quoteAddress: USDT_BSC, tradingViewSymbol: "BINANCE:FLOKIUSDT", quoteDecimals: 18 },
  { id: "CAKE/USDT-BSC", baseToken: "CAKE", quoteToken: "USDT", chainId: 56, baseAddress: CAKE_BSC, quoteAddress: USDT_BSC, tradingViewSymbol: "BINANCE:CAKEUSDT", quoteDecimals: 18 },
  { id: "DOGE/USDT-BSC", baseToken: "DOGE", quoteToken: "USDT", chainId: 56, baseAddress: DOGE_BSC, quoteAddress: USDT_BSC, tradingViewSymbol: "BINANCE:DOGEUSDT", quoteDecimals: 18 },
  { id: "PEPE/USDT-BSC", baseToken: "PEPE", quoteToken: "USDT", chainId: 56, baseAddress: PEPE_BSC, quoteAddress: USDT_BSC, tradingViewSymbol: "BINANCE:PEPEUSDT", quoteDecimals: 18 },
  { id: "SHIB/USDT-BSC", baseToken: "SHIB", quoteToken: "USDT", chainId: 56, baseAddress: SHIB_BSC, quoteAddress: USDT_BSC, tradingViewSymbol: "BINANCE:SHIBUSDT", quoteDecimals: 18 },
  // ─── Avalanche (43114) ───
  { id: "AVAX/USDC-AVAX", baseToken: "AVAX", quoteToken: "USDC", chainId: 43114, baseAddress: WAVAX_AVAX, quoteAddress: USDC_AVAX, tradingViewSymbol: "BINANCE:AVAXUSDT" },
  { id: "ETH/USDC-AVAX", baseToken: "ETH", quoteToken: "USDC", chainId: 43114, baseAddress: WETH_AVAX, quoteAddress: USDC_AVAX, tradingViewSymbol: "BINANCE:ETHUSDC" },
];

// Non-EVM pairs: Chart + News + Technical + EZ Peeze only (no Swap)
const NON_EVM_PAIRS = [
  { id: "SOL/USDC", baseToken: "SOL", quoteToken: "USDC", tradingViewSymbol: "BINANCE:SOLUSDT", chainLabel: "Solana" },
  // Popular Solana tokens
  { id: "BONK/USDC-SOL", baseToken: "BONK", quoteToken: "USDC", tradingViewSymbol: "BINANCE:BONKUSDT", chainLabel: "Solana" },
  { id: "JUP/USDC-SOL", baseToken: "JUP", quoteToken: "USDC", tradingViewSymbol: "BINANCE:JUPUSDT", chainLabel: "Solana" },
  { id: "RAY/USDC-SOL", baseToken: "RAY", quoteToken: "USDC", tradingViewSymbol: "BINANCE:RAYUSDT", chainLabel: "Solana" },
  { id: "PENGU/USDC-SOL", baseToken: "PENGU", quoteToken: "USDC", tradingViewSymbol: "BINANCE:PENGUUSDT", chainLabel: "Solana" },
  { id: "TRUMP/USDC-SOL", baseToken: "TRUMP", quoteToken: "USDC", tradingViewSymbol: "BINANCE:TRUMPUSDT", chainLabel: "Solana" },
  { id: "PYTH/USDC-SOL", baseToken: "PYTH", quoteToken: "USDC", tradingViewSymbol: "BINANCE:PYTHUSDT", chainLabel: "Solana" },
  { id: "MET/USDC-SOL", baseToken: "MET", quoteToken: "USDC", tradingViewSymbol: "BINANCE:METUSDT", chainLabel: "Solana" },
  { id: "KMNO/USDC-SOL", baseToken: "KMNO", quoteToken: "USDC", tradingViewSymbol: "BINANCE:KMNOUSDT", chainLabel: "Solana" },
  { id: "BTC/USDC", baseToken: "BTC", quoteToken: "USDC", tradingViewSymbol: "BINANCE:BTCUSDT", chainLabel: "Bitcoin" },
  { id: "ADA/USDC", baseToken: "ADA", quoteToken: "USDC", tradingViewSymbol: "BINANCE:ADAUSDT", chainLabel: "Cardano" },
  { id: "XRP/USDC", baseToken: "XRP", quoteToken: "USDC", tradingViewSymbol: "BINANCE:XRPUSDT", chainLabel: "XRP Ledger" },
  { id: "DOGE/USDC", baseToken: "DOGE", quoteToken: "USDC", tradingViewSymbol: "BINANCE:DOGEUSDT", chainLabel: "Dogecoin" },
  { id: "SUI/USDC", baseToken: "SUI", quoteToken: "USDC", tradingViewSymbol: "BINANCE:SUIUSDT", chainLabel: "Sui" },
  { id: "TON/USDC", baseToken: "TON", quoteToken: "USDC", tradingViewSymbol: "BINANCE:TONUSDT", chainLabel: "Ton" },
  { id: "AVAX/USDC", baseToken: "AVAX", quoteToken: "USDC", tradingViewSymbol: "BINANCE:AVAXUSDT", chainLabel: "Avalanche" },
  { id: "NEAR/USDC", baseToken: "NEAR", quoteToken: "USDC", tradingViewSymbol: "BINANCE:NEARUSDT", chainLabel: "NEAR" },
  { id: "INJ/USDC", baseToken: "INJ", quoteToken: "USDC", tradingViewSymbol: "BINANCE:INJUSDT", chainLabel: "Injective" },
  { id: "TIA/USDC", baseToken: "TIA", quoteToken: "USDC", tradingViewSymbol: "BINANCE:TIAUSDT", chainLabel: "Celestia" },
  { id: "SEI/USDC", baseToken: "SEI", quoteToken: "USDC", tradingViewSymbol: "BINANCE:SEIUSDT", chainLabel: "Sei" },
  { id: "STX/USDC", baseToken: "STX", quoteToken: "USDC", tradingViewSymbol: "BINANCE:STXUSDT", chainLabel: "Stacks" },
  { id: "APT/USDC", baseToken: "APT", quoteToken: "USDC", tradingViewSymbol: "BINANCE:APTUSDT", chainLabel: "Aptos", coingeckoId: "aptos" },
];

export default function OmegaDEX() {
  const wallet = useWallet();
  const connected = wallet.connected;
  const [orderBook, setOrderBook] = useState(DEFAULT_ORDERBOOK);
  const [trades, setTrades] = useState([]);
  const [depthData, setDepthData] = useState({ bids: [], asks: [] });
  const [side, setSide] = useState("buy");
  const [orderType, setOrderType] = useState("limit");
  const [price, setPrice] = useState("0.0847");
  const [amount, setAmount] = useState("");
  const [selectedChain, setSelectedChain] = useState(1313161916);
  const [selectedToken, setSelectedToken] = useState("PRE");
  const [showChainModal, setShowChainModal] = useState(false);
  const [activeTab, setActiveTab] = useState("orderbook");
  const [zeroxLeftTab, setZeroxLeftTab] = useState("news");
  const [sliderValue, setSliderValue] = useState(0);
  const [openOrders, setOpenOrders] = useState([]);
  const [orderError, setOrderError] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [bottomTab, setBottomTab] = useState("orders");
  const [activeDrawingTool, setActiveDrawingTool] = useState(null);
  const [chartDrawings, setChartDrawings] = useState([]);
  const [chartTf, setChartTf] = useState("1H");
  const [formMode, setFormMode] = useState("pro");
  const [easyTab, setEasyTab] = useState("buy");
  const [nonEvmPriceFailed, setNonEvmPriceFailed] = useState(false);
  const [balances, setBalances] = useState({});
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [betAmount, setBetAmount] = useState("100");
  const [betTimeframe, setBetTimeframe] = useState(60); // seconds
  const [selectedPair, setSelectedPair] = useState("PRE/mUSDC");
  const [pairSearchOpen, setPairSearchOpen] = useState(false);
  const [pairSearchQuery, setPairSearchQuery] = useState("");
  const [favoritePairIds, setFavoritePairIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("omega-favorite-pairs") || "[]");
    } catch {
      return [];
    }
  });
  const [pairs, setPairs] = useState([]);
  const [showListTokenModal, setShowListTokenModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [profileTab, setProfileTab] = useState("overview");
  const [profileAllOrders, setProfileAllOrders] = useState([]);
  const [profileUserTrades, setProfileUserTrades] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [mmConfig, setMmConfig] = useState(null);
  const [mmConfigSaving, setMmConfigSaving] = useState(false);
  const [mmConfigError, setMmConfigError] = useState(null);
  const [mmConfigSaved, setMmConfigSaved] = useState(false);
  const [priceLowStr, setPriceLowStr] = useState("");
  const [priceMaxStr, setPriceMaxStr] = useState("");
  const [volumeStr, setVolumeStr] = useState("");
  const [eightBallAnswer, setEightBallAnswer] = useState(null);
  const [eightBallShaking, setEightBallShaking] = useState(false);
  const [showEightBallPopup, setShowEightBallPopup] = useState(false);
  const [page, setPage] = useState("dex"); // "dex" | "prediction" | "casino"
  const [casinoGame, setCasinoGame] = useState(null); // null | "slots" | "poker" | "blackjack" | "roulette"
  const [casinoBalance, setCasinoBalance] = useState(1000); // play money
  const [predictionMarkets, setPredictionMarkets] = useState([]);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionBetMarket, setPredictionBetMarket] = useState(null);
  const [predictionOrderLoading, setPredictionOrderLoading] = useState(false);
  const [predictionOrderError, setPredictionOrderError] = useState(null);
  const [predictionBetSide, setPredictionBetSide] = useState("yes");
  const [predictionBetPrice, setPredictionBetPrice] = useState("0.50");
  const [predictionBetSize, setPredictionBetSize] = useState("10");
  const [chartRange, setChartRange] = useState("1w");
  const [predictionSearch, setPredictionSearch] = useState("");
  const [predictionCategory, setPredictionCategory] = useState("all");
  const [predictionNetwork, setPredictionNetwork] = useState("polygon"); // Force Polygon
  const [selectedEvent, setSelectedEvent] = useState(null); // event detail view
  const [selectedEventLoading, setSelectedEventLoading] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState(null);
  const [solanaConnecting, setSolanaConnecting] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState({ yes: [], no: [] }); // { yes: [], no: [] }
  const PREDICTION_FEE_WALLET_POLY = "0xe4eB34392F232C75d0Ac3b518Ce5e265BCB35E8c";
  const PREDICTION_FEE_WALLET_SOL = "AnFJqk8JZqM7xrv9H6jaCv4ocFRJgR2Veh4c7Qjp53Y7";
  const PREDICTION_FEE_PCT = 0.0005; // 0.05%
  const profileButtonRef = useRef(null);
  const EIGHT_BALL_ANSWERS = ["Yes", "No", "Maybe", "Ape in Bitch", "Floor it"];
  const isAdmin = connected && wallet.address?.toLowerCase() === ADMIN_WALLET;

  const [windowWidth, setWindowWidth] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1024);
  const isMobile = windowWidth <= 900;
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { if (!connected) setShowProfileDropdown(false); }, [connected]);
  useEffect(() => {
    if (page !== "prediction") return;
    setPredictionLoading(true);
    fetchPredictionMarkets("", predictionNetwork)
      .then(setPredictionMarkets)
      .catch(() => setPredictionMarkets([]))
      .finally(() => setPredictionLoading(false));
  }, [page, predictionNetwork]);
  useEffect(() => {
    if (showWalletModal && wallet.address) {
      setProfileLoading(true);
      Promise.all([
        fetchUserOrders(wallet.address).catch(() => []),
        fetchUserTrades(wallet.address).catch(() => []),
      ]).then(([orders, trades]) => {
        setProfileAllOrders(Array.isArray(orders) ? orders : []);
        setProfileUserTrades(Array.isArray(trades) ? trades : []);
      }).finally(() => setProfileLoading(false));
    }
  }, [showWalletModal, wallet.address]);
  // Phantom Connect check
  useEffect(() => {
    if (window.solana && window.solana.isPhantom) {
      window.solana.connect({ onlyIfTrusted: true })
        .then(r => setSolanaAddress(r.publicKey.toString()))
        .catch(() => { });
    }
  }, []);

  // Real-time Activity Fetch
  useEffect(() => {
    if (!selectedEvent) return;

    // Auto-switch network removed (Always Polygon)

    const load = () => {
      const m = predictionBetMarket || selectedEvent;
      const params = new URLSearchParams({
        network: predictionNetwork,
        marketId: selectedEvent.id || selectedEvent.slug,
        yesTokenId: m.yesTokenId || (selectedEvent.markets?.[0]?.yesTokenId || ""),
        noTokenId: m.noTokenId || (selectedEvent.markets?.[0]?.noTokenId || ""),
        range: chartRange
      });
      fetch(`/api/prediction/activity?${params}`)
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) setRecentActivity(d);
        })
        .catch(e => console.warn(e));

      // Chart Fetch (with range: 1h, 6h, 1d, 1w, 1m, all)
      const chartUrl = `/api/prediction/chart?${params}`;
      fetch(chartUrl)
        .then(r => r.json())
        .then(d => {
          let yes = [], no = [];
          if (Array.isArray(d)) {
            yes = d;
          } else {
            yes = (d.yes || []).filter((p) => p != null && typeof p.value === "number");
            no = (d.no || []).filter((p) => p != null && typeof p.value === "number");
          }
          // Don't invent flat lines from current price — only show real history (or server-provided fallback)
          setChartData({ yes, no });
        })
        .catch(e => {
          console.warn("Chart client error", e);
          setChartData({ yes: [], no: [] });
        });
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [selectedEvent, predictionNetwork, predictionBetMarket, chartRange]);

  // Auto-select first outcome when event loads
  useEffect(() => {
    if (selectedEvent && selectedEvent.markets?.[0]) {
      const mk = selectedEvent.markets[0];
      setPredictionBetMarket({ ...selectedEvent, ...mk, title: selectedEvent.title + " — " + (mk.groupItemTitle || mk.question || "Outcome") });
      setPredictionBetSide("yes");
      setPredictionBetPrice(mk.yesPrice ? String(mk.yesPrice.toFixed(2)) : "0.50");
    } else {
      setPredictionBetMarket(null);
    }
  }, [selectedEvent]);

  const connectPhantom = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        setSolanaConnecting(true);
        const resp = await window.solana.connect();
        setSolanaAddress(resp.publicKey.toString());
      } catch (err) { console.warn(err); }
      finally { setSolanaConnecting(false); }
    } else {
      window.open("https://phantom.app/", "_blank");
    }
  };
  useEffect(() => {
    if (showAdminPanel && isAdmin) {
      fetchMMConfig().then((c) => {
        setMmConfig(c);
        setPriceLowStr(String(c?.priceMin ?? 0.04));
        setPriceMaxStr(String(c?.priceMax ?? 0.14));
        setVolumeStr(String(c?.orderSizeBase ?? 25000));
      }).catch(() => setMmConfig(null));
    }
  }, [showAdminPanel, isAdmin]);
  const [listTokenLoading, setListTokenLoading] = useState(false);
  const [listTokenError, setListTokenError] = useState(null);
  const [listForm, setListForm] = useState({ baseToken: "", quoteToken: "", baseAddress: "", quoteAddress: "", chain: "Omega", chainId: 1313161916, enableMM: true, baseLogo: null, quoteLogo: null });
  const [apiError, setApiError] = useState(null);
  const [activeBets, setActiveBets] = useState([]);
  const [historyBets, setHistoryBets] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [betPlacing, setBetPlacing] = useState(false);
  const [betError, setBetError] = useState(null);
  const [ezPezeConfig, setEzPezeConfig] = useState(null);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("omega-theme");
      return (saved === "dark" || saved === "light") ? saved : "dark";
    } catch { return "dark"; }
  });
  const t = THEMES[theme] || DARK_THEME;
  useEffect(() => {
    try { localStorage.setItem("omega-theme", theme); } catch (_) { }
  }, [theme]);
  const betTimerRef = useRef(null);
  const sessionStats = useRef({ high: 0, low: Infinity, startPrice: 0, initialized: false });
  useEffect(() => {
    sessionStats.current = { high: 0, low: Infinity, startPrice: 0, initialized: false };
  }, [selectedPair]);
  useEffect(() => {
    const mid = orderBook.midPrice ?? 0;
    const ss = sessionStats.current;
    if (mid > 0) {
      if (!ss.initialized) {
        ss.high = mid;
        ss.low = mid;
        ss.startPrice = mid;
        ss.initialized = true;
      } else {
        ss.high = Math.max(ss.high, mid);
        ss.low = Math.min(ss.low, mid);
      }
    }
    trades.forEach((t) => {
      if (t.price > 0) {
        ss.high = Math.max(ss.high, t.price);
        ss.low = Math.min(ss.low, t.price);
      }
    });
  }, [orderBook.midPrice, trades, selectedPair]);

  useEffect(() => {
    if (wallet.address && selectedChain === 1313161916 && window.ethereum) {
      // Find the real MetaMask provider (same logic as useWallet)
      const getProvider = () => {
        if (window.ethereum.providers?.length) {
          const mm = window.ethereum.providers.find(p => p.isMetaMask && !p.isPhantom);
          if (mm) return mm;
        }
        return window.ethereum;
      };

      const fetchBalances = async () => {
        try {
          const provider = new ethers.BrowserProvider(getProvider());
          const abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
          const newBalances = {};

          const chainAddrs = TOKEN_ADDRESSES[selectedChain];
          if (!chainAddrs) return;

          for (const symbol of TOKENS[selectedChain]) {
            const addr = chainAddrs[symbol];
            if (addr && addr !== "0x0000000000000000000000000000000000000000") {
              const contract = new ethers.Contract(addr, abi, provider);
              const bal = await contract.balanceOf(wallet.address);
              newBalances[symbol] = parseFloat(ethers.formatUnits(bal, 18)).toFixed(2);
            }
          }
          setBalances(newBalances);
        } catch (e) {
          console.error("Failed to fetch live balances:", e);
        }
      };
      fetchBalances();
      const interval = setInterval(fetchBalances, 10000);
      return () => clearInterval(interval);
    }
  }, [wallet.address, selectedChain]);

  useEffect(() => {
    fetchPairs()
      .then((p) => {
        const arr = Array.isArray(p) ? p : [];
        setPairs(arr);
        setSelectedPair((prev) => (arr.some((x) => x.id === prev) ? prev : (arr[0]?.id || "PRE/mUSDC")));
      })
      .catch(() => {
        setPairs([{ id: "PRE/mUSDC", baseToken: "PRE", quoteToken: "mUSDC" }]);
      });
  }, []);

  const zeroxPair = useMemo(() => ZEROX_PAIRS.find((p) => p.id === selectedPair), [selectedPair]);
  const nonEvmPair = useMemo(() => NON_EVM_PAIRS.find((p) => p.id === selectedPair), [selectedPair]);
  const chartPair = zeroxPair || nonEvmPair;
  const isZeroXPair = !!chartPair;
  const isEvmPair = !!zeroxPair;
  const allPairs = useMemo(() => [...ZEROX_PAIRS, ...NON_EVM_PAIRS, ...pairs], [pairs]);
  const pairSearchLower = (pairSearchQuery || "").trim().toLowerCase();
  const filteredPairs = useMemo(() => {
    const list = allPairs.length ? allPairs : [{ id: "PRE/mUSDC", baseToken: "PRE", quoteToken: "mUSDC" }];
    const filtered = !pairSearchLower
      ? [...list]
      : list.filter((p) => {
          const id = (p.id || "").toLowerCase();
          const base = (p.baseToken || "").toLowerCase();
          const quote = (p.quoteToken || "").toLowerCase();
          const combined = `${base} ${quote} ${base}/${quote}`;
          return id.includes(pairSearchLower) || base.includes(pairSearchLower) || quote.includes(pairSearchLower) || combined.includes(pairSearchLower);
        });
    // Favorites first, then alphabetical by base/quote (e.g. "AAVE/USDC" before "ARB/USDC")
    const favSet = new Set(favoritePairIds);
    const sortKey = (p) => `${(p.baseToken || "").toLowerCase()}/${(p.quoteToken || "").toLowerCase()}`;
    return [...filtered].sort((a, b) => {
      const aFav = favSet.has(a.id);
      const bFav = favSet.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return sortKey(a).localeCompare(sortKey(b));
    });
  }, [allPairs, pairSearchLower, favoritePairIds]);

  const toggleFavoritePair = useCallback((pairId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setFavoritePairIds((prev) => {
      const next = prev.includes(pairId) ? prev.filter((id) => id !== pairId) : [...prev, pairId];
      try {
        localStorage.setItem("omega-favorite-pairs", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
  const loadData = useCallback(async () => {
    try {
      setApiError(null);
      if (zeroxPair) {
        const taker = wallet.address || "0x0000000000000000000000000000000000000000";
        const sellAmt = "1000000000000000000";
        const p = await getPrice({
          chainId: zeroxPair.chainId,
          sellToken: zeroxPair.baseAddress,
          buyToken: zeroxPair.quoteAddress,
          sellAmount: sellAmt,
          taker,
        });
        const quoteDecimals = zeroxPair.quoteDecimals ?? 6;
        const mid = parseFloat(ethers.formatUnits(p.buyAmount || "0", quoteDecimals));
        const spread = mid * 0.0005;
        setOrderBook({
          midPrice: mid,
          asks: [{ price: mid + spread, amount: 100, total: 100 * (mid + spread) }],
          bids: [{ price: mid - spread, amount: 100, total: 100 * (mid - spread) }],
        });
        setTrades([]);
        setDepthData({
          bids: [{ price: mid - spread, amount: 100, cumulative: 100 }],
          asks: [{ price: mid + spread, amount: 100, cumulative: 100 }],
        });
      } else if (nonEvmPair) {
        try {
          const url = API_BASE ? `${API_BASE}/api/non-evm-price?pairId=${encodeURIComponent(nonEvmPair.id)}` : `/api/non-evm-price?pairId=${encodeURIComponent(nonEvmPair.id)}`;
          const r = await fetch(url);
          const data = r.ok ? await r.json().catch(() => ({})) : {};
          const priceNum = data?.price != null ? Number(data.price) : NaN;
          const valid = Number.isFinite(priceNum) && priceNum >= 0;
          setNonEvmPriceFailed(!valid);
          if (valid) {
            const mid = priceNum;
            const spread = mid * 0.0005;
            setOrderBook({
              midPrice: mid,
              asks: [{ price: mid + spread, amount: 100, total: 100 * (mid + spread) }],
              bids: [{ price: mid - spread, amount: 100, total: 100 * (mid - spread) }],
            });
            setTrades([]);
            setDepthData({
              bids: [{ price: mid - spread, amount: 100, cumulative: 100 }],
              asks: [{ price: mid + spread, amount: 100, cumulative: 100 }],
            });
          }
        } catch (_) {
          setNonEvmPriceFailed(true);
        }
      } else {
        const [ob, tr, dp] = await Promise.all([
          fetchOrderBook(selectedPair),
          fetchTrades(50, selectedPair),
          fetchDepth(selectedPair),
        ]);
        setOrderBook(ob || DEFAULT_ORDERBOOK);
        setTrades(Array.isArray(tr) ? tr.map((t) => ({ ...t, time: new Date(t.timestamp || t.time) })) : []);
        setDepthData(dp || { bids: [], asks: [] });
      }
    } catch (e) {
      setApiError(e.message || "API unavailable");
      if (zeroxPair) {
        setOrderBook({ asks: [], bids: [], midPrice: 0 });
        setDepthData({ bids: [], asks: [] });
      } else if (nonEvmPair) {
        setNonEvmPriceFailed(true);
      }
    }
  }, [selectedPair, zeroxPair, nonEvmPair, wallet.address]);

  // Debounced version to avoid flooding API on rapid WS messages
  const loadDataTimerRef = useRef(null);
  const debouncedLoadData = useCallback(() => {
    if (loadDataTimerRef.current) clearTimeout(loadDataTimerRef.current);
    loadDataTimerRef.current = setTimeout(() => {
      loadData();
      loadDataTimerRef.current = null;
    }, 150);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedPair]);

  useEffect(() => {
    if (!nonEvmPair) return;
    const t = setInterval(() => loadData(), 15000);
    return () => clearInterval(t);
  }, [nonEvmPair, loadData]);

  useEffect(() => {
    if (!nonEvmPair) setNonEvmPriceFailed(false);
  }, [nonEvmPair]);

  useEffect(() => {
    if (isZeroXPair) {
      setOrderType("market");
      setFormMode("ezpeze"); // Default to EZ Peeze for all listed tokens (EVM + non-EVM)
    } else {
      setFormMode("pro"); // PRE / legacy pairs: default to Pro
    }
  }, [isZeroXPair]);

  // Auto-fill price based on side: buy → best ask, sell → best bid
  useEffect(() => {
    if (priceManuallyEdited) return;
    if (side === "buy") {
      const bestAsk = orderBook.asks?.[0]?.price;
      if (bestAsk) setPrice(bestAsk.toFixed(4));
    } else {
      const bestBid = orderBook.bids?.[0]?.price;
      if (bestBid) setPrice(bestBid.toFixed(4));
    }
  }, [side, orderBook, priceManuallyEdited]);

  useEffect(() => {
    const intervalMs = isZeroXPair ? 10000 : 2000;
    const interval = setInterval(loadData, intervalMs);
    const ws = !isZeroXPair ? createOrderBookSocket((msg) => {
      if (msg.type === "orderbook" || msg.type === "trades") {
        if (!msg.pair || msg.pair === selectedPair) debouncedLoadData();
      }
      if (msg.type === "order" && wallet.address && msg.order?.address?.toLowerCase() === wallet.address.toLowerCase()) {
        fetchUserOrders(wallet.address, selectedPair).then(setOpenOrders).catch(() => { });
      }
      if (msg.type === "cancel" && wallet.address) {
        setOpenOrders((prev) => prev.filter((o) => o.id !== msg.orderId));
      }
      if (msg.type === "ezpeze" && msg.bet && wallet.address && msg.bet.address?.toLowerCase() === wallet.address.toLowerCase()) {
        setActiveBets((prev) => {
          const idx = prev.findIndex((b) => b.id === msg.bet.id);
          if (idx >= 0) return prev.map((b) => (b.id === msg.bet.id ? { ...b, ...msg.bet } : b));
          return [...prev, msg.bet];
        });
      }
    }) : { close: () => { } };

    if (wallet.address && !isZeroXPair) {
      fetchUserOrders(wallet.address, selectedPair).then(setOpenOrders).catch(() => { });
    } else if (isZeroXPair) {
      setOpenOrders([]);
    }

    return () => {
      clearInterval(interval);
      if (loadDataTimerRef.current) clearTimeout(loadDataTimerRef.current);
      ws.close();
    };
  }, [loadData, debouncedLoadData, wallet.address, selectedPair, isZeroXPair]);

  const currentPairInfo = useMemo(() => allPairs.find((p) => p.id === selectedPair) || { baseToken: "PRE", quoteToken: "mUSDC" }, [allPairs, selectedPair]);
  const maxAsk = useMemo(() => Math.max(1, ...(orderBook.asks || []).map((a) => a.total || 0)), [orderBook]);
  const maxBid = useMemo(() => Math.max(1, ...(orderBook.bids || []).map((b) => b.total || 0)), [orderBook]);
  const total = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return "0.00";
    const amt = parseFloat(amount);
    const pr = isZeroXPair ? orderBook.midPrice : parseFloat(price);
    return (amt * (pr || 0)).toFixed(4);
  }, [price, amount, orderBook.midPrice, isZeroXPair]);

  const handlePlaceOrder = async () => {
    setOrderError(null);

    if (!connected || !wallet.address) {
      wallet.connect();
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setOrderError("Please enter an amount");
      return;
    }
    if (!isZeroXPair && orderType === "limit" && (!price || parseFloat(price) <= 0)) {
      setOrderError("Please enter a valid price");
      return;
    }

    if (zeroxPair) {
      setOrderLoading(true);
      try {
        const prov = wallet.getProvider?.();
        if (!prov) throw new Error("Connect wallet first");
        const provider = new ethers.BrowserProvider(prov);
        const signer = await provider.getSigner();
        const chainIdHex = await prov.request?.({ method: "eth_chainId" });
        const chainId = parseInt(chainIdHex || "0", 16);
        if (chainId !== zeroxPair.chainId) {
          try {
            await prov.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x" + zeroxPair.chainId.toString(16) }],
            });
          } catch (swErr) {
            if (zeroxPair.chainId === 1) {
              await prov.request({
                method: "wallet_addEthereumChain",
                params: [{ chainId: "0x1", chainName: "Ethereum", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://eth.llamarpc.com"] }],
              });
            }
            throw new Error("Please switch to Ethereum network");
          }
        }
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) throw new Error("Invalid amount");
        let quote;
        if (side === "sell") {
          const sellAmountWei = ethers.parseUnits(amt.toFixed(18), 18);
          quote = await getQuote({
            chainId: zeroxPair.chainId,
            sellToken: zeroxPair.baseAddress,
            buyToken: zeroxPair.quoteAddress,
            sellAmount: sellAmountWei.toString(),
            taker: wallet.address,
          });
        } else {
          const buyAmountWei = ethers.parseUnits(amt.toFixed(18), 18);
          quote = await getQuoteForBuyAmount({
            chainId: zeroxPair.chainId,
            sellToken: zeroxPair.quoteAddress,
            buyToken: zeroxPair.baseAddress,
            buyAmount: buyAmountWei.toString(),
            taker: wallet.address,
          });
        }
        if (!quote?.transaction) throw new Error("No quote returned");
        const tx = await signer.sendTransaction({
          to: quote.transaction.to,
          data: quote.transaction.data,
          value: quote.transaction.value ? BigInt(quote.transaction.value) : 0n,
          gasLimit: quote.transaction.gas ? BigInt(quote.transaction.gas) : undefined,
        });
        await tx.wait();
        setAmount("");
        loadData();
      } catch (e) {
        console.error("[0x] Swap error:", e);
        setOrderError(e.message || "Swap failed");
      } finally {
        setOrderLoading(false);
      }
      return;
    }

    setOrderLoading(true);
    try {
      const pr = orderType === "market" ? orderBook.midPrice : parseFloat(price);
      const amt = parseFloat(amount);
      if (isNaN(pr) || isNaN(amt)) {
        setOrderError("Invalid price or amount");
        setOrderLoading(false);
        return;
      }
      console.log(`[DEX] Placing ${side} order: ${amt} PRE @ ${pr}`);
      const result = await apiPlaceOrder({
        address: wallet.address,
        side,
        price: pr,
        amount: amt,
        token: currentPairInfo.quoteToken || selectedToken,
        chain: CHAINS.find((c) => c.id === selectedChain)?.name,
        pair: selectedPair,
      });
      console.log("[DEX] Order result:", result);
      if (result.order) {
        setOpenOrders((prev) => [result.order, ...prev]);
      }
      setAmount("");
      setPriceManuallyEdited(false);
      loadData();
    } catch (e) {
      console.error("[DEX] Order placement error:", e);
      setOrderError(e.message || "Failed to place order");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await apiCancelOrder(orderId);
      setOpenOrders((prev) => prev.filter((o) => o.id !== orderId));
      loadData();
    } catch (e) {
      setOrderError(e.message || "Failed to cancel");
    }
  };

  // EZ PEZE: fetch config when in EZ PEZE mode
  useEffect(() => {
    if (formMode === "ezpeze") {
      fetchEzPezeConfig().then(setEzPezeConfig).catch(() => setEzPezeConfig(null));
    }
  }, [formMode]);

  // History tab: load EZ PEZE bets when History is selected, refresh periodically
  useEffect(() => {
    if (bottomTab !== "history" || !wallet.address) return;
    const load = () => {
      setHistoryLoading(true);
      fetchEzPezeBets(wallet.address)
        .then((bets) => setHistoryBets(Array.isArray(bets) ? bets : []))
        .catch(() => setHistoryBets([]))
        .finally(() => setHistoryLoading(false));
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [bottomTab, wallet.address]);

  // EZ PEZE: load user bets when wallet connected
  useEffect(() => {
    if (formMode === "ezpeze" && wallet.address) {
      fetchEzPezeBets(wallet.address).then((bets) => setActiveBets(bets || [])).catch(() => setActiveBets([]));
    } else if (!wallet.address) {
      setActiveBets([]);
    }
  }, [formMode, wallet.address]);

  // EZ PEZE: place a REAL prediction bet (transfer PRE to escrow, then POST to API)
  const placeBet = async (direction) => {
    setBetError(null);
    if (!wallet.address || !connected) {
      wallet.connect();
      return;
    }
    const amt = parseFloat(betAmount);
    if (!amt || amt <= 0) {
      setBetError("Enter a valid bet amount");
      return;
    }
    const bal = parseFloat(balances["PRE"] || "0");
    if (bal < amt) {
      setBetError(`Insufficient PRE. Balance: ${bal.toFixed(2)}`);
      return;
    }
    if (!ezPezeConfig?.escrowAddress) {
      setBetError("EZ PEZE not configured. Escrow not set on server.");
      return;
    }
    setBetPlacing(true);
    try {
      const getProvider = () => {
        if (window.ethereum?.providers?.length) {
          const mm = window.ethereum.providers.find((p) => p.isMetaMask && !p.isPhantom);
          if (mm) return mm;
        }
        return window.ethereum;
      };
      const provider = new ethers.BrowserProvider(getProvider());
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== 1313161916) {
        setBetError("Switch to Omega Network to stake PRE & earn Omega");
        setBetPlacing(false);
        return;
      }
      const signer = await provider.getSigner();
      const preAbi = ["function transfer(address to, uint256 amount) returns (bool)"];
      const preAddr = ezPezeConfig.preAddress || "0xB8149d86Fb75C9A7e3797d6923c12e5076b6AEd9";
      const pre = new ethers.Contract(preAddr, preAbi, signer);
      const wei = ethers.parseUnits(String(amt), 18);
      const tx = await pre.transfer(ezPezeConfig.escrowAddress, wei);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Transfer failed");
      const entryPrice = orderBook.midPrice || 0.0847;
      const { bet } = await placeEzPezeBet({
        address: wallet.address,
        amount: amt,
        direction,
        timeframe: betTimeframe,
        pair: selectedPair,
        txHash: receipt.hash,
        entryPrice: isZeroXPair ? entryPrice : undefined,
      });
      setActiveBets((prev) => {
        const exists = prev.some((b) => b.id === bet.id);
        if (exists) return prev.map((b) => (b.id === bet.id ? { ...b, ...bet, remaining: betTimeframe } : b));
        return [...prev, { ...bet, remaining: betTimeframe }];
      });
    } catch (e) {
      setBetError(e.message || "Failed to place bet");
    } finally {
      setBetPlacing(false);
    }
  };

  // Tick: compute remaining time for active bets (server resolves & pays out)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBets((prev) =>
        prev
          .map((bet) => {
            if (bet.status !== "active") {
              if (bet.resolvedAt && Date.now() - bet.resolvedAt > 8000) return null;
              return bet;
            }
            const expiresAt = bet.placedAt + bet.timeframe * 1000;
            const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            return { ...bet, remaining };
          })
          .filter(Boolean)
      );
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, t }}>
      <LiquidGlassSVG />
      <div style={{
        minHeight: "100vh",
        background: t.page.background,
        fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
        color: t.glass.text, overflow: "auto",
      }}>

        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{
            position: "absolute", top: theme === "dark" ? "20%" : "15%", left: theme === "dark" ? "10%" : "5%", width: "50vw", height: "50vw",
            ...t.orbs[0], animation: "float 20s infinite alternate",
          }} />
          <div style={{
            position: "absolute", bottom: theme === "dark" ? "10%" : "5%", right: theme === "dark" ? "10%" : "5%", width: "40vw", height: "40vw",
            ...t.orbs[1], animation: "float 25s infinite alternate-reverse",
          }} />
        </div>




        <div style={{ position: "relative", zIndex: 1 }}>
          {/* ═══ TOP NAV ═══ */}
          {/* ═══ TOP NAV ═══ */}
          <header className="olympus-header" style={{
            ...t.panel, margin: "12px 12px 0",
            padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", minHeight: 80,
            boxShadow: t.headerShadow,
          }}>
            <div className="header-spacer" />
            {/* Center Logo (desktop) */}
            <div className="logo-wrap" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
              <OlympusLogo theme={theme} />
            </div>

            {/* Wallet / theme - right side */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", minHeight: 60 }}>
              {/* Theme toggle (when not connected) + Wallet with dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", position: "relative" }}>
                {!connected && (
                  <button
                    onClick={() => setTheme((s) => (s === "dark" ? "light" : "dark"))}
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    style={{
                      width: 40, height: 40, borderRadius: 12, border: "1px solid " + t.glass.border,
                      background: t.glass.bg, color: t.glass.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, transition: "all 0.2s",
                    }}
                  >
                    {theme === "dark" ? "☀️" : "🌙"}
                  </button>
                )}
                {wallet.error && <span style={{ fontSize: 11, color: t.glass.red }}>{wallet.error}</span>}
                {wallet.error && (
                  <div style={{ position: "absolute", top: 70, right: 20, zIndex: 1000, background: t.glass.red, color: "#000", padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                    {wallet.error}
                  </div>
                )}
                <div style={{ position: "relative" }}>
                  <button
                    ref={profileButtonRef}
                    className="wallet-btn"
                    onClick={connected ? () => setShowProfileDropdown(!showProfileDropdown) : wallet.connect}
                    style={{
                      padding: "10px 22px", borderRadius: "100px", fontSize: 13, fontWeight: 700,
                      background: connected
                        ? (theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(212,175,55,0.12)")
                        : (theme === "dark" ? "#fff" : "linear-gradient(135deg, #D4AF37 0%, #F5B800 100%)"),
                      color: connected ? t.glass.text : (theme === "dark" ? "#000" : "#1a1a1a"),
                      border: connected ? ("1px solid " + t.glass.border) : "none",
                      cursor: "pointer", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      boxShadow: connected ? "none" : (theme === "dark" ? "0 10px 25px rgba(255,255,255,0.2)" : "0 4px 16px rgba(212,175,55,0.25)"),
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {wallet.connecting ? "Connecting..." : connected ? wallet.shortAddress : "Connect Wallet"}
                    {connected && <span style={{ fontSize: 10, opacity: 0.8 }}>▼</span>}
                  </button>
                  {connected && showProfileDropdown && createPortal(
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setShowProfileDropdown(false)} />
                      <div className="profile-dropdown" style={{
                        position: "fixed",
                        top: (profileButtonRef.current?.getBoundingClientRect?.()?.bottom ?? 70) + 8,
                        right: 16,
                        zIndex: 9999,
                        ...t.panel, padding: 16, minWidth: 220,
                        boxShadow: theme === "dark" ? "0 20px 60px rgba(0,0,0,0.5)" : "0 12px 40px rgba(212,175,55,0.15)",
                      }}>
                        {/* Theme */}
                        <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 6, letterSpacing: "0.04em" }}>Theme</div>
                        <button onClick={() => { setTheme("dark"); }} style={{ display: "block", width: "100%", padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: theme === "dark" ? t.glass.bgActive : "transparent", border: "1px solid " + t.glass.border, color: t.glass.text, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>Dark mode</button>
                        <button onClick={() => { setTheme("light"); }} style={{ display: "block", width: "100%", padding: "8px 12px", marginBottom: 12, borderRadius: 8, background: theme === "light" ? t.glass.bgActive : "transparent", border: "1px solid " + t.glass.border, color: t.glass.text, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>Light mode</button>
                        {/* Profile */}
                        <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 6, letterSpacing: "0.04em" }}>Profile</div>
                        <button onClick={() => { setProfileTab("overview"); setShowWalletModal(true); setShowProfileDropdown(false); }} style={{ display: "block", width: "100%", padding: "8px 12px", marginBottom: 12, borderRadius: 8, background: "transparent", border: "1px solid " + t.glass.border, color: t.glass.text, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>View Profile</button>
                        {/* Admin Panel - only when admin wallet connected */}
                        {isAdmin && (
                          <>
                            <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 6, letterSpacing: "0.04em" }}>Admin</div>
                            <button onClick={() => { setShowAdminPanel(true); setShowProfileDropdown(false); }} style={{ display: "block", width: "100%", padding: "8px 12px", marginBottom: 6, borderRadius: 8, background: theme === "dark" ? "rgba(191,90,242,0.15)" : "rgba(212,175,55,0.15)", border: "1px solid " + (theme === "dark" ? "rgba(191,90,242,0.4)" : "rgba(212,175,55,0.4)"), color: t.glass.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>MM Bot Control</button>
                            <button onClick={() => { setShowListTokenModal(true); setShowProfileDropdown(false); }} style={{ display: "block", width: "100%", padding: "8px 12px", marginBottom: 6, borderRadius: 8, background: "transparent", border: "1px solid " + t.glass.border, color: t.glass.text, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>+ List Token Pair</button>
                            {pairs.find((p) => p.id === selectedPair) && (
                              <button
                                onClick={async () => { try { const p = pairs.find((x) => x.id === selectedPair); await (p?.mmEnabled ? disableMM(selectedPair) : enableMM(selectedPair)); setPairs(await fetchPairs()); } catch (e) { setOrderError(e.message); } setShowProfileDropdown(false); }}
                                style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, background: (pairs.find((p) => p.id === selectedPair)?.mmEnabled) ? "rgba(22,163,74,0.12)" : "rgba(212,175,55,0.06)", border: "1px solid " + ((pairs.find((p) => p.id === selectedPair)?.mmEnabled) ? "rgba(22,163,74,0.4)" : "rgba(212,175,55,0.2)"), color: (pairs.find((p) => p.id === selectedPair)?.mmEnabled) ? t.glass.green : t.glass.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                              >
                                {(pairs.find((p) => p.id === selectedPair)?.mmEnabled) ? "MM On: " + selectedPair : "Enable MM: " + selectedPair}
                              </button>
                            )}
                          </>
                        )}
                        <button onClick={() => { wallet.disconnect(); setShowProfileDropdown(false); }} style={{ display: "block", width: "100%", padding: "8px 12px", marginTop: 12, borderRadius: 8, background: "transparent", border: "1px solid " + t.glass.red, color: t.glass.red, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>Disconnect</button>
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              </div>
            </div>
          </header>


          {/* List Token Modal */}
          {showListTokenModal && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} onClick={() => { setShowListTokenModal(false); setListTokenError(null); }}>
              <div className="olympus-modal" style={{ ...t.panel, padding: 24, width: 400 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 20, letterSpacing: "-0.02em" }}>List New Token Pair</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Base Token Symbol</div>
                    <input value={listForm.baseToken} onChange={(e) => setListForm((f) => ({ ...f, baseToken: e.target.value }))} placeholder="e.g. PRE" style={{ ...t.panelInner, width: "100%", padding: "10px 12px", color: t.glass.text, border: "1px solid " + t.glass.border }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Base Token Logo</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {listForm.baseLogo && <img src={listForm.baseLogo} alt="" style={{ width: 40, height: 40, borderRadius: 8 }} />}
                      <label style={{ flex: 1, padding: "8px 12px", borderRadius: 12, background: "rgba(255,250,240,0.8)", border: "1px solid " + t.glass.border, fontSize: 11, color: t.glass.textSecondary, cursor: "pointer" }}>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setListForm((prev) => ({ ...prev, baseLogo: r.result })); r.readAsDataURL(f); } }} />
                        {listForm.baseLogo ? "Change logo" : "Upload logo"}
                      </label>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Base Token Contract Address</div>
                    <input value={listForm.baseAddress} onChange={(e) => setListForm((f) => ({ ...f, baseAddress: e.target.value }))} placeholder="0x..." style={{ ...t.panelInner, width: "100%", padding: "10px 12px", color: t.glass.text, border: "1px solid " + t.glass.border }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Quote/Pair Token Symbol</div>
                    <input value={listForm.quoteToken} onChange={(e) => setListForm((f) => ({ ...f, quoteToken: e.target.value }))} placeholder="e.g. mUSDC" style={{ ...t.panelInner, width: "100%", padding: "10px 12px", color: t.glass.text, border: "1px solid " + t.glass.border }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Quote Token Logo</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {listForm.quoteLogo && <img src={listForm.quoteLogo} alt="" style={{ width: 40, height: 40, borderRadius: 8 }} />}
                      <label style={{ flex: 1, padding: "8px 12px", borderRadius: 12, background: "rgba(255,250,240,0.8)", border: "1px solid " + t.glass.border, fontSize: 11, color: t.glass.textSecondary, cursor: "pointer" }}>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setListForm((prev) => ({ ...prev, quoteLogo: r.result })); r.readAsDataURL(f); } }} />
                        {listForm.quoteLogo ? "Change logo" : "Upload logo"}
                      </label>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Quote Token Contract Address</div>
                    <input value={listForm.quoteAddress} onChange={(e) => setListForm((f) => ({ ...f, quoteAddress: e.target.value }))} placeholder="0x..." style={{ ...t.panelInner, width: "100%", padding: "10px 12px", color: t.glass.text, border: "1px solid " + t.glass.border }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Chain</div>
                    <select value={listForm.chain} onChange={(e) => setListForm((f) => ({ ...f, chain: e.target.value, chainId: CHAINS.find((c) => c.name === e.target.value)?.id ?? 1313161916 }))} style={{ ...t.panelInner, width: "100%", padding: "10px 12px", color: t.glass.text, border: "1px solid " + t.glass.border }}>
                      {CHAINS.map((c) => <option key={c.id} value={c.name} style={{ background: "#FFFEF9" }}>{c.name}</option>)}
                    </select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={listForm.enableMM} onChange={(e) => setListForm((f) => ({ ...f, enableMM: e.target.checked }))} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 12, color: t.glass.text }}>Enable MM bot for this pair</span>
                  </label>
                  {listTokenError && <div style={{ fontSize: 11, color: t.glass.red }}>{listTokenError}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => { setShowListTokenModal(false); setListTokenError(null); }} style={{ flex: 1, padding: "10px", borderRadius: 12, background: "rgba(212,175,55,0.08)", border: "1px solid " + t.glass.border, color: t.glass.textSecondary, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    <button
                      disabled={listTokenLoading || !listForm.baseToken || !listForm.quoteToken || !listForm.baseAddress || !listForm.quoteAddress}
                      onClick={async () => {
                        setListTokenError(null);
                        setListTokenLoading(true);
                        try {
                          await listToken({
                            baseToken: listForm.baseToken,
                            quoteToken: listForm.quoteToken,
                            baseAddress: listForm.baseAddress,
                            quoteAddress: listForm.quoteAddress,
                            chain: listForm.chain,
                            chainId: listForm.chainId,
                            listedBy: wallet.address || undefined,
                            enableMM: listForm.enableMM,
                            baseLogo: listForm.baseLogo || undefined,
                            quoteLogo: listForm.quoteLogo || undefined,
                          });
                          setPairs(await fetchPairs());
                          setSelectedPair(`${listForm.baseToken}/${listForm.quoteToken}`);
                          setShowListTokenModal(false);
                          setListForm({ baseToken: "", quoteToken: "", baseAddress: "", quoteAddress: "", chain: "Omega", chainId: 1313161916, enableMM: true, baseLogo: null, quoteLogo: null });
                          loadData();
                        } catch (e) {
                          setListTokenError(e.message || "Failed to list token");
                        } finally {
                          setListTokenLoading(false);
                        }
                      }}
                      style={{ flex: 1, padding: "10px", borderRadius: 12, background: t.glass.accent, border: "none", color: "#000", cursor: listTokenLoading ? "not-allowed" : "pointer", fontWeight: 700 }}
                    >
                      {listTokenLoading ? "Listing..." : "List Token"}
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: t.glass.textTertiary, marginTop: 4 }}>Logos and MM can be configured here. Run npm run dev:mm for liquidity.</div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Panel Modal */}
          {showAdminPanel && isAdmin && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 24,
            }} onClick={() => setShowAdminPanel(false)}>
              <div className="olympus-modal" style={{ ...t.panel, padding: 24, width: 420, maxWidth: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em" }}>MM Bot Control</div>
                {mmConfigError && <div style={{ fontSize: 12, color: t.glass.red, marginBottom: 12 }}>{mmConfigError}</div>}
                {mmConfigSaved && <div style={{ fontSize: 12, color: t.glass.green, marginBottom: 12 }}>Config saved. MM bot will apply within ~5 seconds.</div>}
                {mmConfig ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const pMin = parseFloat(priceLowStr) || 0.04;
                    const pMax = parseFloat(priceMaxStr) || 0.14;
                    const toSave = {
                      ...mmConfig,
                      priceMin: pMin,
                      priceMax: pMax,
                      meanPrice: (pMin + pMax) / 2,
                      orderSizeBase: parseInt(volumeStr, 10) || 25000,
                    };
                    setMmConfigError(null);
                    setMmConfigSaved(false);
                    setMmConfigSaving(true);
                    updateMMConfig(wallet.address, toSave).then(() => { setMmConfigSaving(false); setMmConfigSaved(true); setTimeout(() => setMmConfigSaved(false), 2000); }).catch((err) => { setMmConfigError(err.message); setMmConfigSaving(false); });
                  }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: t.glass.textTertiary, marginBottom: 6, display: "block" }}>Low Price</label>
                      <input type="text" inputMode="decimal" value={priceLowStr} onChange={(e) => setPriceLowStr(e.target.value)} onBlur={() => { const v = parseFloat(priceLowStr); if (!Number.isNaN(v)) setMmConfig((c) => ({ ...c, priceMin: v })); }} style={{ ...t.panelInner, width: "100%", padding: "12px 14px", color: t.glass.text, border: "1px solid " + t.glass.border, fontSize: 14 }} placeholder="e.g. 1.00" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: t.glass.textTertiary, marginBottom: 6, display: "block" }}>Max Price</label>
                      <input type="text" inputMode="decimal" value={priceMaxStr} onChange={(e) => setPriceMaxStr(e.target.value)} onBlur={() => { const v = parseFloat(priceMaxStr); if (!Number.isNaN(v)) setMmConfig((c) => ({ ...c, priceMax: v })); }} style={{ ...t.panelInner, width: "100%", padding: "12px 14px", color: t.glass.text, border: "1px solid " + t.glass.border, fontSize: 14 }} placeholder="e.g. 1.11" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: t.glass.textTertiary, marginBottom: 6, display: "block" }}>Volume (order size)</label>
                      <input type="text" inputMode="numeric" value={volumeStr} onChange={(e) => setVolumeStr(e.target.value.replace(/\D/g, ""))} onBlur={() => { const v = parseInt(volumeStr, 10); if (!Number.isNaN(v) && v > 0) setMmConfig((c) => ({ ...c, orderSizeBase: v })); }} style={{ ...t.panelInner, width: "100%", padding: "12px 14px", color: t.glass.text, border: "1px solid " + t.glass.border, fontSize: 14 }} placeholder="e.g. 25000" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: t.glass.textTertiary, marginBottom: 6, display: "block" }}>Depth Spread</label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[10, 20, 40].map((n) => (
                          <button key={n} type="button" onClick={() => setMmConfig((c) => ({ ...c, ladderLevels: n }))} style={{
                            flex: 1, minWidth: 70, padding: "12px", borderRadius: 10, border: "1px solid " + t.glass.border, cursor: "pointer", fontWeight: 600, fontSize: 13,
                            background: (mmConfig.ladderLevels ?? 20) === n ? t.glass.green : "transparent",
                            color: (mmConfig.ladderLevels ?? 20) === n ? "#000" : t.glass.text,
                          }}>{n}</button>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginTop: 6 }}>Orders above and below mid price</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button type="button" onClick={() => setShowAdminPanel(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "transparent", border: "1px solid " + t.glass.border, color: t.glass.textSecondary, cursor: "pointer", fontWeight: 600 }}>Close</button>
                      <button type="submit" disabled={mmConfigSaving} style={{ flex: 1, padding: "12px", borderRadius: 12, background: theme === "dark" ? t.glass.green : t.glass.gold, border: "none", color: theme === "dark" ? "#000" : "#1a1a1a", cursor: mmConfigSaving ? "not-allowed" : "pointer", fontWeight: 700 }}>{mmConfigSaving ? "Saving..." : mmConfigSaved ? "Saved!" : "Save"}</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ color: t.glass.textTertiary, fontSize: 13 }}>Loading MM config...</div>
                )}
              </div>
            </div>
          )}

          {/* Profile / Wallet Modal - Comprehensive */}
          {showWalletModal && connected && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.35)", backdropFilter: "blur(14px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            }} onClick={() => setShowWalletModal(false)}>
              <div className="olympus-modal" style={{
                ...t.panel, padding: 0, width: "100%", maxWidth: 580, maxHeight: "88vh",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "18px 20px", borderBottom: "1px solid " + t.glass.border,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: theme === "dark" ? "rgba(212,175,55,0.2)" : "rgba(251,191,36,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Profile</div>
                      <div style={{ fontSize: 11, color: t.glass.textTertiary }}>Wallet & trading activity</div>
                    </div>
                  </div>
                  <button onClick={() => setShowWalletModal(false)} style={{ background: "none", border: "none", color: t.glass.textTertiary, fontSize: 20, cursor: "pointer", padding: 4 }}>×</button>
                </div>
                <div style={{ display: "flex", gap: 2, padding: "12px 16px 0", borderBottom: "1px solid " + t.glass.border, overflowX: "auto" }}>
                  {["overview", "wallet", "balances", "tokens", "orders", "transactions"].map((tab) => (
                    <button key={tab} onClick={() => setProfileTab(tab)} style={{
                      padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                      textTransform: "capitalize",
                      background: profileTab === tab ? (theme === "dark" ? "rgba(212,175,55,0.15)" : "rgba(251,191,36,0.2)") : "transparent",
                      color: profileTab === tab ? t.glass.text : t.glass.textTertiary,
                      transition: "all 0.2s",
                    }}>{tab}</button>
                  ))}
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
                  {profileLoading && profileTab !== "overview" ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120, color: t.glass.textTertiary, fontSize: 13 }}>Loading...</div>
                  ) : profileTab === "overview" && (
                    <>
                      <div style={{ ...t.panelInner, padding: 16, marginBottom: 16 }}>
                        <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Wallet</div>
                        <div style={{ fontFamily: "'SF Mono', monospace", fontSize: 12, wordBreak: "break-all", color: t.glass.text }}>{wallet.address}</div>
                        <button onClick={() => navigator.clipboard?.writeText(wallet.address)} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: t.glass.bg, border: "1px solid " + t.glass.border, color: t.glass.text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Copy address</button>
                      </div>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Balances (Omega)</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
                        {(TOKENS[1313161916] || []).map((sym) => (
                          <div key={sym} style={{ ...t.panelInner, padding: "12px 14px" }}>
                            <span style={{ fontSize: 10, color: t.glass.textTertiary }}>{sym}</span>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{balances[sym] ?? "0.00"}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ ...t.panelInner, padding: 14 }}>
                          <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Open orders</div>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>{profileAllOrders.length}</div>
                        </div>
                        <div style={{ ...t.panelInner, padding: 14 }}>
                          <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 4 }}>Total trades</div>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>{profileUserTrades.length}</div>
                        </div>
                      </div>
                    </>
                  )}
                  {profileTab === "wallet" && (
                    <div style={{ ...t.panelInner, padding: 16 }}>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Connected address</div>
                      <div style={{ fontFamily: "'SF Mono', monospace", fontSize: 13, wordBreak: "break-all", color: t.glass.text, marginBottom: 12 }}>{wallet.address}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => navigator.clipboard?.writeText(wallet.address)} style={{ padding: "10px 18px", borderRadius: 10, background: t.glass.bg, border: "1px solid " + t.glass.border, color: t.glass.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Copy</button>
                        <a href={`https://explorer.omegablockchain.net/address/${wallet.address}`} target="_blank" rel="noopener noreferrer" style={{ padding: "10px 18px", borderRadius: 10, background: t.glass.bg, border: "1px solid " + t.glass.border, color: t.glass.text, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>View on Explorer</a>
                      </div>
                      <div style={{ marginTop: 16, fontSize: 11, color: t.glass.textTertiary }}>Chain: Omega (1313161916)</div>
                    </div>
                  )}
                  {profileTab === "balances" && (
                    <>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>Token balances</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(TOKENS[1313161916] || []).map((sym) => (
                          <div key={sym} style={{ ...t.panelInner, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{sym}</span>
                            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'SF Mono', monospace" }}>{balances[sym] ?? "0.00"}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {profileTab === "tokens" && (
                    <>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>Portfolio tokens</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(TOKENS[1313161916] || []).filter((s) => parseFloat(balances[s] || "0") > 0).map((sym) => (
                          <div key={sym} style={{ ...t.panelInner, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{sym}</span>
                            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'SF Mono', monospace" }}>{balances[sym] ?? "0.00"}</span>
                          </div>
                        ))}
                        {(TOKENS[1313161916] || []).filter((s) => parseFloat(balances[s] || "0") <= 0).length === (TOKENS[1313161916] || []).length && (
                          <div style={{ color: t.glass.textTertiary, fontSize: 13, padding: 20, textAlign: "center" }}>No tokens in portfolio yet</div>
                        )}
                      </div>
                    </>
                  )}
                  {profileTab === "orders" && (
                    <>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>Open orders</div>
                      {profileAllOrders.length > 0 ? (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ color: t.glass.textTertiary, fontSize: 9, letterSpacing: "0.04em" }}>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Pair</th>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Side</th>
                                <th style={{ padding: "8px 10px", textAlign: "right" }}>Price</th>
                                <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount</th>
                                <th style={{ padding: "8px 10px", textAlign: "right" }}>Filled</th>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profileAllOrders.map((o) => (
                                <tr key={o.id} style={{ borderTop: "1px solid " + t.glass.border }}>
                                  <td style={{ padding: "10px" }}>{o.pair || "—"}</td>
                                  <td style={{ padding: "10px", fontWeight: 600, color: o.side === "buy" ? t.glass.green : t.glass.red }}>{o.side?.toUpperCase()}</td>
                                  <td style={{ padding: "10px", fontFamily: "'SF Mono', monospace", textAlign: "right" }}>{o.price?.toFixed(4)}</td>
                                  <td style={{ padding: "10px", fontFamily: "'SF Mono', monospace", textAlign: "right" }}>{o.amount?.toLocaleString()}</td>
                                  <td style={{ padding: "10px", textAlign: "right" }}>{o.amount ? Math.round((o.filled || 0) / o.amount * 100) : 0}%</td>
                                  <td style={{ padding: "10px" }}>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await apiCancelOrder(o.id);
                                          setProfileAllOrders((p) => p.filter((x) => x.id !== o.id));
                                          const orders = await fetchUserOrders(wallet.address, selectedPair).catch(() => []);
                                          setOpenOrders(orders);
                                        } catch (_) { }
                                      }}
                                      style={{ padding: "4px 10px", borderRadius: 6, background: "transparent", border: "1px solid " + t.glass.red, color: t.glass.red, fontSize: 10, cursor: "pointer" }}
                                    >Cancel</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ color: t.glass.textTertiary, fontSize: 13, padding: 24, textAlign: "center" }}>No open orders</div>
                      )}
                    </>
                  )}
                  {profileTab === "transactions" && (
                    <>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>Trade history</div>
                      {profileUserTrades.length > 0 ? (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ color: t.glass.textTertiary, fontSize: 9, letterSpacing: "0.04em" }}>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Pair</th>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Side</th>
                                <th style={{ padding: "8px 10px", textAlign: "right" }}>Price</th>
                                <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount</th>
                                <th style={{ padding: "8px 10px", textAlign: "right" }}>Value</th>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profileUserTrades.map((tr, i) => (
                                <tr key={tr.id || i} style={{ borderTop: "1px solid " + t.glass.border }}>
                                  <td style={{ padding: "10px" }}>{tr.pair || selectedPair}</td>
                                  <td style={{ padding: "10px", fontWeight: 600, color: tr.side === "buy" ? t.glass.green : t.glass.red }}>{tr.side?.toUpperCase()}</td>
                                  <td style={{ padding: "10px", fontFamily: "'SF Mono', monospace", textAlign: "right" }}>{(tr.price || 0).toFixed(4)}</td>
                                  <td style={{ padding: "10px", fontFamily: "'SF Mono', monospace", textAlign: "right" }}>{(tr.amount || 0).toLocaleString()}</td>
                                  <td style={{ padding: "10px", fontFamily: "'SF Mono', monospace", textAlign: "right" }}>{((tr.amount || 0) * (tr.price || 0)).toFixed(2)}</td>
                                  <td style={{ padding: "10px", color: t.glass.textTertiary }}>{(tr.time || tr.timestamp) ? new Date(tr.time || tr.timestamp).toLocaleString() : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ color: t.glass.textTertiary, fontSize: 13, padding: 24, textAlign: "center" }}>No trades yet</div>
                      )}
                    </>
                  )}
                </div>
                <div style={{ padding: "16px 20px", borderTop: "1px solid " + t.glass.border }}>
                  <button onClick={() => { wallet.disconnect(); setShowWalletModal(false); }} style={{ width: "100%", padding: "12px", borderRadius: 12, background: "transparent", border: "1px solid " + t.glass.red, color: t.glass.red, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Disconnect</button>
                </div>
              </div>
            </div>
          )}

          {/* Chain Modal */}
          {showChainModal && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} onClick={() => setShowChainModal(false)}>
              <div style={{ ...t.panel, padding: 24, width: 340 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.02em" }}>Select Source Chain</div>
                <div style={{ fontSize: 11, color: t.glass.textTertiary, marginBottom: 20 }}>Pay with any token → receive $OMEGA</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {CHAINS.map((chain) => (
                    <button key={chain.id} onClick={() => { setSelectedChain(chain.id); setSelectedToken(TOKENS[chain.id][0]); setShowChainModal(false); }} style={{
                      ...t.panelInner, padding: "12px 14px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                      color: t.glass.text, fontSize: 13, fontWeight: 500, transition: "all 0.2s",
                      border: "1px solid " + (selectedChain === chain.id ? (theme === "dark" ? "rgba(212,175,55,0.5)" : "rgba(0,0,0,0.3)") : t.glass.border),
                      background: selectedChain === chain.id ? (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(251,191,36,0.12)") : (theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,250,240,0.6)"),
                    }}>
                      <span style={{ fontSize: 20 }}>{chain.icon}</span>
                      <div>
                        <div>{chain.name}</div>
                        <div style={{ fontSize: 10, color: t.glass.textTertiary }}>Chain ID: {chain.id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {apiError && (
            <div style={{
              margin: "12px 12px 0", padding: "10px 20px", borderRadius: 12,
              background: "rgba(255,69,58,0.15)", border: "1px solid rgba(255,69,58,0.4)",
              color: t.glass.red, fontSize: 12, fontWeight: 500,
            }}>
              {isZeroXPair ? (
                <>0x API: {apiError}. Run <code style={{ background: "rgba(212,175,55,0.2)", padding: "2px 6px", borderRadius: 4 }}>npm run dev:api</code> (or <code style={{ background: "rgba(212,175,55,0.2)", padding: "2px 6px", borderRadius: 4 }}>npm run dev:all</code>) so the proxy can reach 0x. Ensure <code style={{ background: "rgba(212,175,55,0.2)", padding: "2px 6px", borderRadius: 4 }}>VITE_0X_API_KEY</code> is in .env.</>
              ) : (
                <>{apiError} — Run <code style={{ background: "rgba(212,175,55,0.2)", padding: "2px 6px", borderRadius: 4 }}>npm run dev:api</code> in a separate terminal, or <code style={{ background: "rgba(212,175,55,0.2)", padding: "2px 6px", borderRadius: 4 }}>npm run dev:all</code> to start both.</>
              )}
            </div>
          )}

          {page === "dex" && (
            <>
              {/* ═══ TRADING PAIR BAR ═══ */}
              <div className="dex-pair-bar" style={{
                ...t.panel, margin: isMobile ? "8px 8px 0" : "12px 12px 0",
                padding: isMobile ? "10px 12px" : "12px 24px",
                display: "flex", alignItems: "center", gap: isMobile ? 12 : 32, flexWrap: "wrap",
                boxShadow: "0 4px 20px rgba(212,175,55,0.08)",
                position: "relative",
                zIndex: pairSearchOpen ? 10000 : undefined,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
                  <OmegaLogo width={32} height={32} theme={theme} />
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => { setPairSearchOpen((o) => !o); if (!pairSearchOpen) setPairSearchQuery(""); }}
                      style={{
                        background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,250,240,0.8)", border: "1px solid " + t.glass.border,
                        borderRadius: 12, padding: isMobile ? "14px 16px" : "8px 12px", fontSize: isMobile ? 16 : 15, fontWeight: 700,
                        color: t.glass.text, cursor: "pointer", minWidth: isMobile ? "100%" : 160, textAlign: "left",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      }}
                    >
                      <span>{currentPairInfo.baseToken || "PRE"} / {currentPairInfo.quoteToken || "mUSDC"}</span>
                      <span style={{ fontSize: isMobile ? 11 : 10, opacity: 0.7 }}>{isMobile ? "Tap to see all tokens ▼" : "▼"}</span>
                    </button>
                    {pairSearchOpen && isMobile ? (
                      <div style={{
                        position: "fixed", inset: 0, zIndex: 10002, background: theme === "dark" ? "#0a0a0c" : "#f5f5f5",
                        display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0)",
                      }}>
                        <div style={{ padding: "16px 12px 12px", borderBottom: "1px solid " + t.glass.border, display: "flex", alignItems: "center", gap: 12 }}>
                          <input
                            type="text"
                            placeholder="Search token..."
                            value={pairSearchQuery}
                            onChange={(e) => setPairSearchQuery(e.target.value)}
                            autoFocus
                            style={{
                              flex: 1, padding: "14px 16px", borderRadius: 12, border: "1px solid " + t.glass.border,
                              background: theme === "dark" ? "#1a1a1e" : "#fff", color: theme === "dark" ? "#fff" : "#1a1a1a",
                              fontSize: 16, outline: "none",
                            }}
                          />
                          <button type="button" onClick={() => setPairSearchOpen(false)} style={{
                            padding: "12px 20px", borderRadius: 12, border: "none", background: t.glass.border, color: t.glass.text, fontSize: 14, fontWeight: 600, cursor: "pointer",
                          }}>Done</button>
                        </div>
                        <div style={{ flex: 1, overflow: "auto", padding: "8px 0 24px" }}>
                          {filteredPairs.length === 0 ? (
                            <div style={{ padding: 24, color: t.glass.textTertiary, fontSize: 14, textAlign: "center" }}>No tokens match</div>
                          ) : (
                            filteredPairs.map((p) => {
                              const isFav = favoritePairIds.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => { setSelectedPair(p.id); setPairSearchOpen(false); setPairSearchQuery(""); }}
                                  style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "16px 20px", textAlign: "left", border: "none",
                                    background: selectedPair === p.id ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(212,175,55,0.18)") : "transparent",
                                    color: theme === "dark" ? "#fff" : "#1a1a1a", fontSize: 16, fontWeight: selectedPair === p.id ? 700 : 500,
                                    cursor: "pointer", transition: "background 0.15s", borderBottom: "1px solid " + (theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                                  }}
                                >
                                  <span>
                                    {p.baseToken} / {p.quoteToken}
                                    {p.chainLabel ? (
                                      <span style={{ display: "block", fontSize: 12, color: t.glass.textTertiary, marginTop: 2 }}>{p.chainLabel}</span>
                                    ) : p.chainId && p.chainId !== 1 ? (
                                      <span style={{ display: "block", fontSize: 12, color: t.glass.textTertiary, marginTop: 2 }}>
                                        {p.chainId === 137 ? "Polygon" : p.chainId === 42161 ? "Arbitrum" : p.chainId === 10 ? "Optimism" : p.chainId === 8453 ? "Base" : p.chainId === 56 ? "BNB" : p.chainId === 43114 ? "Avalanche" : ""}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => toggleFavoritePair(p.id, e)}
                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFavoritePair(p.id, e); } }}
                                    aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                                    style={{
                                      fontSize: 20, cursor: "pointer", padding: "8px",
                                      color: isFav ? (theme === "dark" ? "#fbbf24" : "#d4af37") : (theme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"),
                                    }}
                                  >
                                    {isFav ? "★" : "☆"}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : pairSearchOpen && !isMobile ? (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 10001,
                        minWidth: 280, maxHeight: 320, overflow: "hidden", display: "flex", flexDirection: "column",
                        background: theme === "dark" ? "#1a1a1e" : "#fff",
                        border: "1px solid " + (theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"),
                        borderRadius: 16,
                        boxShadow: theme === "dark" ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 40px rgba(0,0,0,0.15)",
                      }}>
                        <input
                          type="text"
                          placeholder="Search token or pair..."
                          value={pairSearchQuery}
                          onChange={(e) => setPairSearchQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") setPairSearchOpen(false); }}
                          autoFocus
                          style={{
                            margin: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid " + (theme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"),
                            background: theme === "dark" ? "#0d0d0f" : "#f5f5f5", color: theme === "dark" ? "#fff" : "#1a1a1a",
                            fontSize: 13, outline: "none",
                          }}
                        />
                        <div style={{ overflow: "auto", flex: 1, paddingBottom: 8 }}>
                          {filteredPairs.length === 0 ? (
                            <div style={{ padding: 16, color: theme === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 12 }}>No pairs match</div>
                          ) : (
                            filteredPairs.map((p) => {
                              const isFav = favoritePairIds.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => { setSelectedPair(p.id); setPairSearchOpen(false); setPairSearchQuery(""); }}
                                  style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 16px", textAlign: "left", border: "none",
                                    background: selectedPair === p.id ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(212,175,55,0.18)") : "transparent",
                                    color: theme === "dark" ? "#fff" : "#1a1a1a", fontSize: 13, fontWeight: selectedPair === p.id ? 700 : 500,
                                    cursor: "pointer", transition: "background 0.15s",
                                  }}
                                >
                                  <span>
                                    {p.baseToken} / {p.quoteToken}
                                    {p.chainLabel ? (
                                      <span style={{ fontSize: 10, color: theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)", marginLeft: 6 }}>{p.chainLabel}</span>
                                    ) : p.chainId && p.chainId !== 1 ? (
                                      <span style={{ fontSize: 10, color: theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)", marginLeft: 6 }}>
                                        {p.chainId === 137 ? "Polygon" : p.chainId === 42161 ? "Arbitrum" : p.chainId === 10 ? "Optimism" : p.chainId === 8453 ? "Base" : p.chainId === 56 ? "BNB" : p.chainId === 43114 ? "Avalanche" : ""}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => toggleFavoritePair(p.id, e)}
                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFavoritePair(p.id, e); } }}
                                    aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                                    style={{
                                      fontSize: 14, cursor: "pointer", padding: "2px 4px", marginLeft: 8,
                                      color: isFav ? (theme === "dark" ? "#fbbf24" : "#d4af37") : (theme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"),
                                      transition: "color 0.15s",
                                    }}
                                  >
                                    {isFav ? "★" : "☆"}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {pairSearchOpen && !isMobile && (
                    <div
                      role="button"
                      tabIndex={-1}
                      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
                      onClick={() => setPairSearchOpen(false)}
                      onKeyDown={(e) => e.key === "Escape" && setPairSearchOpen(false)}
                      aria-label="Close"
                    />
                  )}
                </div>
                <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: t.glass.green, letterSpacing: "-0.04em" }}>
                  {nonEvmPair && (nonEvmPriceFailed || orderBook.midPrice === 0) ? "—" : `$${orderBook.midPrice != null && orderBook.midPrice > 0 ? orderBook.midPrice.toFixed(4) : (isZeroXPair ? "0.0000" : "0.0847")}`}
                </div>

                {!isMobile && !isZeroXPair && (() => {
                  const mid = orderBook.midPrice || 0.0847;
                  // Update session-wide stats (accumulates across all ticks)
                  const ss = sessionStats.current;
                  if (!ss.initialized && mid > 0) {
                    ss.high = mid; ss.low = mid; ss.startPrice = mid; ss.initialized = true;
                  } else if (ss.initialized) {
                    ss.high = Math.max(ss.high, mid);
                    ss.low = Math.min(ss.low, mid);
                  }
                  // Also factor in trade prices
                  trades.forEach(t => {
                    if (t.price > 0) {
                      ss.high = Math.max(ss.high, t.price);
                      ss.low = Math.min(ss.low, t.price);
                    }
                  });
                  const changePercent = ss.startPrice > 0 ? ((mid - ss.startPrice) / ss.startPrice * 100) : 0;
                  const totalVol = trades.reduce((s, t) => s + (t.amount || 0), 0);
                  const totalVolUSD = trades.reduce((s, t) => s + (t.amount || 0) * (t.price || mid), 0);
                  return [
                    { label: "24h Change", value: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`, color: changePercent >= 0 ? t.glass.green : t.glass.red },
                    { label: "24h High", value: ss.high.toFixed(4) },
                    { label: "24h Low", value: ss.low.toFixed(4) },
                    { label: "24h Vol", value: `${(totalVol / 1000).toFixed(1)}K ${selectedPair.split("/")[0] || "PRE"}` },
                    { label: "24h Vol", value: `$${totalVolUSD >= 1000 ? (totalVolUSD / 1000).toFixed(1) + "K" : totalVolUSD.toFixed(0)}` },
                  ];
                })().map((s, i) => (
                  <div key={i} className="dex-pair-bar-stats-item" style={{ borderLeft: "1px solid " + t.glass.border, paddingLeft: 16 }}>
                    <div style={{ fontSize: 9, color: t.glass.textTertiary, marginBottom: 2, letterSpacing: "0.02em" }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: s.color || t.glass.textSecondary, letterSpacing: "-0.01em" }}>{s.value}</div>
                  </div>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowEightBallPopup(true)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "2px solid " + (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(212,175,55,0.3)"),
                      background: theme === "dark" ? "radial-gradient(circle at 30% 30%, #2a2a2a, #0a0a0a)" : "radial-gradient(circle at 30% 30%, #3a3a3a, #1a1a1a)",
                      boxShadow: theme === "dark" ? "0 0 16px rgba(212,175,55,0.35), 0 0 32px rgba(212,175,55,0.15)" : "0 0 20px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.2)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      color: t.glass.text,
                      flexShrink: 0,
                    }}
                    title="Magic 8 Ball"
                  >
                    8
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage("prediction")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "100px",
                      border: "1px solid " + t.glass.border,
                      background: "transparent",
                      color: t.glass.textSecondary,
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Prediction
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPage("casino"); setCasinoGame(null); }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "100px",
                      border: "1px solid " + t.glass.border,
                      background: "transparent",
                      color: t.glass.textSecondary,
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Casino
                  </button>
                </div>
              </div>
            </>
          )}
          {
            page === "prediction" && (() => {
              // Extract unique categories from loaded markets
              const categories = [...new Set(predictionMarkets.map(m => m.category).filter(Boolean))].sort();
              // Section tabs: Trending, New, Popular, or specific category
              const SECTION_TABS = [
                { id: "all", label: "🔥 All", icon: "" },
                { id: "trending", label: "📈 Trending", icon: "" },
                { id: "new", label: "🆕 New", icon: "" },
                { id: "popular", label: "⭐ Popular", icon: "" },
              ];
              const filteredMarkets = predictionMarkets.filter((m) => {
                // Section filter
                if (predictionCategory === "trending" && m.section !== "trending") return false;
                if (predictionCategory === "new" && m.section !== "new") return false;
                if (predictionCategory === "popular" && m.section !== "popular" && m.section !== "trending") return false;
                // Category filter (non-special tabs)
                if (!["all", "trending", "new", "popular"].includes(predictionCategory) && m.category !== predictionCategory) return false;
                // Search filter
                if (predictionSearch && !m.title.toLowerCase().includes(predictionSearch.toLowerCase())) return false;
                return true;
              });
              const fmtVol = (v) => v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? "$" + (v / 1e3).toFixed(0) + "K" : "$" + (v || 0).toFixed(0);
              const fmtPct = (p) => p != null ? Math.round(p * 100) + "%" : "—";

              // ══════ EVENT DETAIL VIEW ══════
              if (selectedEvent) {
                const ev = selectedEvent;
                const isSelected = (mk) => predictionBetMarket?.yesTokenId === mk.yesTokenId;
                const rightPanelStyle = { width: 380, background: t.panel.background, borderLeft: "1px solid " + t.glass.border, display: "flex", flexDirection: "column", boxShadow: "-5px 0 20px rgba(0,0,0,0.05)", zIndex: 10 };

                return (
                  <div style={{ display: "flex", height: "100%", overflow: "hidden", background: theme === "dark" ? "#0a0a0a" : "#faf8f3" }}>
                    <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
                      <>

                        <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
                          <div style={{ padding: "24px 32px", maxWidth: 960, margin: "0 auto" }}>

                            {/* Back */}
                            <div style={{ marginBottom: 20 }}>
                              <button onClick={() => { setSelectedEvent(null); setPredictionBetMarket(null); }} style={{
                                background: "transparent", border: "none", color: t.glass.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                              }}>← Back to Markets</button>
                            </div>

                            {/* Header — Polymarket-style: category line, then title, then meta */}
                            <div style={{ display: "flex", gap: 16, marginBottom: 28, alignItems: "flex-start" }}>
                              {ev.image && <img src={ev.image} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: t.glass.textTertiary, marginBottom: 6 }}>
                                  {ev.category && <span style={{ color: t.glass.textSecondary }}>{ev.category}</span>}
                                  {ev.category && <span style={{ margin: "0 6px", opacity: 0.6 }}>·</span>}
                                  <span>Vol {fmtVol(ev.volume)}</span>
                                  <span style={{ marginLeft: 12 }}>Ends {ev.endDate ? new Date(ev.endDate).toLocaleDateString() : "—"}</span>
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: t.glass.text, lineHeight: 1.25 }}>{ev.title}</div>
                              </div>
                            </div>

                            {/* Price history chart — use selected outcome so chart matches the row you're trading */}
                            {(() => {
                              const belongsToEvent = predictionBetMarket && ev.markets?.some((m) => m.yesTokenId === predictionBetMarket.yesTokenId);
                              const chartMarket = (belongsToEvent && (predictionBetMarket.yesTokenId || predictionBetMarket.noTokenId)) ? predictionBetMarket : ev.markets?.[0];
                              if (!chartMarket?.yesTokenId && !chartMarket?.noTokenId) return null;
                              const chartLabel = chartMarket.groupItemTitle || chartMarket.question || "Outcome";
                              return (
                                <div style={{ marginBottom: 28, borderRadius: 12, border: "1px solid " + t.glass.border, overflow: "hidden", background: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)", padding: "16px 20px 20px" }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: t.glass.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Chart: {chartLabel}</div>
                                  <PredictionChart
                                    yesTokenId={chartMarket.yesTokenId}
                                    noTokenId={chartMarket.noTokenId}
                                    interval={["1d", "1w", "1m", "3m", "all"].includes(chartRange) ? chartRange : "1w"}
                                    onIntervalChange={setChartRange}
                                    theme={theme}
                                    network={predictionNetwork}
                                  />
                                </div>
                              );
                            })()}

                            {/* Outcomes list */}
                            {ev.markets?.length > 0 && (
                                <div style={{ marginBottom: 28 }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 0, borderRadius: 12, overflow: "hidden", border: "1px solid " + t.glass.border }}>
                                    {ev.markets?.map((mk, i) => {
                                      const active = isSelected(mk);
                                      const yesPct = mk.yesPrice ? Math.round(mk.yesPrice * 100) : 0;
                                      const fmtP = (p) => p != null ? (p * 100).toFixed(1) + "¢" : "—";
                                      return (
                                        <div key={i}
                                          onClick={() => {
                                            setPredictionBetMarket({ ...ev, ...mk, title: ev.title + " — " + (mk.groupItemTitle || mk.question || "Outcome") });
                                            setPredictionBetSide("yes");
                                            setPredictionBetPrice(mk.yesPrice ? String(mk.yesPrice.toFixed(2)) : "0.50");
                                            setPredictionOrderError(null);
                                          }}
                                          style={{
                                            display: "flex", alignItems: "center", padding: "12px 16px", cursor: "pointer",
                                            background: active ? (theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)") : (theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.4)"),
                                            borderBottom: i < (ev.markets?.length || 0) - 1 ? "1px solid " + t.glass.border : "none",
                                            transition: "background 0.15s"
                                          }}
                                        >
                                          <div style={{ flex: 1, fontWeight: 600, color: t.glass.text, fontSize: 13 }}>{mk.groupItemTitle || mk.question || "Outcome"}</div>
                                          <div style={{ fontSize: 12, fontWeight: 700, color: t.glass.text, minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{yesPct < 0.5 ? "<1%" : yesPct >= 99.5 ? "100%" : yesPct + "%"}</div>
                                          <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                                            <button onClick={(e) => { e.stopPropagation(); setPredictionBetMarket({ ...ev, ...mk, title: ev.title + " — " + (mk.groupItemTitle || mk.question || "Outcome") }); setPredictionBetSide("yes"); setPredictionBetPrice(mk.yesPrice ? String(mk.yesPrice.toFixed(2)) : "0.50"); }} style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(34,197,94,0.18)", color: "#22c55e", fontSize: 11, fontWeight: 700 }}>Yes {fmtP(mk.yesPrice)}</button>
                                            <button onClick={(e) => { e.stopPropagation(); setPredictionBetMarket({ ...ev, ...mk, title: ev.title + " — " + (mk.groupItemTitle || mk.question || "Outcome") }); setPredictionBetSide("no"); setPredictionBetPrice(mk.noPrice ? String(mk.noPrice.toFixed(2)) : "0.50"); }} style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.18)", color: "#ef4444", fontSize: 11, fontWeight: 700 }}>No {fmtP(mk.noPrice)}</button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                            )}
                          </div>
                        </div>
                        <div style={rightPanelStyle}>
                          <div style={{ flexShrink: 0 }}>
                          {predictionBetMarket ? (
                            <div style={{ padding: 20 }}>
                              {/* Outcome name */}
                              <div style={{ fontSize: 15, fontWeight: 600, color: t.glass.text, marginBottom: 16, lineHeight: 1.3 }}>{predictionBetMarket.groupItemTitle || predictionBetMarket.question || "Outcome"}</div>

                              {/* Yes / No at market price — Polymarket-style */}
                              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                                <button type="button" onClick={() => { setPredictionBetSide("yes"); setPredictionBetPrice(predictionBetMarket.yesPrice ? String(predictionBetMarket.yesPrice.toFixed(2)) : "0.50"); }} style={{
                                  flex: 1, padding: "14px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                                  background: predictionBetSide === "yes" ? t.glass.green : (theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                                  color: predictionBetSide === "yes" ? "#000" : t.glass.text, fontWeight: 700, fontSize: 15
                                }}>Yes {(predictionBetMarket.yesPrice != null ? (predictionBetMarket.yesPrice * 100).toFixed(1) : "0")}¢</button>
                                <button type="button" onClick={() => { setPredictionBetSide("no"); setPredictionBetPrice(predictionBetMarket.noPrice ? String(predictionBetMarket.noPrice.toFixed(2)) : "0.50"); }} style={{
                                  flex: 1, padding: "14px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                                  background: predictionBetSide === "no" ? t.glass.red : (theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                                  color: predictionBetSide === "no" ? "#fff" : t.glass.text, fontWeight: 700, fontSize: 15
                                }}>No {(predictionBetMarket.noPrice != null ? (predictionBetMarket.noPrice * 100).toFixed(1) : "0")}¢</button>
                              </div>

                              {/* Amount — Polymarket-style with quick add */}
                              <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, color: t.glass.textTertiary, display: "block", marginBottom: 8 }}>Amount</label>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <input type="number" min="1" step="1" value={predictionBetSize} onChange={(e) => setPredictionBetSize(e.target.value)}
                                    style={{ flex: "1 1 80px", minWidth: 0, padding: "12px 14px", borderRadius: 10, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff", color: t.glass.text, fontSize: 16, fontWeight: 600, outline: "none" }} />
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {[1, 5, 10, 100].map((n) => (
                                      <button key={n} type="button" onClick={() => setPredictionBetSize(String(Math.max(1, Number(predictionBetSize) + n)))} style={{
                                        padding: "8px 12px", borderRadius: 8, border: "1px solid " + t.glass.border, background: "transparent", color: t.glass.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer"
                                      }}>+{n}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Cost summary — minimal */}
                              {(() => {
                                const cost = Number(predictionBetPrice) * Number(predictionBetSize);
                                const total = cost + cost * PREDICTION_FEE_PCT;
                                return (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: t.glass.textTertiary, marginBottom: 16 }}>
                                    <span>Cost</span>
                                    <span style={{ color: t.glass.text, fontWeight: 600 }}>${total.toFixed(2)}</span>
                                  </div>
                                );
                              })()}

                              {predictionOrderError && <div style={{ fontSize: 12, color: t.glass.red, marginBottom: 12, textAlign: "center" }}>{predictionOrderError}</div>}

                              <button
                                type="button"
                                disabled={predictionOrderLoading || !(predictionBetMarket.yesTokenId || predictionBetMarket.noTokenId)}
                                onClick={async () => {
                                  const provider = wallet.getProvider?.();
                                  if (!provider || !connected) { setPredictionOrderError("Connect wallet first"); return; }
                                  setPredictionOrderError(null);
                                  setPredictionOrderLoading(true);
                                  try {
                                    await placePolymarketOrder(provider, { yesTokenId: predictionBetMarket.yesTokenId, noTokenId: predictionBetMarket.noTokenId }, predictionBetSide, predictionBetPrice, predictionBetSize, PREDICTION_FEE_WALLET_POLY, PREDICTION_FEE_PCT);
                                    setPredictionBetMarket(null);
                                  } catch (err) {
                                    setPredictionOrderError(err.message || "Order failed");
                                  } finally {
                                    setPredictionOrderLoading(false);
                                  }
                                }}
                                style={{
                                  width: "100%", padding: "14px 24px", borderRadius: 10, border: "none",
                                  background: "#3b82f6", color: "#fff", fontSize: 15, fontWeight: 700, cursor: predictionOrderLoading ? "wait" : "pointer",
                                  opacity: predictionOrderLoading ? 0.8 : 1
                                }}
                              >
                                {predictionOrderLoading ? "Placing…" : "Trade"}
                              </button>

                              {predictionNetwork === "polygon" && (
                                <button type="button" onClick={async () => {
                                  const provider = wallet.getProvider?.();
                                  if (provider) try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] }); } catch (e) { console.warn(e) }
                                }} style={{ marginTop: 12, background: "transparent", border: "none", color: t.glass.textTertiary, fontSize: 11, cursor: "pointer", textDecoration: "underline", display: "block" }}>
                                  Switch to Polygon
                                </button>
                              )}

                            </div>
                          ) : (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: t.glass.textTertiary, padding: 32, textAlign: "center" }}>
                              <div style={{ fontSize: 40, opacity: 0.2 }}>👈</div>
                              <div style={{ fontSize: 13, maxWidth: 200, lineHeight: 1.5 }}>Select an outcome from the list to place a trade</div>
                            </div>
                          )}
                          </div>
                          {/* News — fills remaining sidebar; scrollable with visible affordance */}
                          <div style={{ borderTop: "1px solid " + t.glass.border, flex: 1, minHeight: 220, display: "flex", flexDirection: "column", background: theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)" }}>
                            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: t.glass.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em" }}>News</span>
                              <span style={{ fontSize: 10, color: t.glass.textTertiary, opacity: 0.9 }}>↕ scroll</span>
                            </div>
                            <div className="prediction-news-scroll" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                              <PredictionNews theme={theme} query={ev.title || ev.markets?.[0]?.question || ev.slug || "prediction"} />
                            </div>
                          </div>
                        </div>

                      </>
                    </div>
                  </div>
                );
              }

              // ══════ MARKETS LIST VIEW (Polymarket-style) ══════
              return (
                <>
                  {/* Top bar */}
                  <div style={{
                    padding: "12px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                    borderBottom: "1px solid " + t.glass.border,
                    background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <OmegaLogo width={28} height={28} theme={theme} />
                      <button type="button" onClick={() => setPage("dex")} style={{
                        padding: "7px 14px", borderRadius: 8, border: "1px solid " + t.glass.border,
                        background: "transparent", color: t.glass.textSecondary, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.15s",
                      }}>← DEX</button>
                      <span style={{ fontSize: 15, fontWeight: 700, color: t.glass.text }}>Markets</span>


                    </div>
                    {/* Search */}
                    <div style={{ marginLeft: "auto", position: "relative", maxWidth: 280, flex: "0 1 280px" }}>
                      <input
                        type="text"
                        placeholder="Search markets…"
                        value={predictionSearch}
                        onChange={(e) => setPredictionSearch(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 14px 8px 34px", borderRadius: 8,
                          border: "1px solid " + t.glass.border,
                          background: theme === "dark" ? "rgba(255,255,255,0.06)" : "#fff",
                          color: t.glass.text, fontSize: 13, outline: "none",
                        }}
                      />
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: t.glass.textTertiary, pointerEvents: "none" }}>🔍</span>
                    </div>
                    <button type="button" onClick={() => setShowEightBallPopup(true)} style={{
                      width: 34, height: 34, borderRadius: "50%",
                      border: "2px solid " + (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(212,175,55,0.3)"),
                      background: theme === "dark" ? "radial-gradient(circle at 30% 30%, #2a2a2a, #0a0a0a)" : "radial-gradient(circle at 30% 30%, #3a3a3a, #1a1a1a)",
                      boxShadow: "0 0 12px rgba(212,175,55,0.25)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, color: "#d4af37", flexShrink: 0,
                    }} title="Magic 8 Ball">8</button>
                  </div>

                  {/* Section tabs (Trending / New / Popular) */}
                  <div style={{
                    padding: "10px 24px", display: "flex", gap: 4, alignItems: "center",
                    background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)",
                    borderBottom: "1px solid " + t.glass.border,
                  }}>
                    {SECTION_TABS.map((tab) => (
                      <button key={tab.id} type="button" onClick={() => setPredictionCategory(tab.id)} style={{
                        padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                        background: predictionCategory === tab.id
                          ? (theme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)")
                          : "transparent",
                        color: predictionCategory === tab.id ? t.glass.text : t.glass.textTertiary,
                      }}>{tab.label}</button>
                    ))}
                    <div style={{ borderLeft: "1px solid " + t.glass.border, height: 20, margin: "0 6px" }} />
                    {/* Category pills — scrollable */}
                    <div style={{ display: "flex", gap: 4, overflow: "auto", flex: 1, scrollbarWidth: "none" }}>
                      {categories.map((cat) => (
                        <button key={cat} type="button" onClick={() => setPredictionCategory(predictionCategory === cat ? "all" : cat)} style={{
                          padding: "5px 12px", borderRadius: 100, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                          fontSize: 11, fontWeight: 600, transition: "all 0.15s", flexShrink: 0,
                          background: predictionCategory === cat
                            ? (theme === "dark" ? "rgba(212,175,55,0.2)" : "rgba(212,175,55,0.15)")
                            : "transparent",
                          color: predictionCategory === cat ? "#d4af37" : t.glass.textTertiary,
                        }}>{cat}</button>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: t.glass.textTertiary, whiteSpace: "nowrap", marginLeft: 8 }}>{filteredMarkets.length} markets</span>
                  </div>

                  {/* Markets grid */}
                  <div style={{ padding: "16px 24px", height: "calc(100% - 56px)", overflow: "auto", background: theme === "dark" ? "#0d0d0f" : "#faf8f3" }}>
                    {predictionLoading ? (
                      <div style={{ padding: 48, textAlign: "center", color: t.glass.textTertiary }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div style={{ fontSize: 13 }}>Loading markets…</div>
                      </div>
                    ) : filteredMarkets.length === 0 ? (
                      <div style={{ padding: 48, textAlign: "center", color: t.glass.textTertiary }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                        <div style={{ fontSize: 13 }}>{predictionMarkets.length === 0 ? "Unable to load markets." : "No results found."}</div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                        {filteredMarkets.map((ev) => {
                          const yesPct = ev.yesPrice != null ? Math.round(ev.yesPrice * 100) : null;
                          return (
                            <div key={ev.id} style={{
                              borderRadius: 12, overflow: "hidden", cursor: "pointer",
                              border: "1px solid " + t.glass.border,
                              background: theme === "dark" ? "rgba(255,255,255,0.03)" : "#fff",
                              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                            }}
                              onClick={() => {
                                if (ev.slug) {
                                  setSelectedEventLoading(true);
                                  fetchPredictionEvent(ev.slug, predictionNetwork).then((detail) => {
                                    setSelectedEvent(detail || ev);
                                  }).catch(() => setSelectedEvent(ev)).finally(() => setSelectedEventLoading(false));
                                } else {
                                  setSelectedEvent(ev);
                                }
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
                                e.currentTarget.style.borderColor = theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.borderColor = t.glass.border;
                              }}
                            >
                              {/* Card content */}
                              <div style={{ padding: "16px 18px" }}>
                                {/* Top: image + title */}
                                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                                  {ev.image && (
                                    <img src={ev.image} alt="" style={{
                                      width: 48, height: 48, borderRadius: 10, objectFit: "cover",
                                      border: "1px solid " + t.glass.border, flexShrink: 0,
                                    }} />
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontSize: 14, fontWeight: 700, color: t.glass.text, lineHeight: 1.35, marginBottom: 4,
                                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                                    }}>{ev.title}</div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      {ev.category && <span style={{ fontSize: 10, fontWeight: 600, color: "#818cf8" }}>{ev.category}</span>}
                                      <span style={{ fontSize: 10, color: t.glass.textTertiary }}>{fmtVol(ev.volume)} Vol</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Probability bar */}
                                {yesPct != null && (
                                  <div style={{ marginBottom: 14 }}>
                                    <div style={{
                                      height: 6, borderRadius: 100, overflow: "hidden",
                                      background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                                    }}>
                                      <div style={{
                                        height: "100%", borderRadius: 100,
                                        width: `${yesPct}%`,
                                        background: yesPct > 65 ? "linear-gradient(90deg, #22c55e, #4ade80)" : yesPct > 35 ? "linear-gradient(90deg, #eab308, #facc15)" : "linear-gradient(90deg, #ef4444, #f87171)",
                                        transition: "width 0.4s ease",
                                      }} />
                                    </div>
                                  </div>
                                )}

                                {/* Yes / No buttons */}
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button type="button" onClick={(e) => {
                                    e.stopPropagation();
                                    setPredictionBetMarket(ev); setPredictionBetSide("yes");
                                    setPredictionBetPrice(ev.yesPrice != null ? String(ev.yesPrice.toFixed(2)) : "0.50");
                                    setPredictionBetSize("10"); setPredictionOrderError(null);
                                  }} style={{
                                    flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer",
                                    background: theme === "dark" ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)",
                                    color: "#22c55e", fontSize: 13, fontWeight: 700,
                                    transition: "background 0.15s",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                  }}
                                    onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.background = "rgba(34,197,94,0.2)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = theme === "dark" ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)"; }}
                                  >Yes {yesPct != null ? yesPct + "¢" : ""}</button>
                                  <button type="button" onClick={(e) => {
                                    e.stopPropagation();
                                    setPredictionBetMarket(ev); setPredictionBetSide("no");
                                    setPredictionBetPrice(ev.noPrice != null ? String(ev.noPrice.toFixed(2)) : "0.50");
                                    setPredictionBetSize("10"); setPredictionOrderError(null);
                                  }} style={{
                                    flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer",
                                    background: theme === "dark" ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)",
                                    color: "#ef4444", fontSize: 13, fontWeight: 700,
                                    transition: "background 0.15s",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                  }}
                                    onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = theme === "dark" ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)"; }}
                                  >No {ev.noPrice != null ? Math.round(ev.noPrice * 100) + "¢" : ""}</button>
                                </div>
                                <a
                                  href={`https://news.google.com/search?q=${encodeURIComponent(ev.title || ev.slug || "prediction")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
                                    fontSize: 11, fontWeight: 600, color: theme === "dark" ? "#7dd3fc" : "#0284c7",
                                    textDecoration: "none",
                                  }}
                                >
                                  News →
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()
          }


          {/* ═══ CASINO PAGE ═══ */}
          {page === "casino" && (
            <>
              <div style={{
                ...t.panel, margin: "12px 12px 0",
                padding: "12px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                boxShadow: "0 4px 20px rgba(212,175,55,0.08)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <OmegaLogo width={32} height={32} theme={theme} />
                  <button type="button" onClick={() => setPage("dex")} style={{
                    padding: "8px 16px", borderRadius: "100px", border: "1px solid " + t.glass.border,
                    background: "transparent", color: t.glass.textSecondary, fontSize: 12, fontWeight: 600,
                    letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.2s",
                  }}>DEX</button>
                  <button type="button" onClick={() => setPage("prediction")} style={{
                    padding: "8px 16px", borderRadius: "100px", border: "1px solid " + t.glass.border,
                    background: "transparent", color: t.glass.textSecondary, fontSize: 12, fontWeight: 600,
                    letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.2s",
                  }}>Prediction</button>
                  <button type="button" style={{
                    padding: "8px 16px", borderRadius: "100px",
                    border: "1px solid " + (theme === "dark" ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.6)"),
                    background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(212,175,55,0.12)",
                    color: t.glass.gold, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", cursor: "default",
                  }}>Casino</button>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: t.glass.textSecondary }}>Balance:</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.glass.gold, fontFamily: "monospace" }}>${casinoBalance}</span>
                  <button type="button" onClick={() => setShowEightBallPopup(true)} style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "2px solid " + (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(212,175,55,0.3)"),
                    background: theme === "dark" ? "radial-gradient(circle at 30% 30%, #2a2a2a, #0a0a0a)" : "radial-gradient(circle at 30% 30%, #3a3a3a, #1a1a1a)",
                    boxShadow: theme === "dark" ? "0 0 16px rgba(212,175,55,0.35), 0 0 32px rgba(212,175,55,0.15)" : "0 0 20px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.2)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: t.glass.text, flexShrink: 0,
                  }} title="Magic 8 Ball">8</button>
                </div>
              </div>

              <div style={{ padding: 12, height: "calc(100vh - 180px)", minHeight: 600, overflow: "hidden" }}>
                <Casino
                  balance={casinoBalance}
                  setBalance={setCasinoBalance}
                  theme={theme}
                  t={t}
                />
              </div>
            </>
          )}

          {/* Place bet modal (only shows when NOT in detailed view, OR if we want it to check selectedEvent) */}
          {predictionBetMarket && !selectedEvent && (
            <div
              style={{
                position: "fixed", inset: 0, zIndex: 10000,
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
              }}
              onClick={() => { setPredictionBetMarket(null); setPredictionOrderError(null); }}
            >
              <div
                style={{ ...t.panel, padding: 24, maxWidth: 400, width: "100%" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.glass.text }}>Place Prediction</div>
                  <button type="button" onClick={() => { setPredictionBetMarket(null); setPredictionOrderError(null); }} style={{ background: "none", border: "none", color: t.glass.textTertiary, fontSize: 20, cursor: "pointer" }}>×</button>
                </div>
                <div style={{ fontSize: 12, color: t.glass.textSecondary, marginBottom: 16, lineHeight: 1.4 }}>{predictionBetMarket.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, color: t.glass.textTertiary, display: "block", marginBottom: 4 }}>Side</label>
                    <select value={predictionBetSide} onChange={(e) => setPredictionBetSide(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,250,240,0.9)", color: t.glass.text, fontSize: 13 }}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: t.glass.textTertiary, display: "block", marginBottom: 4 }}>Price (0–1)</label>
                    <input type="number" min="0.01" max="0.99" step="0.01" value={predictionBetPrice} onChange={(e) => setPredictionBetPrice(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,250,240,0.9)", color: t.glass.text, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: t.glass.textTertiary, display: "block", marginBottom: 4 }}>Size (shares)</label>
                    <input type="number" min="1" value={predictionBetSize} onChange={(e) => setPredictionBetSize(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,250,240,0.9)", color: t.glass.text, fontSize: 13 }} />
                  </div>
                  {/* Fee breakdown */}
                  {(() => {
                    const cost = Number(predictionBetPrice) * Number(predictionBetSize);
                    const fee = cost * PREDICTION_FEE_PCT;
                    const total = cost + fee;
                    return (
                      <div style={{ padding: "12px 14px", borderRadius: 10, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: "1px solid " + t.glass.border }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: t.glass.textTertiary }}>Cost ({predictionBetSize} × {predictionBetPrice})</span>
                          <span style={{ fontSize: 11, color: t.glass.text, fontWeight: 600 }}>${cost.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: t.glass.textTertiary }}>Fee</span>
                          <span style={{ fontSize: 11, color: t.glass.textTertiary }}>${fee.toFixed(4)}</span>
                        </div>
                        <div style={{ borderTop: "1px solid " + t.glass.border, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: t.glass.text, fontWeight: 700 }}>Total</span>
                          <span style={{ fontSize: 12, color: t.glass.text, fontWeight: 700 }}>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                  {predictionOrderError && <div style={{ fontSize: 12, color: t.glass.red }}>{predictionOrderError}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={async () => {
                        const provider = wallet.getProvider?.();
                        if (!provider) { setPredictionOrderError("Connect wallet first"); return; }
                        try {
                          await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] });
                        } catch (e) {
                          if (e.code === 4902) {
                            await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x89", chainName: "Polygon", nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }, rpcUrls: ["https://polygon-rpc.com"] }] });
                          } else { setPredictionOrderError(e.message || "Failed to switch network"); }
                        }
                      }}
                      style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid " + t.glass.border, background: "transparent", color: t.glass.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Switch to Polygon
                    </button>
                    <button
                      type="button"
                      disabled={predictionOrderLoading || !(predictionBetMarket.yesTokenId || predictionBetMarket.noTokenId)}
                      onClick={async () => {
                        const provider = wallet.getProvider?.();
                        if (!provider || !connected) { setPredictionOrderError("Connect wallet first"); return; }
                        setPredictionOrderError(null);
                        setPredictionOrderLoading(true);
                        try {
                          await placePolymarketOrder(provider, { yesTokenId: predictionBetMarket.yesTokenId, noTokenId: predictionBetMarket.noTokenId }, predictionBetSide, predictionBetPrice, predictionBetSize, PREDICTION_FEE_WALLET, PREDICTION_FEE_PCT);
                          setPredictionBetMarket(null);
                        } catch (err) {
                          setPredictionOrderError(err.message || "Order failed");
                        } finally {
                          setPredictionOrderLoading(false);
                        }
                      }}
                      style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", background: t.glass.green, color: "#000", fontSize: 12, fontWeight: 700, cursor: predictionOrderLoading ? "wait" : "pointer" }}
                    >
                      {predictionOrderLoading ? "Placing…" : "Place order"}
                    </button>
                  </div>
                </div>
                {!(predictionBetMarket.yesTokenId || predictionBetMarket.noTokenId) && <div style={{ fontSize: 11, color: t.glass.textTertiary, marginTop: 12 }}>This market doesn’t support in-app orders yet. </div>}
              </div>
            </div>
          )}

          {/* 8 Ball popup */}
          {showEightBallPopup && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: 24,
                zIndex: 9999,
              }}
              onClick={() => setShowEightBallPopup(false)}
            >
              <style>{`
                @keyframes eightBallShake {
                  0%, 100% { transform: rotate(-4deg); }
                  50% { transform: rotate(4deg); }
                }
                @keyframes eightBallPopupIn {
                  from { opacity: 0; transform: scale(0.92); }
                  to { opacity: 1; transform: scale(1); }
                }
              `}</style>
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  ...t.panel,
                  padding: 0,
                  overflow: "hidden",
                  maxWidth: 320,
                  width: "100%",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px " + (theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(212,175,55,0.15)"),
                  borderRadius: 20,
                  animation: "eightBallPopupIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <div style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid " + t.glass.border,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(212,175,55,0.06)",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: t.glass.textSecondary }}>MAGIC 8 BALL</span>
                  <button
                    type="button"
                    onClick={() => setShowEightBallPopup(false)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: "none",
                      background: "rgba(255,255,255,0.08)",
                      color: t.glass.textTertiary,
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div
                  onClick={() => {
                    if (eightBallShaking) return;
                    setEightBallShaking(true);
                    setEightBallAnswer(null);
                    setTimeout(() => {
                      setEightBallAnswer(EIGHT_BALL_ANSWERS[Math.floor(Math.random() * EIGHT_BALL_ANSWERS.length)]);
                      setEightBallShaking(false);
                    }, 1200);
                  }}
                  style={{
                    padding: 24,
                    cursor: eightBallShaking ? "wait" : "pointer",
                    transition: "transform 0.2s",
                    animation: eightBallShaking ? "eightBallShake 0.15s ease-in-out infinite" : "none",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div style={{
                    width: 180,
                    height: 180,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: theme === "dark"
                      ? "radial-gradient(circle at 35% 25%, #3a3a3a, #1a1a1a 40%, #0a0a0a)"
                      : "radial-gradient(circle at 35% 25%, #4a4a4a, #2a2a2a 40%, #1a1a1a)",
                    border: "2px solid " + (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(212,175,55,0.25)"),
                    boxShadow: theme === "dark"
                      ? "inset -8px -8px 20px rgba(0,0,0,0.5), inset 6px 6px 16px rgba(255,255,255,0.05), 0 0 24px rgba(212,175,55,0.4), 0 0 48px rgba(212,175,55,0.2)"
                      : "inset -8px -8px 20px rgba(0,0,0,0.4), inset 6px 6px 16px rgba(255,255,255,0.08), 0 0 28px rgba(212,175,55,0.45), 0 0 56px rgba(212,175,55,0.25)",
                    position: "relative",
                  }}>
                    <div style={{
                      width: 90,
                      height: 70,
                      minHeight: 48,
                      borderRadius: 12,
                      background: theme === "dark" ? "#0a0a0a" : "#111",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid " + t.glass.border,
                    }}>
                      {eightBallShaking ? (
                        <span style={{ fontSize: 10, color: t.glass.textTertiary }}>...</span>
                      ) : eightBallAnswer ? (
                        <span style={{
                          fontSize: Math.min(11, 80 / (eightBallAnswer.length || 1)),
                          fontWeight: 800,
                          textAlign: "center",
                          color: eightBallAnswer === "Ape in Bitch" || eightBallAnswer === "Floor it" ? t.glass.gold : t.glass.text,
                          lineHeight: 1.2,
                          padding: "0 6px",
                        }}>{eightBallAnswer}</span>
                      ) : (
                        <span style={{ fontSize: 9, color: t.glass.textTertiary }}>Shake me</span>
                      )}
                    </div>
                    <div style={{ position: "absolute", bottom: 20, fontSize: 14, fontWeight: 800, color: t.glass.textTertiary, opacity: 0.6 }}>8</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === "dex" && (
            <>
              {/* ═══ MOBILE: Header + EZ Peeze only ═══ */}
              {isMobile ? (
                <div className="dex-mobile-layout" style={{
                  display: "flex", flexDirection: "column", gap: 0, padding: "8px 12px 24px",
                  minHeight: "calc(100vh - 100px)", paddingBottom: 24,
                }}>
                  {/* Compact stats row: 24h Change, High, Low, Vol */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "12px 0 16px",
                    borderBottom: "1px solid " + t.glass.border,
                  }}>
                    {(() => {
                      const mid = orderBook.midPrice || 0.0847;
                      const ss = sessionStats.current;
                      const changePercent = ss.startPrice > 0 ? ((mid - ss.startPrice) / ss.startPrice * 100) : 0;
                      const totalVol = trades.reduce((s, t) => s + (t.amount || 0), 0);
                      const totalVolUSD = trades.reduce((s, t) => s + (t.amount || 0) * (t.price || mid), 0);
                      return [
                        { label: "24h Chg", value: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`, color: changePercent >= 0 ? t.glass.green : t.glass.red },
                        { label: "High", value: ss.initialized ? ss.high.toFixed(4) : "—" },
                        { label: "Low", value: ss.initialized && ss.low !== Infinity ? ss.low.toFixed(4) : "—" },
                        { label: "Vol", value: totalVolUSD >= 1000 ? `$${(totalVolUSD / 1000).toFixed(1)}K` : `$${totalVolUSD.toFixed(0)}` },
                      ];
                    })().map((s, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: s.color || t.glass.text }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* EZ Peeze — main action on mobile */}
                  <div style={{ ...t.panel, padding: 16, borderRadius: 16, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: t.glass.textTertiary, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current Price</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "'SF Mono', monospace" }}>
                        {nonEvmPair && (nonEvmPriceFailed || orderBook.midPrice === 0) ? "—" : (orderBook.midPrice != null && orderBook.midPrice > 0 ? orderBook.midPrice.toFixed(4) : (orderBook.midPrice?.toFixed(4) ?? "0.0847"))}
                      </div>
                      <div style={{ fontSize: 12, color: t.glass.textTertiary }}>{currentPairInfo.baseToken || "PRE"} / {currentPairInfo.quoteToken || "mUSDC"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 6, textTransform: "uppercase" }}>Timeframe</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[{ label: "30s", val: 30 }, { label: "1m", val: 60 }, { label: "2m", val: 120 }, { label: "5m", val: 300 }].map((tf) => (
                          <button key={tf.val} onClick={() => setBetTimeframe(tf.val)} style={{
                            flex: 1, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                            background: betTimeframe === tf.val ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                            color: betTimeframe === tf.val ? "#fff" : t.glass.textTertiary,
                          }}>{tf.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 6, textTransform: "uppercase" }}>Stake (PRE)</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {[50, 100, 500, 1000].map(a => (
                          <button key={a} onClick={() => setBetAmount(String(a))} style={{
                            flex: 1, minWidth: 70, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                            background: betAmount === String(a) ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                            color: betAmount === String(a) ? "#fff" : t.glass.textTertiary,
                          }}>{a}</button>
                        ))}
                      </div>
                      <div style={{ ...t.panelInner, marginTop: 8, display: "flex", alignItems: "center", borderRadius: 12, padding: "12px 14px" }}>
                        <input type="text" value={betAmount} onChange={e => setBetAmount(e.target.value)} placeholder="Custom" style={{
                          flex: 1, padding: 0, background: "none", border: "none", color: "#fff", fontSize: 16, fontWeight: 600, outline: "none", fontFamily: "'SF Mono', monospace",
                        }} />
                        <span style={{ fontSize: 12, color: t.glass.textTertiary, marginLeft: 8 }}>PRE</span>
                      </div>
                    </div>
                    {betError && (
                      <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,69,58,0.15)", fontSize: 12, color: t.glass.red }}>{betError}</div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                      <button onClick={() => placeBet("up")} disabled={betPlacing || !ezPezeConfig?.escrowAddress} style={{
                        padding: "24px 16px", borderRadius: 20, border: "2px solid rgba(50,215,75,0.4)", cursor: betPlacing || !ezPezeConfig?.escrowAddress ? "not-allowed" : "pointer",
                        background: "linear-gradient(135deg, rgba(50,215,75,0.2), rgba(50,215,75,0.08))",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        opacity: betPlacing || !ezPezeConfig?.escrowAddress ? 0.6 : 1,
                      }}>
                        <span style={{ fontSize: 36 }}>📈</span>
                        <span style={{ fontSize: 22, fontWeight: 800, color: t.glass.green }}>UP</span>
                        <span style={{ fontSize: 12, color: t.glass.textTertiary }}>Price goes higher</span>
                      </button>
                      <button onClick={() => placeBet("down")} disabled={betPlacing || !ezPezeConfig?.escrowAddress} style={{
                        padding: "24px 16px", borderRadius: 20, border: "2px solid rgba(255,69,58,0.4)", cursor: betPlacing || !ezPezeConfig?.escrowAddress ? "not-allowed" : "pointer",
                        background: "linear-gradient(135deg, rgba(255,69,58,0.2), rgba(255,69,58,0.08))",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        opacity: betPlacing || !ezPezeConfig?.escrowAddress ? 0.6 : 1,
                      }}>
                        <span style={{ fontSize: 36 }}>📉</span>
                        <span style={{ fontSize: 22, fontWeight: 800, color: t.glass.red }}>DOWN</span>
                        <span style={{ fontSize: 12, color: t.glass.textTertiary }}>Price goes lower</span>
                      </button>
                    </div>
                    {activeBets.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 6, textTransform: "uppercase" }}>Active Bets</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {activeBets.slice(0, 3).map(bet => (
                            <div key={bet.id} style={{
                              padding: "10px 12px", borderRadius: 12,
                              background: "rgba(255,255,255,0.04)", border: "1px solid " + t.glass.border,
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                            }}>
                              <span style={{ fontSize: 14 }}>{bet.direction === "up" ? "📈" : "📉"}</span>
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{bet.direction.toUpperCase()} · {bet.amount} PRE</span>
                              {bet.status === "active" ? (
                                <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'SF Mono', monospace" }}>
                                  {Math.floor(bet.remaining / 60)}:{(bet.remaining % 60).toString().padStart(2, "0")}
                                </span>
                              ) : (
                                <span style={{ fontWeight: 700, color: bet.status === "won" ? t.glass.green : t.glass.red }}>{bet.status === "won" ? "WON" : "LOST"}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
              /* ═══ DESKTOP: MAIN GRID ═══ */
              <div className="dex-main-grid" style={{
                display: "grid", gridTemplateColumns: isZeroXPair ? "380px 1fr 340px" : "280px 1fr 340px",
                gap: 12, padding: 12, height: "calc(100vh - 120px)", minHeight: 600,
              }}>

                {/* ─── LEFT: ORDER BOOK (native) or NEWS + TECHNICAL (0x) ─── */}
                {isZeroXPair ? (
                  <div className="dex-left-panel dex-zerox-left" style={{ ...t.panel, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ display: "flex", gap: 6, padding: "12px 12px 6px", background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(212,175,55,0.06)", borderRadius: "100px", margin: "10px 10px 0" }}>
                      {["news", "technical"].map((tab) => (
                        <button key={tab} onClick={() => setZeroxLeftTab(tab)} style={{
                          flex: 1, padding: "6px 0", borderRadius: "100px", border: "none", cursor: "pointer",
                          fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                          background: zeroxLeftTab === tab ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)") : "transparent",
                          color: zeroxLeftTab === tab ? t.glass.text : t.glass.textTertiary, transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                          boxShadow: zeroxLeftTab === tab ? (theme === "dark" ? "none" : "0 2px 8px rgba(212,175,55,0.15)") : "none",
                        }}>
                          {tab === "news" ? "News" : "Technical"}
                        </button>
                      ))}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden", padding: 8, minHeight: 200, minWidth: 0, display: "flex", flexDirection: "column" }}>
                      {zeroxLeftTab === "news" && (
                        <CryptoNews theme={theme} ticker={chartPair?.baseToken || "ETH"} />
                      )}
                      {zeroxLeftTab === "technical" && (
                        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                          <TradingViewTechnical symbol={chartPair?.tradingViewSymbol || "BINANCE:ETHUSDC"} theme={theme} />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="dex-left-panel" style={{ ...t.panel, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ display: "flex", gap: 6, padding: "12px 12px 6px", background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(212,175,55,0.06)", borderRadius: "100px", margin: "10px 10px 0" }}>
                      {["orderbook", "trades"].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                          flex: 1, padding: "6px 0", borderRadius: "100px", border: "none", cursor: "pointer",
                          fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                          background: activeTab === tab ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)") : "transparent",
                          color: activeTab === tab ? t.glass.text : t.glass.textTertiary, transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                          boxShadow: activeTab === tab ? (theme === "dark" ? "none" : "0 2px 8px rgba(212,175,55,0.15)") : "none",
                        }}>
                          {tab === "orderbook" ? "Book" : "Trades"}
                        </button>
                      ))}

                    </div>


                    {activeTab === "orderbook" && (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                          padding: "8px 10px 4px", fontSize: 9, color: t.glass.textTertiary, letterSpacing: "0.04em",
                        }}>
                          <span>Price</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Total</span>
                        </div>

                        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {(orderBook.asks || []).slice(0, 24).reverse().map((ask, i) => (
                            <div key={i} onClick={() => setPrice(ask.price.toFixed(4))} style={{
                              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                              padding: "2.5px 12px", fontSize: 10.5, fontFamily: "'SF Mono', 'Menlo', monospace",
                              position: "relative", cursor: "pointer", margin: "1px 0",
                            }}>
                              <div style={{
                                position: "absolute", right: 6, top: 1, bottom: 1, borderRadius: "100px",
                                width: `${(ask.total / maxAsk) * 100}%`, background: t.orderBook.askBar, transition: "width 0.5s",
                              }} />
                              <span style={{ color: t.glass.red, position: "relative", fontWeight: 600 }}>{ask.price.toFixed(4)}</span>
                              <span style={{ textAlign: "right", position: "relative", color: t.glass.textSecondary }}>{ask.amount.toLocaleString()}</span>
                              <span style={{ textAlign: "right", position: "relative", color: t.glass.textTertiary }}>{ask.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>


                        <div style={{
                          padding: "7px 10px", borderTop: "1px solid " + t.glass.border,
                          borderBottom: "1px solid " + t.glass.border,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: t.glass.green, fontFamily: "'SF Mono', monospace" }}>
                            {orderBook.midPrice?.toFixed(4) ?? "0.0000"}
                          </span>
                          <span style={{ fontSize: 10, color: t.glass.textTertiary }}>≈ ${orderBook.midPrice?.toFixed(4) ?? "0.0000"}</span>
                          <span style={{ fontSize: 9, color: t.glass.green, marginLeft: "auto" }}>▲</span>
                        </div>

                        <div style={{ flex: 1, overflow: "hidden" }}>
                          {(orderBook.bids || []).slice(0, 24).map((bid, i) => (
                            <div key={i} onClick={() => setPrice(bid.price.toFixed(4))} style={{
                              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                              padding: "2.5px 12px", fontSize: 10.5, fontFamily: "'SF Mono', 'Menlo', monospace",
                              position: "relative", cursor: "pointer", margin: "1px 0",
                            }}>
                              <div style={{
                                position: "absolute", right: 6, top: 1, bottom: 1, borderRadius: "100px",
                                width: `${(bid.total / maxBid) * 100}%`, background: t.orderBook.bidBar, transition: "width 0.5s",
                              }} />
                              <span style={{ color: t.glass.green, position: "relative", fontWeight: 600 }}>{bid.price.toFixed(4)}</span>
                              <span style={{ textAlign: "right", position: "relative", color: t.glass.textSecondary }}>{bid.amount.toLocaleString()}</span>
                              <span style={{ textAlign: "right", position: "relative", color: t.glass.textTertiary }}>{bid.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}


                    {activeTab === "trades" && (
                      <div style={{ flex: 1, overflow: "auto", padding: "0 0 8px" }}>
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                          padding: "8px 10px 4px", fontSize: 9, color: t.glass.textTertiary, letterSpacing: "0.04em",
                          position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)",
                        }}>
                          <span>Price</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Time</span>
                        </div>
                        {trades.map((tr, i) => (
                          <div key={i} style={{
                            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                            padding: "2.5px 10px", fontSize: 10.5, fontFamily: "'SF Mono', monospace",
                          }}>
                            <span style={{ color: tr.side === "buy" ? t.glass.green : t.glass.red, fontWeight: 500 }}>{tr.price.toFixed(4)}</span>
                            <span style={{ textAlign: "right", color: t.glass.textSecondary }}>{tr.amount.toLocaleString()}</span>
                            <span style={{ textAlign: "right", color: t.glass.textTertiary }}>{(tr.time || tr.timestamp) ? new Date(tr.time || tr.timestamp).toLocaleTimeString() : "—"}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "depth" && (
                      <div style={{ flex: 1, padding: 8 }}><DepthChart depthData={depthData} /></div>
                    )}
                  </div>
                )}

                {/* ─── CENTER: CHART + ORDERS ─── */}
                <div className="dex-center-col" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {isZeroXPair ? (
                    /* TradingView chart for 0x pairs */
                    <div className="dex-center-row" style={{ display: "flex", flex: 1, gap: 12 }}>
                      <div className="dex-chart-panel" style={{ ...t.panel, flex: 1, position: "relative", overflow: "hidden" }}>
                        <TradingViewChart symbol={chartPair?.tradingViewSymbol || "BINANCE:ETHUSDC"} theme={theme} />
                      </div>
                    </div>
                  ) : (
                    <div className="dex-center-row" style={{ display: "flex", flex: 1, gap: 12 }}>
                      {/* ─── CHART TOOLS ─── */}
                      <div className="dex-chart-tools" style={{
                        ...t.panel, width: 42, display: "flex", flexDirection: "column", alignItems: "center",
                        gap: 16, padding: "16px 0", height: "100%"
                      }}>
                        {["⊹", "↗", "📏", "▭", "T", "⌘", "🎨", "🗑️", "🖌️", "⬡", "🔒"].map((tool, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (tool === "🗑️") setChartDrawings([]);
                              else setActiveDrawingTool(activeDrawingTool === tool ? null : tool);
                            }}
                            style={{
                              background: activeDrawingTool === tool ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(212,175,55,0.2)") : "transparent",
                              border: "none", color: (activeDrawingTool === tool || tool === "🗑️" || tool === "🔒") ? t.glass.text : t.glass.textTertiary,
                              fontSize: 16, cursor: "pointer", width: 28, height: 28,
                              borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "0.2s",
                              boxShadow: activeDrawingTool === tool && theme !== "dark" ? "0 4px 12px rgba(212,175,55,0.2)" : "none"
                            }}
                          >{tool}</button>
                        ))}
                      </div>


                      <div className="dex-chart-panel" style={{ ...t.panel, flex: 1, position: "relative", overflow: "hidden" }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}>
                          {["1m", "5m", "15m", "1H", "4H", "1D", "1W"].map((tf) => (
                            <button key={tf} onClick={() => setChartTf(tf)} style={{
                              padding: "3px 9px", borderRadius: 5, border: "none", cursor: "pointer",
                              fontSize: 10, fontWeight: 500,
                              background: chartTf === tf ? (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(212,175,55,0.15)") : "transparent",
                              color: chartTf === tf ? t.glass.text : t.glass.textTertiary,
                              transition: "all 0.2s",
                            }}>{tf}</button>
                          ))}
                        </div>
                        <div style={{ height: "calc(100% - 42px)" }}>
                          <MiniChart
                            activeTool={activeDrawingTool}
                            drawings={chartDrawings}
                            onAddDrawing={(d) => setChartDrawings([...chartDrawings, d])}
                            midPrice={orderBook.midPrice}
                            trades={trades}
                            chartTf={chartTf}
                          />
                        </div>
                        <div style={{
                          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                          fontSize: 60, fontWeight: 900, color: "rgba(212,175,55,0.06)",
                          letterSpacing: "0.2em", pointerEvents: "none"
                        }}>OMEGA</div>
                      </div>

                    </div>
                  )}


                  <div className="dex-bottom-panel" style={{ ...t.panel, flex: "none", height: 220, minHeight: 220, overflow: "hidden" }}>
                    <div className="dex-bottom-tabs" style={{
                      display: "flex", alignItems: "center", padding: "0 14px",
                      borderBottom: "1px solid " + t.glass.border, overflowX: "auto", overflowY: "hidden"
                    }}>
                      {["Balances", "Positions", "Orders", "TWAP", "Trades", "Funding", "History"].map(tab => (
                        <div
                          key={tab}
                          onClick={() => setBottomTab(tab.toLowerCase())}
                          style={{
                            padding: "12px 16px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                            color: bottomTab === tab.toLowerCase() ? t.glass.text : t.glass.textTertiary,
                            borderBottom: bottomTab === tab.toLowerCase() ? "2px solid " + t.glass.gold : "none",
                            transition: "0.2s"
                          }}
                        >
                          {tab}
                          {tab === "Orders" && openOrders.length > 0 && (
                            <span style={{ marginLeft: 6, opacity: 0.5 }}>{openOrders.length}</span>
                          )}
                          {tab === "History" && historyBets.length > 0 && (
                            <span style={{ marginLeft: 6, opacity: 0.5 }}>{historyBets.length}</span>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => setBottomTab("depth")}
                        style={{
                          marginLeft: "auto", padding: "4px 12px", borderRadius: 100,
                          border: "1px solid " + t.glass.border, background: theme === "dark" ? "rgba(212,175,55,0.05)" : "rgba(0,0,0,0.04)",
                          color: t.glass.textSecondary, fontSize: 9, fontWeight: 600, cursor: "pointer"
                        }}
                      >Market Depth</button>
                    </div>

                    <div style={{ overflow: "auto", height: "calc(100% - 40px)", padding: "12px 20px" }}>
                      {bottomTab === "orders" ? (
                        <div className="dex-orders-table" style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                            <thead>
                              <tr style={{ color: t.glass.textTertiary, fontSize: 9, letterSpacing: "0.04em" }}>
                                {["Side", "Price", "Amount", "Filled", "Token", "Chain", "Time", "Action"].map((h) => (
                                  <th key={h} style={{ padding: "5px 10px", textAlign: "left", fontWeight: 500 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {openOrders.map((order) => (
                                <tr key={order.id} style={{ borderTop: "1px solid " + t.glass.border }}>
                                  <td style={{ padding: "7px 10px", fontWeight: 600, color: order.side === "buy" ? t.glass.green : t.glass.red }}>{order.side.toUpperCase()}</td>
                                  <td style={{ padding: "7px 10px", fontFamily: "'SF Mono', monospace" }}>{order.price.toFixed(4)}</td>
                                  <td style={{ padding: "7px 10px", fontFamily: "'SF Mono', monospace" }}>{order.amount.toLocaleString()}</td>
                                  <td style={{ padding: "7px 10px" }}>{order.amount ? Math.round((order.filled || 0) / order.amount * 100) : 0}%</td>
                                  <td style={{ padding: "7px 10px" }}>{order.token || "USDT"}</td>
                                  <td style={{ padding: "7px 10px" }}>{order.chain || "—"}</td>
                                  <td style={{ padding: "7px 10px" }}>{order.timestamp ? new Date(order.timestamp).toLocaleTimeString() : "—"}</td>
                                  <td style={{ padding: "7px 10px" }}>
                                    <button onClick={() => handleCancelOrder(order.id)} style={{
                                      background: "none", border: "1px solid " + t.glass.border,
                                      color: t.glass.text, borderRadius: 4, padding: "2px 8px", cursor: "pointer"
                                    }}>Cancel</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : bottomTab === "depth" ? (
                        <div style={{ height: "100%" }}><DepthChart depthData={depthData} /></div>
                      ) : bottomTab === "history" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {historyLoading ? (
                            <div style={{ textAlign: "center", padding: 24, color: t.glass.textTertiary, fontSize: 11 }}>Loading…</div>
                          ) : historyBets.length === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, opacity: 0.5 }}>
                              <div style={{ fontSize: 24, marginBottom: 8 }}>∅</div>
                              <div style={{ fontSize: 11 }}>No history yet. EZ PEZE bets will appear here.</div>
                            </div>
                          ) : (
                            historyBets.map((bet) => {
                              const isActive = bet.status === "active";
                              const won = bet.status === "won";
                              const color = isActive ? t.glass.textSecondary : won ? t.glass.green : t.glass.red;
                              const ts = bet.placedAt || bet.resolvedAt;
                              const timeStr = ts ? new Date(ts).toLocaleString() : "—";
                              return (
                                <div key={bet.id} style={{
                                  padding: "10px 12px", borderRadius: 10,
                                  background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                                  border: "1px solid " + t.glass.border,
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 4 }}>
                                    <div>
                                      <span style={{ fontSize: 10, color: t.glass.textTertiary }}>EZ PEZE</span>
                                      <div style={{ fontSize: 12, fontWeight: 700 }}>
                                        <span style={{ color }}>{bet.direction?.toUpperCase()}</span>
                                        {" · "}
                                        <span style={{ fontFamily: "'SF Mono', monospace" }}>{bet.amount} PRE</span>
                                      </div>
                                      <div style={{ fontSize: 9, color: t.glass.textTertiary }}>
                                        Entry {bet.entryPrice?.toFixed(4)}
                                        {bet.exitPrice != null && ` → ${bet.exitPrice.toFixed(4)}`}
                                      </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color }}>
                                        {isActive ? "Active" : won ? "Won +" + (bet.amount * 0.5).toFixed(0) + " PRE" : "Lost"}
                                      </div>
                                      <div style={{ fontSize: 9, color: t.glass.textTertiary }}>{timeStr}</div>
                                      {bet.txHash && (
                                        <a href={`https://0x4e4542bc.explorer.aurora-cloud.dev/tx/${bet.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: t.glass.gold }}>View Tx</a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div style={{
                          height: "100%", display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", opacity: 0.4
                        }}>
                          <div style={{ fontSize: 24, marginBottom: 8 }}>∅</div>
                          <div style={{ fontSize: 11 }}>No {bottomTab} recorded yet</div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* ─── RIGHT: ORDER FORM ─── */}
                <div className="dex-right-panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {!isZeroXPair && (
                    <div className="dex-cross-chain" style={{ ...t.panel, padding: 14 }}>
                      <div style={{ fontSize: 9, color: t.glass.textTertiary, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Cross-Chain Routing</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", ...t.panelInner }}>
                        {/* SOURCE */}
                        {side === "buy" ? (
                          <div onClick={() => setShowChainModal(true)} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", borderRadius: 14,
                            cursor: "pointer", transition: "all 0.2s", background: "rgba(255,255,255,0.03)",
                            border: "1px solid " + t.glass.border,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                              boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                            }}>{CHAINS.find((c) => c.id === selectedChain)?.icon}</div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                                {CHAINS.find((c) => c.id === selectedChain)?.name}
                                <span style={{ fontSize: 8, opacity: 0.4 }}>▼</span>
                              </div>
                              <div style={{ fontSize: 8, color: t.glass.textTertiary, textTransform: "uppercase" }}>Source</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", borderRadius: 14,
                            background: "rgba(255,255,255,0.03)", border: "1px solid " + t.glass.border,
                          }}>
                            <OmegaLogo width={28} height={28} theme={theme} style={{ borderRadius: 8, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }} />
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800 }}>Omega</div>
                              <div style={{ fontSize: 8, color: t.glass.textTertiary, textTransform: "uppercase" }}>Source</div>
                            </div>
                          </div>
                        )}

                        <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.25)", position: "relative" }}>
                          <div style={{
                            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                            fontSize: 9, background: t.glass.gold, borderRadius: 8, padding: "1px 8px",
                            color: "#fff", fontWeight: 700,
                          }}>→</div>
                        </div>

                        {/* DESTINATION */}
                        {side === "buy" ? (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", borderRadius: 14,
                            background: "rgba(255,255,255,0.03)", border: "1px solid " + t.glass.border,
                          }}>
                            <OmegaLogo width={28} height={28} theme={theme} style={{ borderRadius: 8, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }} />
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800 }}>Omega</div>
                              <div style={{ fontSize: 8, color: t.glass.textTertiary, textTransform: "uppercase" }}>Destination</div>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => setShowChainModal(true)} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", borderRadius: 14,
                            cursor: "pointer", transition: "all 0.2s", background: "rgba(255,255,255,0.03)",
                            border: "1px solid " + t.glass.border,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                              boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                            }}>{CHAINS.find((c) => c.id === selectedChain)?.icon}</div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                                {CHAINS.find((c) => c.id === selectedChain)?.name}
                                <span style={{ fontSize: 8, opacity: 0.4 }}>▼</span>
                              </div>
                              <div style={{ fontSize: 8, color: t.glass.textTertiary, textTransform: "uppercase" }}>Destination</div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  <div className="dex-order-form" style={{ ...t.panel, padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
                    <div className="form-mode-tabs" style={{ display: "flex", gap: 4, marginBottom: 16, padding: 3, borderRadius: 10, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(212,175,55,0.06)" }}>
                      {(isZeroXPair
                        ? (isEvmPair ? [{ key: "swap", label: "Swap" }, { key: "ezpeze", label: "EZ Peeze" }] : [{ key: "ezpeze", label: "EZ Peeze" }])
                        : [{ key: "pro", label: "Pro" }, { key: "easy", label: "Easy" }, { key: "ezpeze", label: "EZ Peeze" }]
                      ).map(m => (
                        <button key={m.key} onClick={() => setFormMode(m.key)} style={{
                          flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
                          fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                          background: formMode === m.key ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(212,175,55,0.2)") : "transparent",
                          color: formMode === m.key ? t.glass.text : t.glass.textTertiary,
                          boxShadow: formMode === m.key ? (theme === "dark" ? "none" : "0 2px 8px rgba(212,175,55,0.2)") : "none",
                          transition: "all 0.3s",
                        }}>{m.label}</button>
                      ))}
                    </div>

                    {(formMode === "pro" || (isZeroXPair && formMode === "swap")) ? (
                      <>
                        <div className="dex-buy-sell-toggle" style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 4,
                          borderRadius: "100px", background: "rgba(212,175,55,0.06)", marginBottom: 18,
                        }}>
                          {["buy", "sell"].map((s) => (
                            <button key={s} onClick={() => { setSide(s); setPriceManuallyEdited(false); }} style={{
                              padding: "12px 0", borderRadius: "100px", border: "none", cursor: "pointer",
                              fontSize: 13, fontWeight: 700, textTransform: "uppercase", transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                              letterSpacing: "0.05em",
                              ...(side === s ? {
                                background: s === "buy" ? t.glass.green : t.glass.red,
                                color: "#000",
                                boxShadow: s === "buy" ? `0 6px 20px rgba(22,163,74,0.35)` : `0 6px 20px rgba(220,38,38,0.35)`,
                                transform: "scale(1.02)",
                              } : {
                                background: "transparent", color: t.glass.textTertiary,
                              }),
                            }}>{s}</button>
                          ))}
                        </div>

                        {!isZeroXPair && (
                          <div style={{
                            display: "flex", gap: 4, marginBottom: 18, padding: 4, borderRadius: "100px",
                            background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(212,175,55,0.06)",
                          }}>
                            {["limit", "market"].map((orderT) => (
                              <button key={orderT} onClick={() => setOrderType(orderT)} style={{
                                flex: 1, padding: "7px 0", borderRadius: "100px", border: "none", cursor: "pointer",
                                fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                                background: orderType === orderT ? (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(212,175,55,0.18)") : "transparent",
                                color: orderType === orderT ? t.glass.text : t.glass.textTertiary,
                                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                              }}>{orderT}</button>
                            ))}
                          </div>
                        )}

                        {!isZeroXPair && (
                          <div className="dex-pay-with" style={{ marginBottom: 12 }}>

                            <div style={{ fontSize: 10, color: t.glass.textTertiary, marginBottom: 6 }}>Pay With</div>
                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                              {TOKENS[selectedChain]?.map((token) => (
                                <button key={token} onClick={() => setSelectedToken(token)} style={{
                                  padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                                  fontSize: 10, fontWeight: 600, transition: "all 0.2s",
                                  background: selectedToken === token ? (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(212,175,55,0.15)") : (theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(212,175,55,0.05)"),
                                  color: selectedToken === token ? t.glass.text : t.glass.textTertiary,
                                  border: "1px solid " + (selectedToken === token ? (theme === "dark" ? "rgba(212,175,55,0.4)" : "rgba(0,0,0,0.25)") : t.glass.border),
                                }}>{token}</button>
                              ))}
                            </div>
                          </div>
                        )}

                        {!isZeroXPair && orderType === "limit" && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.glass.textTertiary, marginBottom: 5 }}>
                              <span>Price</span><span>mUSDC</span>
                            </div>
                            <div className="order-price-row" style={{ ...t.panelInner, display: "flex", alignItems: "center", overflow: "hidden" }}>
                              <button type="button" className="order-input-step" onClick={() => { setPrice((p) => (parseFloat(p) - 0.0001).toFixed(4)); setPriceManuallyEdited(true); }} style={{
                                width: 44, minWidth: 44, height: 44, border: "none", background: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(212,175,55,0.04)",
                                color: t.glass.textSecondary, cursor: "pointer", fontSize: 20, fontWeight: 300, flexShrink: 0,
                              }}>−</button>
                              <input type="text" value={price} onChange={(e) => { setPrice(e.target.value); setPriceManuallyEdited(true); }} style={{
                                flex: 1, padding: "9px 6px", background: "none", border: "none",
                                color: t.glass.text, fontSize: 13, fontWeight: 600, textAlign: "center",
                                fontFamily: "'SF Mono', monospace", outline: "none",
                              }} />
                              <button type="button" className="order-input-step" onClick={() => { setPrice((p) => (parseFloat(p) + 0.0001).toFixed(4)); setPriceManuallyEdited(true); }} style={{
                                width: 44, minWidth: 44, height: 44, border: "none", background: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(212,175,55,0.06)",
                                color: t.glass.textSecondary, cursor: "pointer", fontSize: 20, fontWeight: 300, flexShrink: 0,
                              }}>+</button>
                            </div>
                          </div>
                        )}

                        <div className="order-amount-row" style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.glass.textTertiary, marginBottom: 5 }}>
                            <span>Amount</span><span>{currentPairInfo.baseToken || "PRE"}</span>
                          </div>
                          <div style={{ ...t.panelInner, display: "flex", alignItems: "center", overflow: "hidden" }}>
                            <button type="button" className="order-input-step" onClick={() => { const a = parseFloat(amount) || 0; setAmount(Math.max(0, a - 1).toString()); }} style={{
                              width: 44, minWidth: 44, height: 44, border: "none", background: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(212,175,55,0.04)",
                              color: t.glass.textSecondary, cursor: "pointer", fontSize: 20, fontWeight: 300, flexShrink: 0,
                            }}>−</button>
                            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{
                              flex: 1, padding: "9px 8px", background: "none", border: "none",
                              color: t.glass.text, fontSize: 15, fontWeight: 600, fontFamily: "'SF Mono', monospace", outline: "none", textAlign: "center", minWidth: 0,
                            }} />
                            <button type="button" className="order-input-step" onClick={() => { const a = parseFloat(amount) || 0; setAmount((a + 1).toString()); }} style={{
                              width: 44, minWidth: 44, height: 44, border: "none", background: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(212,175,55,0.06)",
                              color: t.glass.textSecondary, cursor: "pointer", fontSize: 20, fontWeight: 300, flexShrink: 0,
                            }}>+</button>
                          </div>
                        </div>

                        <div className="dex-quantity-slider" style={{ marginBottom: 14, padding: "0 2px" }}>
                          <input type="range" min="0" max="100" value={sliderValue} onChange={(e) => setSliderValue(e.target.value)} style={{
                            width: "100%", height: 3, appearance: "none",
                            background: `linear-gradient(to right, ${side === "buy" ? t.glass.green : t.glass.red} 0%, ${side === "buy" ? t.glass.green : t.glass.red} ${sliderValue}%, rgba(212,175,55,0.15) ${sliderValue}%, rgba(212,175,55,0.15) 100%)`,
                            borderRadius: 3, outline: "none", cursor: "pointer",
                          }} />
                          <div className="slider-percent-markers" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.glass.textTertiary, marginTop: 4 }}>
                            {["0%", "25%", "50%", "75%", "100%"].map((v) => (
                              <span key={v} style={{ cursor: "pointer", padding: "4px 2px", minWidth: 28, textAlign: "center" }} onClick={() => setSliderValue(parseInt(v))}>{v}</span>
                            ))}
                          </div>
                        </div>

                        <div style={{ ...t.panelInner, padding: "9px 12px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, color: t.glass.textTertiary }}>Total</span>
                          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'SF Mono', monospace" }}>{total} {currentPairInfo.quoteToken || "mUSDC"}</span>
                        </div>

                        {orderError && <div style={{ fontSize: 11, color: t.glass.red, marginBottom: 8 }}>{orderError}</div>}
                        <button
                          className="dex-order-submit-btn"
                          onClick={handlePlaceOrder}
                          disabled={orderLoading}
                          style={{
                            width: "100%", padding: "16px 0", borderRadius: "100px", border: "none",
                            cursor: orderLoading ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700,
                            letterSpacing: "0.02em", transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)", opacity: orderLoading ? 0.5 : 1,
                            textTransform: "uppercase",
                            ...(side === "buy" ? {
                              background: t.glass.green, color: "#000",
                              boxShadow: "0 10px 30px rgba(50,215,75,0.3)",
                            } : {
                              background: t.glass.red, color: "#000",
                              boxShadow: "0 10px 30px rgba(255,69,58,0.3)",
                            }),
                          }}
                        >
                          {!connected ? "Connect Wallet" : orderLoading ? (isZeroXPair ? "Swapping..." : "Placing...") : `${side.toUpperCase()} ${currentPairInfo.baseToken || "PRE"}`}
                        </button>

                        {connected && !isZeroXPair && (
                          <div style={{ marginTop: 10, padding: "9px 0", borderTop: "1px solid " + t.glass.border, fontSize: 10, color: t.glass.textTertiary }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span>Available {selectedToken}</span><span style={{ color: t.glass.textSecondary }}>{selectedChain === 1313161916 ? (balances[selectedToken] || "0.00") : "1,234.56"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Available PRE</span><span style={{ color: t.glass.textSecondary }}>{selectedChain === 1313161916 ? (balances["PRE"] || "0.00") : "50,000.00"}</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (formMode === "easy" && !isZeroXPair) ? (

                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>

                        {/* EASY MODE UI */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 12, padding: "0 4px" }}>
                          {["swap", "limit", "buy", "sell"].map((tab) => (
                            <div key={tab} style={{
                              fontSize: 13, fontWeight: (tab === "buy" || tab === "sell" ? side === tab : easyTab === tab) ? 800 : 500,
                              color: (tab === "buy" || tab === "sell" ? side === tab : easyTab === tab) ? t.glass.text : t.glass.textTertiary,
                              cursor: "pointer", paddingBottom: 4,
                              borderBottom: (tab === "buy" || tab === "sell" ? side === tab : easyTab === tab) ? "2px solid " + t.glass.gold : "none"
                            }} onClick={() => {
                              if (tab === "buy" || tab === "sell") { setSide(tab); setEasyTab(tab); }
                              if (tab === "limit" || tab === "swap") { setOrderType(tab === "limit" ? "limit" : "market"); setEasyTab(tab); }
                            }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</div>
                          ))}
                        </div>

                        <div style={{ ...t.panelInner, padding: 20, borderRadius: 24, marginBottom: 4 }}>
                          <div style={{ fontSize: 13, color: t.glass.textSecondary, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            When 1 <OmegaLogo width={18} height={18} theme={theme} /> <strong>PRE</strong> is worth
                          </div>
                          <div style={{ fontSize: 36, fontWeight: 800, color: t.glass.text, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            {price}
                            <span style={{ fontSize: 14, color: t.glass.textTertiary, display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 18, height: 18, background: "rgba(255,255,255,0.1)", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>$</span>
                              {selectedToken}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            {["Market", "+1%", "+5%", "+10%"].map(v => (
                              <button key={v} onClick={() => {
                                if (v === "Market") setOrderType("market");
                                else {
                                  const pct = parseInt(v.replace(/\D/g, "")) || 0;
                                  const base = parseFloat(price) || orderBook.midPrice || 0.0847;
                                  setPrice((base * (1 + pct / 100)).toFixed(4));
                                }
                              }} style={{
                                padding: "6px 12px", borderRadius: 100, border: "none", background: "rgba(255,255,255,0.06)",
                                color: t.glass.textSecondary, fontSize: 11, fontWeight: 600, cursor: "pointer"
                              }}>{v}</button>
                            ))}
                          </div>
                        </div>

                        <div style={{ position: "relative" }}>
                          <div style={{ ...t.panelInner, padding: 20, borderRadius: 24, marginBottom: 6 }}>
                            <div style={{ fontSize: 12, color: t.glass.textTertiary, marginBottom: 8 }}>{side === "buy" ? "Pay" : "Sell"}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={{
                                background: "none", border: "none", color: t.glass.text, fontSize: 28, fontWeight: 700, width: "120px", outline: "none"
                              }} />
                              <div style={{
                                background: "rgba(255,255,255,0.06)", padding: "6px 12px", borderRadius: 100,
                                display: "flex", alignItems: "center", gap: 8, cursor: "pointer"
                              }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{side === "buy" ? "mUSDC" : "PRE"}</span>
                                <span style={{ fontSize: 8, opacity: 0.5 }}>▼</span>
                              </div>
                            </div>
                          </div>

                          <div style={{
                            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                            width: 32, height: 32, background: "#FFFEF9", border: "4px solid #FFF9E6",
                            borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                            zIndex: 2, cursor: "pointer", color: t.glass.textTertiary
                          }} onClick={() => setSide(side === "buy" ? "sell" : "buy")}>↓</div>

                          <div style={{ ...t.panelInner, padding: 20, borderRadius: 24 }}>
                            <div style={{ fontSize: 12, color: t.glass.textTertiary, marginBottom: 8 }}>{side === "buy" ? "Receive" : "Buy"}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontSize: 28, fontWeight: 700, color: t.glass.textTertiary }}>{amount && price ? (side === "buy" ? (parseFloat(amount) / parseFloat(price)).toFixed(2) : (parseFloat(amount) * parseFloat(price)).toFixed(2)) : "0"}</div>
                              <div style={{
                                background: "rgba(255,255,255,0.06)", padding: "6px 12px", borderRadius: 100,
                                display: "flex", alignItems: "center", gap: 8, cursor: "pointer"
                              }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{side === "buy" ? "PRE" : "mUSDC"}</span>
                                <span style={{ fontSize: 8, opacity: 0.5 }}>▼</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, marginBottom: 16 }}>
                          <div style={{ fontSize: 11, color: t.glass.textTertiary, marginBottom: 8 }}>Expiry</div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {["1 Day", "1 Week", "1 Month", "1 Year"].map(e => (
                              <button key={e} style={{
                                flex: 1, padding: "8px 0", borderRadius: 12, border: "none",
                                background: e === "1 Week" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                                color: e === "1 Week" ? "#fff" : t.glass.textTertiary,
                                fontSize: 10, fontWeight: 600, cursor: "pointer"
                              }}>{e}</button>
                            ))}
                          </div>
                        </div>

                        {orderError && <div style={{ fontSize: 11, color: t.glass.red, marginBottom: 8 }}>{orderError}</div>}
                        <button
                          onClick={handlePlaceOrder}
                          disabled={orderLoading}
                          style={{
                            width: "100%", padding: "18px 0", borderRadius: 24, border: "none",
                            background: "linear-gradient(135deg, #0cebeb 0%, #20e3b2 100%)",
                            color: "#000", fontSize: 16, fontWeight: 800, cursor: connected && !orderLoading ? "pointer" : "not-allowed",
                            boxShadow: "0 12px 30px rgba(32,227,178,0.3)", transition: "0.3s", opacity: connected && !orderLoading ? 1 : 0.5
                          }}
                        >
                          {!connected ? "Connect Wallet" : orderLoading ? "Placing..." : `${side.toUpperCase()} PRE`}
                        </button>


                        <div style={{
                          marginTop: 12, padding: "12px 16px", borderRadius: 16,
                          background: "rgba(255,165,0,0.05)", border: "1px solid rgba(255,165,0,0.1)",
                          display: "flex", gap: 10, alignItems: "flex-start"
                        }}>
                          <span style={{ color: "orange", fontSize: 14 }}>⚠️</span>
                          <div style={{ fontSize: 10, color: "rgba(255,165,0,0.8)", lineHeight: "1.4" }}>
                            Limits may not execute exactly when tokens reach the specified price. <span style={{ textDecoration: "underline", cursor: "pointer" }}>Learn more</span>
                          </div>
                        </div>
                      </div>

                    ) : (
                      /* ═══ EZ PEEZE MODE — Price Prediction (any pair) ═══ */
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>

                        <div style={{ textAlign: "center", padding: "4px 0" }}>
                          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", background: "linear-gradient(135deg, #0cebeb, #20e3b2, #29ffc6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EZ Peeze</div>
                          <div style={{ fontSize: 10, color: t.glass.textTertiary, marginTop: 2 }}>Will {selectedPair} go up or down?</div>
                          <div style={{ fontSize: 9, color: t.glass.textTertiary, marginTop: 4 }}>Winners earn Omega tokens</div>
                          {!ezPezeConfig?.escrowAddress && (
                            <div style={{ fontSize: 9, color: "rgba(255,165,0,0.9)", marginTop: 6 }}>Escrow not configured. Set EZ_PEZE_ESCROW_PRIVATE_KEY on server.</div>
                          )}
                        </div>

                        {/* Current Price */}
                        <div style={{ ...t.panelInner, padding: "12px 16px", borderRadius: 16, textAlign: "center" }}>
                          <div style={{ fontSize: 9, color: t.glass.textTertiary, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Current Price</div>
                          <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'SF Mono', monospace", letterSpacing: "-0.02em" }}>
                            {nonEvmPair && (nonEvmPriceFailed || orderBook.midPrice === 0) ? "—" : (orderBook.midPrice != null && orderBook.midPrice > 0 ? orderBook.midPrice.toFixed(4) : (orderBook.midPrice?.toFixed(4) ?? "0.0847"))}
                          </div>
                          <div style={{ fontSize: 10, color: t.glass.textTertiary }}>{currentPairInfo.baseToken || "PRE"} / {currentPairInfo.quoteToken || "mUSDC"}</div>
                        </div>

                        {/* Timeframe Selector */}
                        <div>
                          <div style={{ fontSize: 9, color: t.glass.textTertiary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Timeframe</div>
                          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "rgba(255,255,255,0.03)" }}>
                            {[{ label: "30s", val: 30 }, { label: "1m", val: 60 }, { label: "2m", val: 120 }, { label: "5m", val: 300 }].map((tf) => (
                              <button key={tf.val} onClick={() => setBetTimeframe(tf.val)} style={{
                                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                                fontSize: 11, fontWeight: 700,
                                background: betTimeframe === tf.val ? "rgba(255,255,255,0.15)" : "transparent",
                                color: betTimeframe === tf.val ? "#fff" : t.glass.textTertiary,
                                transition: "all 0.2s",
                              }}>{tf.label}</button>
                            ))}
                          </div>
                        </div>

                        {/* Bet Amount — stake PRE to earn Omega on any pair */}
                        <div>
                          <div style={{ fontSize: 9, color: t.glass.textTertiary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Stake (PRE) · Win Omega</div>
                          <div style={{ display: "flex", gap: 4 }}>
                            {[50, 100, 500, 1000].map(a => (
                              <button key={a} onClick={() => setBetAmount(String(a))} style={{
                                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                                fontSize: 11, fontWeight: 600,
                                background: betAmount === String(a) ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)",
                                color: betAmount === String(a) ? "#fff" : t.glass.textTertiary,
                                transition: "all 0.2s",
                              }}>{a}</button>
                            ))}
                          </div>
                          <div style={{ ...t.panelInner, marginTop: 6, display: "flex", alignItems: "center", overflow: "hidden", borderRadius: 10 }}>
                            <input type="text" value={betAmount} onChange={e => setBetAmount(e.target.value)} placeholder="Custom..." style={{
                              flex: 1, padding: "8px 10px", background: "none", border: "none", color: "#fff",
                              fontSize: 13, fontWeight: 600, outline: "none", fontFamily: "'SF Mono', monospace",
                            }} />
                            <span style={{ fontSize: 10, color: t.glass.textTertiary, paddingRight: 10 }}>PRE</span>
                          </div>
                        </div>

                        {betError && (
                          <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,69,58,0.15)", border: "1px solid rgba(255,69,58,0.3)", fontSize: 11, color: t.glass.red }}>
                            {betError}
                          </div>
                        )}
                        {/* UP / DOWN Buttons */}
                        <div className="ezpeze-up-down" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                          <button onClick={() => placeBet("up")} disabled={betPlacing || !ezPezeConfig?.escrowAddress} style={{
                            padding: "20px 0", borderRadius: 16, cursor: betPlacing || !ezPezeConfig?.escrowAddress ? "not-allowed" : "pointer",
                            background: "linear-gradient(135deg, rgba(50,215,75,0.15), rgba(50,215,75,0.08))",
                            border: "1px solid rgba(50,215,75,0.25)",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                            transition: "all 0.2s", opacity: betPlacing || !ezPezeConfig?.escrowAddress ? 0.6 : 1,
                          }}>
                            <span style={{ fontSize: 28 }}>📈</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: t.glass.green }}>UP</span>
                            <span style={{ fontSize: 9, color: t.glass.textTertiary }}>Price goes higher</span>
                          </button>
                          <button onClick={() => placeBet("down")} disabled={betPlacing || !ezPezeConfig?.escrowAddress} style={{
                            padding: "20px 0", borderRadius: 16, cursor: betPlacing || !ezPezeConfig?.escrowAddress ? "not-allowed" : "pointer",
                            background: "linear-gradient(135deg, rgba(255,69,58,0.15), rgba(255,69,58,0.08))",
                            border: "1px solid rgba(255,69,58,0.25)",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                            transition: "all 0.2s", opacity: betPlacing || !ezPezeConfig?.escrowAddress ? 0.6 : 1,
                          }}>
                            <span style={{ fontSize: 28 }}>📉</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: t.glass.red }}>DOWN</span>
                            <span style={{ fontSize: 9, color: t.glass.textTertiary }}>Price goes lower</span>
                          </button>
                        </div>

                        {/* Active Bets */}
                        {activeBets.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <div style={{ fontSize: 9, color: t.glass.textTertiary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Active Bets</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {activeBets.map(bet => {
                                const isActive = bet.status === "active";
                                const won = bet.status === "won";
                                const borderColor = isActive ? "rgba(255,255,255,0.1)" : won ? "rgba(50,215,75,0.4)" : "rgba(255,69,58,0.4)";
                                const bgColor = isActive ? "rgba(255,255,255,0.03)" : won ? "rgba(50,215,75,0.06)" : "rgba(255,69,58,0.06)";
                                const mins = Math.floor(bet.remaining / 60);
                                const secs = bet.remaining % 60;
                                return (
                                  <div key={bet.id} style={{
                                    padding: "8px 12px", borderRadius: 12,
                                    background: bgColor, border: `1px solid ${borderColor}`,
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    transition: "all 0.3s",
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontSize: 14 }}>{bet.direction === "up" ? "📈" : "📉"}</span>
                                      <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                                          {bet.direction.toUpperCase()} · {bet.amount} PRE {bet.pair && bet.pair !== "PRE/mUSDC" ? `· ${bet.pair}` : ""}
                                        </div>
                                        <div style={{ fontSize: 9, color: t.glass.textTertiary }}>
                                          Entry: {bet.entryPrice.toFixed(4)}
                                          {!isActive && ` → ${bet.exitPrice.toFixed(4)}`}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      {isActive ? (
                                        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'SF Mono', monospace", color: "#fff" }}>
                                          {mins}:{secs.toString().padStart(2, "0")}
                                        </div>
                                      ) : (
                                        <div style={{
                                          fontSize: 13, fontWeight: 800,
                                          color: won ? t.glass.green : t.glass.red,
                                        }}>
                                          {won ? "🎉 WON" : "😞 LOST"}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>


                  <div style={{ ...t.panel, padding: 12 }}>

                    <div style={{ fontSize: 9, color: t.glass.textTertiary, marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>Omega Network</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {[
                        { label: "Chain ID", value: "1313161916" },
                        { label: "Gas", value: "Gasless ✦" },
                        { label: "Explorer", value: "View ↗", link: "https://0x4e4542bc.explorer.aurora-cloud.dev" },
                        { label: "Status", value: "● Live", color: t.glass.green },
                      ].map((item, i) => (
                        <div key={i} onClick={() => item.link && window.open(item.link, '_blank')} style={{ cursor: item.link ? 'pointer' : 'default' }}>
                          <div style={{ fontSize: 8, color: t.glass.textTertiary }}>{item.label}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: item.color || t.glass.textSecondary }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={wallet.switchToOmega}
                      style={{
                        marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 8,
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff", fontSize: 9, fontWeight: 600, cursor: "pointer"
                      }}
                    >Switch to Omega Network</button>
                  </div>
                </div>
              </div>
              )}
            </>
          )}

          <style>{`
        @keyframes float {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(100px, 50px) scale(1.1); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        .prediction-news-scroll { scrollbar-width: thin; -ms-overflow-style: auto; }
        .prediction-news-scroll::-webkit-scrollbar { display: block; width: 8px; }
        .prediction-news-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 4px; }
        .prediction-news-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .prediction-news-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); cursor: pointer;
          border: 4px solid rgba(212,175,55,0.4);
        }
        button { 
          transition: all 0.4s cubic-bezier(0.15, 1, 0.3, 1) !important;
          backdrop-filter: blur(10px);
        }
        button:hover {
          transform: translateY(-2px);
          filter: brightness(1.2);
        }
        button:active { transform: scale(0.95) translateY(0); }
        @media (max-width: 900px) {
          .dex-mobile-layout button { min-height: 44px; touch-action: manipulation; }
          .dex-pair-bar button { min-height: 44px; touch-action: manipulation; }
          body { -webkit-text-size-adjust: 100%; }
        }
      `}</style>
        </div>
      </div >
    </ThemeContext.Provider >
  );
}
