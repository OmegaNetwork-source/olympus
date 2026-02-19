import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import OlympusLogo from "./OlympusLogo.jsx";

// ─── STYLES ───
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=SF+Mono&display=swap');
  
  body, html { margin: 0; padding: 0; overflow: hidden; background: #000; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
  @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
  @keyframes flash { 0% { opacity: 0; } 10% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
  @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
  
  .glass-panel {
    background: rgba(20, 20, 25, 0.7);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }
  
  .neon-text {
    text-shadow: 0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3);
  }
`;

// ─── CRASH CHART COMPONENT ───
const CrashChart = ({ crashing, visible }) => {
    const canvasRef = useRef(null);
    const pricesRef = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const w = canvas.width = window.innerWidth;
        const h = canvas.height = window.innerHeight;

        // Initialize prices
        let cur = h * 0.4;
        for (let i = 0; i < w / 5; i++) {
            pricesRef.current.push(cur);
            cur += (Math.random() - 0.5) * 5;
        }

        let frame = 0;
        const loop = () => {
            frame++;
            ctx.clearRect(0, 0, w, h);

            // Update logic
            const last = pricesRef.current[pricesRef.current.length - 1];
            let next = last;

            if (crashing) {
                // Crash hard
                next += (Math.random() * 20); // Down is positive Y
            } else {
                // Normal wobble
                next += (Math.random() - 0.5) * 10;
            }
            // Keep within bounds
            if (next < 50) next = 50 + Math.random() * 10;
            if (next > h) next = h; // floor

            pricesRef.current.push(next);
            if (pricesRef.current.length > w / 5) pricesRef.current.shift(); // Scroll

            // Draw Area
            ctx.beginPath();
            ctx.moveTo(0, h);
            pricesRef.current.forEach((p, i) => {
                ctx.lineTo(i * 5, p);
            });
            ctx.lineTo((pricesRef.current.length - 1) * 5, h);
            ctx.fillStyle = crashing ? "rgba(255, 50, 50, 0.2)" : "rgba(0, 255, 136, 0.1)";
            ctx.fill();

            // Draw Line
            ctx.beginPath();
            pricesRef.current.forEach((p, i) => {
                if (i === 0) ctx.moveTo(i * 5, p);
                else ctx.lineTo(i * 5, p);
            });
            ctx.lineWidth = 3;
            ctx.strokeStyle = crashing ? "#ff3333" : "#00ff88"; // Red if crashing
            ctx.stroke();

            requestAnimationFrame(loop);
        };
        const anim = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(anim);
    }, [crashing]);

    return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, opacity: visible ? 0.4 : 0, transition: "opacity 1s" }} />;
};

// ─── LOGO COMPONENT ───
const ChainLogo = ({ name, color, delay }) => (
    <div style={{
        display: "flex", alignItems: "center", gap: 15, marginBottom: 20,
        animation: `fadeIn 0.5s ease-out ${delay}s backwards, float 3s ease-in-out infinite`
    }}>
        <div style={{
            width: 50, height: 50, borderRadius: "50%", background: color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 900, color: "#fff", boxShadow: `0 0 20px ${color}`
        }}>
            {name.substring(0, 1)}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>{name}</div>
    </div>
);

// ─── DEMO INTERFACE (MOCKUP) ───
const MockDEX = () => {
    return (
        <div className="glass-panel" style={{
            width: "80%", maxWidth: 1000, height: 500, margin: "0 auto",
            borderRadius: 24, padding: 30, display: "flex", gap: 30, zIndex: 10, position: "relative",
            animation: "fadeIn 1s ease-out"
        }}>
            {/* Header Mock */}
            <div style={{ position: "absolute", top: 20, left: 30, fontSize: 18, fontWeight: 900, color: "#fff", display: "flex", gap: 10 }}>
                <span>OLYMPUS</span>
                <span style={{ opacity: 0.5, fontWeight: 400 }}>| Prediction DEX</span>
            </div>

            {/* Connector */}
            <div style={{ position: "absolute", top: 20, right: 30, padding: "8px 16px", borderRadius: 20, background: "#fff", color: "#000", fontWeight: 700, fontSize: 12 }}>
                0x839...29a
            </div>

            {/* Left: Chart Mockup */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 15, marginTop: 40 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#444", display: "flex", alignItems: "center", justifyContent: "center" }}>SOL</div>
                    <div>
                        <div style={{ fontWeight: 900, color: "#fff", fontSize: 24 }}>SOL / USDC</div>
                        <div style={{ color: "#aaa", fontSize: 14 }}>$185.42 <span style={{ color: "#ff3333" }}>-12.4%</span></div>
                    </div>
                </div>
                <div className="glass-panel" style={{ flex: 1, borderRadius: 16, overflow: "hidden", position: "relative", background: "rgba(0,0,0,0.3)" }}>
                    {/* Static chart visual */}
                    <svg width="100%" height="100%" viewBox="0 0 500 300" preserveAspectRatio="none">
                        {/* Grid */}
                        <path d="M0,50 L500,50 M0,100 L500,100 M0,150 L500,150 M0,200 L500,200 M0,250 L500,250" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        {/* Candles (Red Crash) */}
                        <rect x="50" y="50" width="10" height="40" fill="#ff3333" /> <line x1="55" y1="40" x2="55" y2="100" stroke="#ff3333" />
                        <rect x="80" y="80" width="10" height="60" fill="#ff3333" /> <line x1="85" y1="70" x2="85" y2="150" stroke="#ff3333" />
                        <rect x="110" y="130" width="10" height="30" fill="#00ff88" /> <line x1="115" y1="120" x2="115" y2="170" stroke="#00ff88" />
                        <rect x="140" y="150" width="10" height="80" fill="#ff3333" /> <line x1="145" y1="150" x2="145" y2="240" stroke="#ff3333" />
                        <rect x="170" y="220" width="10" height="40" fill="#ff3333" /> <line x1="175" y1="210" x2="175" y2="280" stroke="#ff3333" />
                        {/* Line */}
                        <path d="M0,60 L50,70 L80,110 L110,140 L140,190 L170,240 L200,280 L500,400" stroke="#ff3333" strokeWidth="2" fill="none" />
                    </svg>
                    {/* Floating Info */}
                    <div style={{ position: "absolute", top: 10, left: 10, fontSize: 10, color: "#666" }}>15m Chart</div>
                </div>
            </div>

            {/* Right: EZ Peeze Panel */}
            <div className="glass-panel" style={{ width: 340, padding: 24, borderRadius: 24, border: "1px solid rgba(0,255,136,0.2)", marginTop: 40, display: "flex", flexDirection: "column" }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{
                        margin: 0,
                        background: "linear-gradient(135deg, #0cebeb, #20e3b2, #29ffc6)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        fontSize: 32, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-1px"
                    }}>EZ Peeze</h2>
                    <div style={{ color: "#888", fontSize: 12, marginTop: 5 }}>Will SOL go up or down?</div>
                </div>

                <div className="glass-panel" style={{ padding: 20, borderRadius: 16, marginBottom: 20, textAlign: "center", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Current Price</div>
                    <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, fontFamily: "'SF Mono', monospace", margin: "5px 0" }}>185.42</div>
                    <div style={{ color: "#ff3333", fontSize: 12 }}>▼ 12.4%</div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
                    <button style={{
                        flex: 1, padding: "20px 0", borderRadius: 16, border: "none",
                        background: "rgba(255,255,255,0.05)", color: "#aaa", fontWeight: 800, fontSize: 16, cursor: "pointer"
                    }}>UP</button>
                    <button style={{
                        flex: 1, padding: "20px 0", borderRadius: 16, border: "none",
                        background: "linear-gradient(135deg, #ff3333, #aa0000)", color: "#fff", fontWeight: 800, fontSize: 16,
                        boxShadow: "0 10px 30px rgba(255,0,0,0.3)", transform: "scale(1.05)", cursor: "pointer"
                    }}>DOWN</button>
                </div>

                <div style={{ margin: "20px 0 0", padding: "10px", background: "rgba(0,255,0,0.1)", borderRadius: 12, border: "1px solid rgba(0,255,0,0.2)", color: "#00ff88", fontSize: 11, textAlign: "center" }}>
                    Winning Payout: <strong>1.95x</strong>
                </div>
            </div>
        </div>
    );
};

// ─── MAIN APP ───
const DemoVideo = () => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        // TIMELINE CONFIG (ms)
        // 0: RIP
        // 1: Logos
        // 2: Chart Crash
        // 3: Smart Text 1
        // 4: Smart Text 2
        // 5: NOW YOU CAN
        // 6: OMEGA Reveal
        // 7: Demo Interface

        setTimeout(() => setStep(1), 2500); // Show Logos after RIP
        setTimeout(() => setStep(2), 7000); // Show Chart Crash
        setTimeout(() => setStep(3), 11000); // "Smart enough"
        setTimeout(() => setStep(4), 15000); // "Earn from it"
        setTimeout(() => setStep(5), 18000); // "NOW YOU CAN"
        setTimeout(() => setStep(6), 20000); // Reveal
        setTimeout(() => setStep(7), 24000); // Interface
    }, []);

    return (
        <div style={{
            background: "#050505", width: "100vw", height: "100vh",
            color: "#fff", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", overflow: "hidden",
            fontFamily: "'Unbounded', sans-serif", position: "relative"
        }}>
            <style>{styles}</style>

            {/* BACKGROUND CHART (Visible in scenes 1+) */}
            <CrashChart crashing={true} visible={step >= 1 && step <= 5} />

            {/* SCENE 0: RIP 2025 */}
            {step === 0 && (
                <h1 style={{
                    fontSize: "10vw", fontWeight: 900, color: "#ff3333", margin: 0,
                    animation: "fadeIn 1s ease-out", textShadow: "0 0 50px rgba(255,0,0,0.5)"
                }}>RIP 2025</h1>
            )}

            {/* SCENE 1: LOGOS */}
            {step === 1 && (
                <div style={{ zIndex: 2 }}>
                    <ChainLogo name="Eclipse" color="#000" delay={0} />
                    <ChainLogo name="Monad" color="#8A2BE2" delay={0.5} />
                    <ChainLogo name="Abstract" color="#00CED1" delay={1} />
                    <ChainLogo name="Celestia" color="#FF00FF" delay={1.5} />
                    <div style={{
                        color: "#666", fontSize: "2vw", marginTop: 40, textAlign: "center",
                        animation: "fadeIn 1s ease-out 2s backwards"
                    }}>and all other copy & paste chains...</div>
                </div>
            )}

            {/* SCENE 3: TEXT 1 */}
            {step === 3 && (
                <h1 style={{ fontSize: "5vw", textAlign: "center", padding: "0 40px", animation: "fadeIn 1s", zIndex: 2 }}>
                    You were smart enough to <br /><span style={{ color: "#00ff88", fontSize: "6vw" }}>predict correctly.</span>
                </h1>
            )}

            {/* SCENE 4: TEXT 2 */}
            {step === 4 && (
                <h1 style={{ fontSize: "5vw", textAlign: "center", padding: "0 40px", animation: "fadeIn 1s", zIndex: 2 }}>
                    But didn't have a way to <br /><span style={{ color: "#ff3333", fontSize: "6vw", textDecoration: "line-through" }}>earn form it.</span>
                </h1>
            )}

            {/* SCENE 5: NOW YOU CAN */}
            {step === 5 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                    <h1 style={{
                        fontSize: "10vw", fontWeight: 900, textAlign: "center",
                        color: "#fff", textShadow: "0 0 50px #00ff88",
                        animation: "shake 0.5s infinite"
                    }}>NOW YOU CAN.</h1>
                    <div style={{ fontSize: "2vw", color: "#00ff88", animation: "flash 0.2s infinite" }}>Short the narrative.</div>
                </div>
            )}

            {/* SCENE 6: REVEAL */}
            {step === 6 && (
                <div style={{ textAlign: "center", animation: "pulse 2s infinite", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ transform: "scale(6)", margin: "40px 0" }}>
                        <OlympusLogo theme="dark" />
                    </div>
                    <h2 style={{ fontSize: "3vw", fontWeight: 400, color: "#888", letterSpacing: 5, marginTop: 40 }}>THE PREDICTION DEX</h2>
                    <div style={{ marginTop: 20, fontSize: "1.5vw", color: "#ffd700" }}>- REFERRAL SYSTEM LIVE SOON -</div>
                </div>
            )}

            {/* SCENE 7: INTERFACE */}
            {step === 7 && (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <MockDEX />
                    <h2 style={{ fontSize: "2vw", color: "#666", marginTop: 20, animation: "fadeIn 1s" }}>
                        Trade the <span style={{ color: "#fff" }}>Volatility</span>. Not just the Token.
                    </h2>
                </div>
            )}

        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DemoVideo />);
