import React, { useState, useEffect } from "react";

export default function OlympusLogo({ theme }) {
    const [lightning, setLightning] = useState(null);

    useEffect(() => {
        // Random lightning effect loop
        const loop = () => {
            const delay = 3000 + Math.random() * 5000; // 3-8s random interval
            setTimeout(() => {
                triggerLightning();
                loop();
            }, delay);
        };
        loop();
    }, []);

    const triggerLightning = () => {
        // Generate random lightning parameters
        setLightning({
            id: Date.now(),
            path: generateBolt(),
            side: Math.random() > 0.5 ? "left" : "right"
        });
        // Clear after animation
        setTimeout(() => setLightning(null), 300);
    };

    const generateBolt = () => {
        // Create a jagged path
        let points = [];
        let x = 10;
        let y = 0;
        while (y < 60) {
            x += (Math.random() * 10 - 5); // wander x
            y += (Math.random() * 10 + 2); // advance y
            points.push(`${x},${y}`);
        }
        return points.join(" L ");
    };

    return (
        <div
            style={{
                position: "relative", cursor: "pointer", userSelect: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                padding: "0 20px"
            }}
            onMouseEnter={triggerLightning}
            onClick={triggerLightning}
        >
            {/* Left Bolt Area */}
            <div style={{ width: 24, height: 40, position: "relative" }}>
                {lightning && lightning.side === "left" && <LightningSVG path={lightning.path} color={theme === "dark" ? "#fff" : "#d4af37"} />}
            </div>

            {/* Main Text */}
            <h1 style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 32, fontWeight: 900, letterSpacing: "0.15em",
                margin: 0, padding: 0, textTransform: "uppercase",
                background: theme === "dark"
                    ? "linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%)"
                    : "linear-gradient(180deg, #1a1a1a 0%, #444 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                filter: lightning ? "drop-shadow(0 0 25px rgba(255,255,255,0.8))" : "drop-shadow(0 4px 20px rgba(0,0,0,0.2))",
                transition: "filter 0.1s ease-out",
                position: "relative", zIndex: 2
            }}>
                Olympus
            </h1>

            {/* Right Bolt Area */}
            <div style={{ width: 24, height: 40, position: "relative" }}>
                {lightning && lightning.side === "right" && <LightningSVG path={lightning.path} color={theme === "dark" ? "#fff" : "#d4af37"} />}
            </div>


        </div>
    );
}

function LightningSVG({ path, color }) {
    return (
        <svg
            viewBox="0 0 30 60"
            style={{
                position: "absolute", top: -10, left: 0, width: "100%", height: "140%",
                overflow: "visible", filter: `drop-shadow(0 0 8px ${color})`
            }}
        >
            <path
                d={`M 15,0 L ${path}`}
                stroke={color} strokeWidth="2.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round"
                className="bolt-anim"
            />
            <style>{`
        .bolt-anim {
          animation: flash 0.3s linear forwards;
        }
        @keyframes flash {
          0% { opacity: 0; stroke-width: 0.5; }
          10% { opacity: 1; stroke-width: 3; }
          30% { opacity: 1; }
          100% { opacity: 0; stroke-width: 0.5; }
        }
      `}</style>
        </svg>
    );
}

