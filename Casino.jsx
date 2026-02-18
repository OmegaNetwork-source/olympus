import React from "react";

export default function Casino({ theme, t }) {
    return (
        <div style={{
            height: "100%", width: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: t.glass.text,
            background: theme === "dark"
                ? "radial-gradient(circle at 50% 30%, rgba(212,175,55,0.05), transparent 70%)"
                : "radial-gradient(circle at 50% 30%, rgba(212,175,55,0.1), transparent 70%)"
        }}>
            <div style={{
                fontSize: 80, marginBottom: 24,
                filter: "drop-shadow(0 0 30px rgba(212,175,55,0.4))",
                animation: "float 6s ease-in-out infinite"
            }}>
                🎰
            </div>

            <h1 style={{
                fontSize: 48, fontWeight: 900, margin: "0 0 16px 0",
                background: `linear-gradient(to bottom, #fff, ${t.glass.gold})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                letterSpacing: -1
            }}>
                OLYMPUS CASINO
            </h1>

            <div style={{
                padding: "8px 24px", borderRadius: 100,
                border: "1px solid " + t.glass.border,
                background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                fontSize: 14, fontWeight: 600, letterSpacing: 2,
                color: t.glass.textSecondary, textTransform: "uppercase"
            }}>
                Coming Soon
            </div>

            <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
        </div>
    );
}
