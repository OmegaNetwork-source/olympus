/**
 * Same-origin relayer: fetch Binance price on the server (Vercel serverless).
 * No CORS — frontend calls /api/binance-price from same domain.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const symbol = (req.query.symbol || "").trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: "Missing symbol" });
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    if (!r.ok) return res.status(502).json({ error: "Binance unavailable", symbol });
    const data = await r.json();
    const price = data?.price != null ? parseFloat(data.price) : null;
    if (price == null || !Number.isFinite(price) || price <= 0)
      return res.status(502).json({ error: "Price unavailable", symbol });
    return res.status(200).json({ price, symbol });
  } catch (e) {
    return res.status(502).json({ error: e.message || "Fetch failed", symbol });
  }
}
