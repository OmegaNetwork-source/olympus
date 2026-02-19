import React, { useEffect, useRef } from "react";

/**
 * TradingView Advanced Chart widget - embeds real-time chart for a symbol
 * @param {Object} props - { symbol (e.g. BINANCE:ETHUSDC), theme: "dark"|"light" }
 */
export default function TradingViewChart({ symbol = "BINANCE:ETHUSDC", theme = "dark" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !symbol) return;
    const wrapper = containerRef.current;
    wrapper.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.cssText = "height:100%;width:100%";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.cssText = "height:calc(100% - 32px);width:100%";
    container.appendChild(widget);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "exchange",
      theme: theme === "dark" ? "dark" : "light",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);
    wrapper.appendChild(container);
    return () => {
      wrapper.innerHTML = "";
    };
  }, [symbol, theme]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
