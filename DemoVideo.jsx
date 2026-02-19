import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import OlympusLogo from "./OlympusLogo.jsx";

// ─── STYLES & ANIMATIONS ───
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
  
  body, html { margin: 0; padding: 0; overflow: hidden; background: #0b0e11; }
  
  .cinematic-container {
    perspective: 1000px;
    font-family: 'Inter', sans-serif;
  }

  /* Animations */
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes crashShake { 
    0% { transform: translate(0, 0) rotate(0deg); } 
    10% { transform: translate(-5px, 5px) rotate(-1deg); } 
    20% { transform: translate(5px, -5px) rotate(1deg); } 
    30% { transform: translate(-10px, 0px) rotate(0deg); } 
    40% { transform: translate(10px, -5px) rotate(1deg); } 
    50% { transform: translate(-5px, 10px) rotate(-1deg); } 
    60% { transform: translate(5px, -10px) rotate(0deg); } 
    70% { transform: translate(0, 5px) rotate(1deg); } 
    80% { transform: translate(-2px, -2px) rotate(-1deg); } 
    90% { transform: translate(2px, 2px) rotate(0deg); } 
    100% { transform: translate(0) } 
  }
  @keyframes redFlash { 
    0%, 100% { background: transparent; } 
    5%, 15% { background: rgba(255, 0, 0, 0.2); } 
  }
  
  .shake-screen {
    animation: crashShake 0.4s infinite cubic-bezier(.36,.07,.19,.97);
  }

  .red-overlay {
    animation: redFlash 1s infinite;
  }

  .hero-text {
    position: absolute; width: 100%; text-align: center;
    z-index: 10; pointer-events: none;
    text-shadow: 0 10px 40px rgba(0,0,0,0.9);
  }
  
  /* UI Mockup Styles */
  .mock-panel {
    background: #0D0D0D;
    border-radius: 24px;
    border: 1px solid #1F1F1F;
    box-shadow: 0 0 0 1px #000, 0 20px 60px rgba(0,0,0,0.8);
    font-family: 'Inter', sans-serif;
    color: #fff;
    overflow: hidden;
  }
  .mock-tab {
    flex: 1; text-align: center; padding: 14px 0; font-size: 11px; font-weight: 800;
    color: #555; background: #1a1a1a; cursor: default;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .mock-tab.active {
    background: #2A2A2A; color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  }
  .mock-btn {
    background: #1C1C1C;
    border: 1px solid #2C2C2C;
    color: #888;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  .mock-btn.selected {
    background: #333; color: #fff; border-color: #555;
  }
  
  .mock-input {
    background: #080808;
    border: 1px solid #222;
    border-radius: 12px;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 16px;
    padding: 14px;
    display: flex; justify-content: space-between; align-items: center;
  }

  .big-btn {
    border-radius: 16px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px;
    border: 1px solid transparent;
    transition: transform 0.2s;
  }
  
  /* Custom Logos */
  .chain-logo-container {
    display: flex; align-items: center; gap: 20px;
    margin-bottom: 30px;
    padding: 15px 30px;
    background: rgba(0,0,0,0.6);
    border-radius: 100px;
    border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
    width: fit-content;
    margin-left: auto; margin-right: auto;
  }
`;

// ─── PRO TRADINGVIEW CHART (Logic: Pump then Dump) ───
const ProChart = ({ step }) => {
    const canvasRef = useRef(null);
    const dataRef = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        // Config
        const candleWidth = 12;
        const spacing = 4;
        const totalW = canvas.width = window.innerWidth;
        const totalH = canvas.height = window.innerHeight;

        // Start low logic
        let currentPrice = 500;
        let frame = 0;
        let crashVelocity = 0;

        // Fill initial buffer
        for (let i = 0; i < 30; i++) {
            dataRef.current.push({ o: 500, h: 501, l: 499, c: 500, v: 10 });
        }

        const loop = () => {
            frame++;

            // ─── PRICE ACTION LOGIC ───
            // Step 0 (0-2s): PARABOLIC PUMP
            // Step 1 (2s+):  CRASH (Red Line) -> "When it shows them it drops"

            const isCrashing = step >= 1;

            let o = currentPrice;
            let c, h, l, v;

            if (isCrashing) {
                // 📉 THE CRASH
                crashVelocity += 2; // Accelerate drop
                const drop = crashVelocity + (Math.random() * 20);
                c = o - drop;
                h = o + 2;
                l = c - 5;
                v = 5000 + Math.random() * 5000;
                if (c < 50) { c = 50; crashVelocity = 0; } // Floor
            } else {
                // 📈 THE PUMP (Parabolic)
                const pumpStrength = Math.pow(frame, 1.8) * 0.05;
                c = o + Math.max(1, pumpStrength + (Math.random() * 5));
                l = o - 2;
                h = c + 5;
                v = 100 + pumpStrength * 10;
            }

            currentPrice = c;
            dataRef.current.push({ o, h, l, c, v });
            if (dataRef.current.length > (totalW / (candleWidth + spacing)) + 10) dataRef.current.shift();

            // ─── RENDER ───
            ctx.fillStyle = "#0b0e11";
            ctx.fillRect(0, 0, totalW, totalH);

            // Grid
            ctx.strokeStyle = "rgba(255,255,255,0.05)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let y = 0; y < totalH; y += 100) { ctx.moveTo(0, y); ctx.lineTo(totalW, y); }
            for (let x = 0; x < totalW; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, totalH); }
            ctx.stroke();

            // Calc Y Range
            const visible = dataRef.current;
            const minP = Math.min(...visible.map(d => d.l));
            const maxP = Math.max(...visible.map(d => d.h));
            const margin = totalH * 0.2;
            const range = maxP - minP || 1;
            const scaleY = (totalH - margin * 2) / range;
            const getY = (p) => totalH - margin - ((p - minP) * scaleY);

            visible.forEach((d, i) => {
                const x = i * (candleWidth + spacing);
                const isUp = d.c >= d.o;
                const color = isUp ? "#26a69a" : "#ef5350";

                ctx.fillStyle = color;
                ctx.strokeStyle = color;

                const yO = getY(d.o);
                const yC = getY(d.c);
                const yH = getY(d.h);
                const yL = getY(d.l);

                // Wick
                ctx.beginPath(); ctx.moveTo(x + candleWidth / 2, yH); ctx.lineTo(x + candleWidth / 2, yL); ctx.stroke();
                // Body
                ctx.fillRect(x, Math.min(yO, yC), candleWidth, Math.max(1, Math.abs(yC - yO)));
            });

            // Price Line
            const last = visible[visible.length - 1];
            const yLast = getY(last.c);
            ctx.strokeStyle = last.c >= last.o ? "#26a69a" : "#ef5350";
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(0, yLast); ctx.lineTo(totalW, yLast); ctx.stroke();
            ctx.setLineDash([]);

            requestAnimationFrame(loop);
        };
        const anim = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(anim);
    }, [step]);

    return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />;
};

// ─── LOGO SVGs ───
const EclipseLogo = () => (
    <svg width="40" height="40" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="black" stroke="#fff" strokeWidth="4" />
        <path d="M 50 5 A 45 45 0 0 1 50 95 A 35 35 0 0 0 50 5 Z" fill="#fff" />
    </svg>
);
const MonadLogo = () => (
    <svg width="40" height="40" viewBox="0 0 100 100">
        <path d="M 20 80 L 20 20 L 50 50 L 80 20 L 80 80" stroke="#8A2BE2" strokeWidth="12" fill="none" strokeLinecap="round" />
    </svg>
);
const AbstractLogo = () => (
    <svg width="40" height="40" viewBox="0 0 100 100">
        <rect x="20" y="20" width="60" height="60" rx="20" fill="none" stroke="#00CED1" strokeWidth="8" />
        <circle cx="70" cy="30" r="10" fill="#00CED1" />
    </svg>
);
const CelestiaLogo = () => (
    <svg width="40" height="40" viewBox="0 0 100 100">
        <rect x="20" y="55" width="25" height="25" fill="#FF00FF" />
        <rect x="55" y="55" width="25" height="25" fill="#FF00FF" />
        <rect x="55" y="20" width="25" height="25" fill="#FF00FF" />
    </svg>
);

// ─── FINAL UI MOCKUP (End Scene) ───
const FinalMockup = () => {
    return (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <div className="mock-panel" style={{ width: 360, position: "relative" }}>

                {/* Header Tabs */}
                <div style={{ display: "flex", padding: "6px", gap: 6 }}>
                    <div className="mock-tab" style={{ borderRadius: 12 }}>Swap</div>
                    <div className="mock-tab active" style={{ borderRadius: 12 }}>EZ Peeze</div>
                </div>

                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Title */}
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 24, fontWeight: 900, background: "linear-gradient(90deg, #4ade80, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EZ Peeze</div>
                        <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>Will SOL/USDC go up or down?</div>
                        <div style={{ fontSize: 10, color: "#666" }}>Winners earn Omega tokens</div>
                    </div>

                    {/* Price Card */}
                    <div style={{ background: "#151515", border: "1px solid #222", borderRadius: 16, padding: "20px 0", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 4 }}>CURRENT PRICE</div>
                        <div style={{ fontSize: 42, color: "#fff", fontWeight: 800, fontFamily: "Inter" }}>185.42</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>SOL / USDC</div>
                    </div>

                    {/* Timeframe */}
                    <div>
                        <div style={{ fontSize: 9, color: "#444", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>TIMEFRAME</div>
                        <div style={{ display: "flex", gap: 6 }}>
                            {["30s", "1m", "2m", "5m"].map((t, i) => (
                                <button key={t} className={`mock-btn ${i === 1 ? "selected" : ""}`} style={{ flex: 1, padding: "10px 0" }}>{t}</button>
                            ))}
                        </div>
                    </div>

                    {/* Stake */}
                    <div>
                        <div style={{ fontSize: 9, color: "#444", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>STAKE (PRE) · WIN OMEGA</div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                            {["50", "100", "500", "1000"].map((t, i) => (
                                <button key={t} className={`mock-btn ${i === 1 ? "selected" : ""}`} style={{ flex: 1, padding: "10px 0" }}>{t}</button>
                            ))}
                        </div>
                        <div className="mock-input">
                            <span>100</span>
                            <span style={{ fontSize: 11, color: "#555" }}>PRE</span>
                        </div>
                    </div>

                    {/* UP / DOWN Buttons - EXACTLY LIKE IMAGE */}
                    <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                        <div className="big-btn" style={{ flex: 1, height: 120, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                            {/* Stock Up Icon */}
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#22c55e", letterSpacing: 1 }}>UP</div>
                            <div style={{ fontSize: 9, color: "#22c55e", opacity: 0.7 }}>Price goes higher</div>
                        </div>
                        <div className="big-btn" style={{ flex: 1, height: 120, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                            {/* Stock Down Icon */}
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#ef4444", letterSpacing: 1 }}>DOWN</div>
                            <div style={{ fontSize: 9, color: "#ef4444", opacity: 0.7 }}>Price goes lower</div>
                        </div>
                    </div>

                </div>
            </div>

            {/* OMEGA FOOTER */}
            <div style={{ position: "absolute", bottom: 20, width: 360, textAlign: "center", color: "#333", fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>
                OMEGA NETWORK
            </div>
        </div>
    );
};

// ─── MAIN APP ───
const DemoVideo = () => {
    const [step, setStep] = useState(0);
    // 0: RIP + Pump
    // 1: Names + CRASH
    // 2: Smart
    // 3: Earn
    // 4: NOW YOU CAN
    // 5: Reveal
    // 6: UI

    useEffect(() => {
        // 0s: Chart starts pumping hard
        // 2.5s: LOGOS + CRASH START
        setTimeout(() => setStep(1), 2500);
        setTimeout(() => setStep(2), 7000); // Smart enough
        setTimeout(() => setStep(3), 11000); // Earn
        setTimeout(() => setStep(4), 14000); // NOW YOU CAN
        setTimeout(() => setStep(5), 17000); // Reveal
        setTimeout(() => setStep(6), 21000); // UI
    }, []);

    return (
        <div className={`cinematic-container ${step >= 1 && step <= 4 ? "shake-screen" : ""}`} style={{ width: "100vw", height: "100vh", position: "relative" }}>
            <style>{styles}</style>

            {/* BACKGROUND CHART */}
            <ProChart step={step} />

            {/* VIGNETTE & RED OVERLAY */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 30%, #000 100%)", pointerEvents: "none" }} />
            {step >= 1 && step <= 4 && <div className="red-overlay" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />}

            {/* SCENE 0: RIP 2025 */}
            {step === 0 && (
                <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.5s ease-out" }}>
                    <h1 style={{ fontSize: "10vw", fontWeight: 900, margin: 0, color: "#fff", letterSpacing: -2 }}>RIP <span style={{ color: "#ef4444" }}>2025</span></h1>
                </div>
            )}

            {/* SCENE 1: LOGOS & CRASH */}
            {step === 1 && (
                <div className="hero-text" style={{ top: "30%", zIndex: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "center" }}>
                        <div className="chain-logo-container" style={{ animation: "fadeInUp 0.3s backwards" }}>
                            <EclipseLogo /> <span style={{ fontSize: 32, fontWeight: 800, color: "#fff" }}>Eclipse</span>
                        </div>
                        <div className="chain-logo-container" style={{ animation: "fadeInUp 0.3s 0.2s backwards" }}>
                            <MonadLogo /> <span style={{ fontSize: 32, fontWeight: 800, color: "#fff" }}>Monad</span>
                        </div>
                        <div className="chain-logo-container" style={{ animation: "fadeInUp 0.3s 0.4s backwards" }}>
                            <AbstractLogo /> <span style={{ fontSize: 32, fontWeight: 800, color: "#fff" }}>Abstract</span>
                        </div>
                        <div className="chain-logo-container" style={{ animation: "fadeInUp 0.3s 0.6s backwards" }}>
                            <CelestiaLogo /> <span style={{ fontSize: 32, fontWeight: 800, color: "#fff" }}>Celestia</span>
                        </div>
                    </div>
                    <div style={{ fontSize: "2vw", color: "#888", marginTop: 40, animation: "fadeInUp 0.5s 1.5s backwards" }}>
                        and all other copy & paste chains
                    </div>
                </div>
            )}

            {/* SCENE 2: "Smart enough" */}
            {step === 2 && (
                <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.5s" }}>
                    <div style={{ fontSize: "3vw", color: "#ccc" }}>You were smart enough to predict this.</div>
                </div>
            )}

            {/* SCENE 3: "Couldn't earn" */}
            {step === 3 && (
                <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.5s" }}>
                    <div style={{ fontSize: "3vw", color: "#ccc" }}>But didn't have a way to earn from it.</div>
                </div>
            )}

            {/* SCENE 4: NOW YOU CAN */}
            {step === 4 && (
                <div className="hero-text" style={{ top: "35%", animation: "crashShake 0.2s infinite" }}>
                    <div style={{ fontSize: "12vw", fontWeight: 900, color: "#fff" }}>NOW YOU CAN.</div>
                </div>
            )}

            {/* SCENE 5: REVEAL */}
            {step === 5 && (
                <div className="hero-text" style={{ top: "30%", animation: "fadeInUp 1s" }}>
                    <div style={{ transform: "scale(5)", marginBottom: 60, display: "inline-block" }}>
                        <OlympusLogo theme="dark" />
                    </div>
                    <div style={{ fontSize: "2vw", color: "#ffd700", letterSpacing: 4, marginTop: 40 }}>THE FIRST PREDICTION DEX</div>
                    <div style={{ marginTop: 20, fontSize: "1vw", color: "rgba(255,255,255,0.4)" }}>REFERRAL SYSTEM LIVE SOON</div>
                </div>
            )}

            {/* SCENE 6: UI MOCKUP */}
            {step === 6 && <FinalMockup />}

        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DemoVideo />);
