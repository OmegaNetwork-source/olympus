// Omega Logo - adapts to theme (dark: black bg, light: gold gradient)
export default function OmegaLogo({ width = 32, height = 32, style = {}, theme = "dark" }) {
  const isDark = theme === "dark";
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 10,
        background: isDark ? "#000" : "linear-gradient(135deg, #D4AF37 0%, #F5B800 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: width * 0.5,
        fontWeight: 800,
        color: "#fff",
        boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(212,175,55,0.3)",
        border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.4)",
        ...style,
      }}
    >
      Ω
    </div>
  );
}
