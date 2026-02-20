import React, { useState, useEffect } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "https://olympus-api-n3xm.onrender.com").replace(/\/$/, "");

/**
 * Google News search – "ticker crypto" for crypto pairs, "ticker stock" for stocks.
 */
export default function CryptoNews({ theme = "dark", ticker = "ETH", isStock = false, symbol = "" }) {
  const [items, setItems] = useState([]);
  const [searchUrl, setSearchUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const topicLabel = isStock ? "stock" : "crypto";
  // Build link on client so it always matches "X stock" / "X crypto" regardless of API
  const linkUrl = (ticker && `${ticker} ${topicLabel}`.trim())
    ? `https://news.google.com/search?q=${encodeURIComponent(`${ticker} ${topicLabel}`.trim())}&hl=en-US&gl=US&ceid=US:en`
    : searchUrl;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q = encodeURIComponent((ticker || (isStock ? "" : "ETH")).trim());
    const topicParam = isStock ? "&topic=stock" : "";
    const symbolParam = isStock && symbol ? `&symbol=${encodeURIComponent(symbol)}` : "";
    fetch(`${API_BASE}/api/crypto-news?ticker=${q}${topicParam}${symbolParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.items) setItems(data.items);
        if (!cancelled && data.searchUrl) setSearchUrl(data.searchUrl);
        if (!cancelled && data.error) setError(data.error);
      })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load news"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticker, isStock, symbol]);

  const isDark = theme === "dark";
  const text = isDark ? "#fff" : "#1a1a1a";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const linkHover = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";

  if (loading) {
    return (
      <div style={{ padding: 24, color: textSecondary, fontSize: 13 }}>
        Loading news…
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div style={{ padding: 24, color: textSecondary, fontSize: 13 }}>
        News temporarily unavailable. Try the search link below.
        {(linkUrl || searchUrl) && (
          <a href={linkUrl || searchUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 8, color: isDark ? "#7dd3fc" : "#0284c7" }}>
            Open Google News: “{ticker} {topicLabel}”
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
      {(linkUrl || searchUrl) && (
        <a
          href={linkUrl || searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 16px", borderRadius: 12,
            background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", color: isDark ? "#7dd3fc" : "#0284c7", fontSize: 13, fontWeight: 700, textDecoration: "none",
            border: `1px solid ${border}`, alignSelf: "flex-start", boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          Open “{ticker} {topicLabel}” on Google News →
        </a>
      )}
      {items.length === 0 ? (
        <div style={{ padding: "12px 0", color: textSecondary, fontSize: 12 }}>
          Latest news for this pair: use the button above to open Google News in a new tab.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((n, i) => (
            <a
              key={i}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: "transparent",
                color: text,
                textDecoration: "none",
                fontSize: 13,
                lineHeight: 1.4,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = linkHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: textSecondary }}>
                {n.source}
                {n.publishedAt && ` · ${formatDate(n.publishedAt)}`}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  } catch (_) {
    return "";
  }
}
