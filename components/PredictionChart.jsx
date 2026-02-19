import React, { useEffect, useRef, useState } from "react";
import { createChart, AreaSeries } from "lightweight-charts";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "https://olympus-api-n3xm.onrender.com").replace(/\/$/, "");

/**
 * Polymarket-style price history chart using CLOB API (token_id + interval + fidelity).
 * Uses TradingView lightweight-charts: area series, YES/NO toggle, interval switcher, crosshair.
 */
export default function PredictionChart({
  yesTokenId,
  noTokenId,
  interval = "1w",
  onIntervalChange,
  theme = "dark",
  network = "polygon",
  style = {},
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [data, setData] = useState({ yes: [], no: [] });
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState("yes");
  const [tooltip, setTooltip] = useState({ visible: false, date: "", value: "" });

  useEffect(() => {
    if (!yesTokenId && !noTokenId) {
      setData({ yes: [], no: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      network,
      yesTokenId: yesTokenId || "",
      noTokenId: noTokenId || "",
      range: interval,
    });
    fetch(`${API_BASE}/api/prediction/chart?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const yes = (d.yes || []).filter((p) => p != null && typeof p.value === "number").map((p) => ({ time: p.time, value: p.value }));
        const no = (d.no || []).filter((p) => p != null && typeof p.value === "number").map((p) => ({ time: p.time, value: p.value }));
        setData({ yes, no });
      })
      .catch(() => setData({ yes: [], no: [] }))
      .finally(() => setLoading(false));
  }, [yesTokenId, noTokenId, interval, network]);

  useEffect(() => {
    if (!containerRef.current || (!data.yes.length && !data.no.length)) return;
    const isDark = theme === "dark";
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 280,
      layout: {
        background: { color: "transparent" },
        textColor: isDark ? "#9ca3af" : "#4b5563",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        horzLines: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderVisible: false,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    const color = side === "yes" ? "#00e676" : "#ff5252";
    const topColor = side === "yes" ? "rgba(0,230,118,0.25)" : "rgba(255,82,82,0.2)";
    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor,
      bottomColor: "rgba(0,0,0,0.01)",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: color,
      crosshairMarkerBackgroundColor: isDark ? "#0d0f14" : "#fff",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    seriesRef.current = series;

    const currentData = side === "yes" ? data.yes : data.no;
    if (currentData.length) {
      const sorted = [...currentData].sort((a, b) => a.time - b.time);
      series.setData(sorted);
      chart.timeScale().fitContent();
    }

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setTooltip({ visible: false });
        return;
      }
      const price = param.seriesData.get(series);
      if (!price) {
        setTooltip({ visible: false });
        return;
      }
      const date = new Date(Number(param.time) * 1000);
      setTooltip({
        visible: true,
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        value: (price.value * 100).toFixed(1) + "%",
      });
    });

    const onResize = () => {
      if (containerRef.current && chartRef.current) chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data, side, theme]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const currentData = side === "yes" ? data.yes : data.no;
    const color = side === "yes" ? "#00e676" : "#ff5252";
    const topColor = side === "yes" ? "rgba(0,230,118,0.25)" : "rgba(255,82,82,0.2)";
    seriesRef.current.applyOptions({ lineColor: color, topColor, crosshairMarkerBorderColor: color });
    if (currentData.length) {
      const sorted = [...currentData].sort((a, b) => a.time - b.time);
      seriesRef.current.setData(sorted);
      chartRef.current.timeScale().fitContent();
    }
  }, [side, data]);

  const currentSeries = side === "yes" ? data.yes : data.no;
  const currentPct = currentSeries.length ? currentSeries[currentSeries.length - 1].value * 100 : null;
  const changePct = currentSeries.length >= 2
    ? ((currentSeries[currentSeries.length - 1].value - currentSeries[0].value) / (currentSeries[0].value || 0.001)) * 100
    : null;
  const intervals = ["1d", "1w", "1m", "3m", "all"];
  const isDark = theme === "dark";

  if (loading) {
    return (
      <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", ...style }}>
        Loading chart…
      </div>
    );
  }

  if (!data.yes.length && !data.no.length) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 13, ...style }}>
        No price history for this market
      </div>
    );
  }

  return (
    <div style={{ ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: side === "yes" ? "#00e676" : "#ff5252", lineHeight: 1.1 }}>
            {currentPct != null ? (currentPct < 0.5 ? "<1%" : currentPct >= 99.5 ? "100%" : currentPct.toFixed(1) + "%") : "—"} chance
          </div>
          {changePct != null && (
            <div style={{ fontSize: 13, fontWeight: 600, color: changePct >= 0 ? "#00e676" : "#ff5252", marginTop: 4 }}>
              {(changePct >= 0 ? "+" : "") + changePct.toFixed(1)}% {interval.toUpperCase()} change
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["yes", "no"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: side === s ? (s === "yes" ? "#00e676" : "#ff5252") : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                  color: side === s ? "#000" : (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"),
                }}
              >
                {s === "yes" ? "YES" : "NO"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {intervals.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onIntervalChange && onIntervalChange(r)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: interval === r ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)") : "transparent",
                  color: interval === r ? (isDark ? "#fff" : "#111") : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"),
                }}
              >
                {r === "all" ? "ALL" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "relative" }}>
        {tooltip.visible && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "8px 12px",
              borderRadius: 8,
              background: isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              fontSize: 12,
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontWeight: 600 }}>{tooltip.date}</div>
            <div style={{ color: side === "yes" ? "#00e676" : "#ff5252", fontWeight: 700 }}>{tooltip.value}</div>
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: 280 }} />
      </div>
    </div>
  );
}
