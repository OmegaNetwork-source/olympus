import React, { useEffect, useRef } from "react";

const TV_SYMBOL_PAGE = "https://www.tradingview.com/symbols/";

/**
 * TradingView Technical Analysis widget – buy/sell/neutral meter plus Sources & why below.
 */
export default function TradingViewTechnical({ symbol = "BINANCE:ETHUSDC", theme = "dark" }) {
  const containerRef = useRef(null);
  const isDark = theme === "dark";
  const text = isDark ? "#fff" : "#1a1a1a";
  const textSecondary = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const linkColor = isDark ? "#7dd3fc" : "#0284c7";

  useEffect(() => {
    if (!containerRef.current || !symbol) return;
    const wrapper = containerRef.current;
    wrapper.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.cssText = "height:100%;width:100%";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.cssText = "height:100%;width:100%";
    container.appendChild(widget);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: "1D",
      width: "100%",
      isTransparent: true,
      height: "100%",
      symbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "en",
      colorTheme: theme === "dark" ? "dark" : "light",
    });
    container.appendChild(script);
    wrapper.appendChild(container);
    return () => {
      wrapper.innerHTML = "";
    };
  }, [symbol, theme]);

  const symbolPath = symbol.replace(":", "-");
  const whyItems = [
    { name: "RSI", why: "Overbought/oversold momentum (e.g. RSI above 70 = overbought, below 30 = oversold)." },
    { name: "MACD", why: "Trend direction and strength; crossovers and histogram drive buy/sell signals." },
    { name: "Moving averages", why: "Price vs MA5, MA10, MA20; above = bullish bias, below = bearish." },
    { name: "Summary", why: "The meter is an aggregate of these and other oscillators from TradingView." },
  ];

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <div ref={containerRef} style={{ height: 260, flex: "0 0 260px", width: "100%", minWidth: 0, overflow: "hidden", position: "relative" }} />
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", padding: "12px 10px 16px", borderTop: `1px solid ${border}` }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: textSecondary, marginBottom: 6 }}>SOURCE</div>
          <a
            href={`${TV_SYMBOL_PAGE}${symbolPath}/`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, fontWeight: 600, color: linkColor, textDecoration: "none" }}
          >
            TradingView Technical Analysis
          </a>
          <span style={{ fontSize: 12, color: textSecondary }}> — rating for {symbol}</span>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: textSecondary, marginBottom: 6 }}>WHY THIS SCORE</div>
          <p style={{ fontSize: 12, color: text, lineHeight: 1.5, margin: "0 0 10px 0" }}>
            The score above is based on several technical indicators. Here’s what drives it:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: text, lineHeight: 1.6 }}>
            {whyItems.map((item, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong style={{ color: text }}>{item.name}:</strong>{" "}{item.why}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
