import React, { useEffect, useRef } from "react";

/**
 * TradingView Top Stories / Timeline widget - news for a symbol or market
 */
export default function TradingViewNews({ symbol = "BINANCE:ETHUSDC", theme = "dark" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
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
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: symbol ? "symbol" : "market",
      symbol: symbol || "CRYPTOCAP:BTC",
      colorTheme: theme === "dark" ? "dark" : "light",
      isTransparent: true,
      displayMode: "regular",
      width: "100%",
      height: "100%",
      locale: "en",
    });
    container.appendChild(script);
    wrapper.appendChild(container);
    return () => {
      wrapper.innerHTML = "";
    };
  }, [symbol, theme]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
