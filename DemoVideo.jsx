import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import OlympusLogo from "./OlympusLogo.jsx";

// ─── STYLES ───
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
  
  body, html { margin: 0; padding: 0; overflow: hidden; background: #0b0e11; }
  
  .cinematic-container {
    perspective: 1000px;
    font-family: 'Space Grotesk', sans-serif;
  }

  /* Text Animations */
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes fadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.1); } }
  @keyframes glitch { 
    0% { transform: translate(0) } 
    20% { transform: translate(-2px, 2px) } 
    40% { transform: translate(-2px, -2px) } 
    60% { transform: translate(2px, 2px) } 
    80% { transform: translate(2px, -2px) } 
    100% { transform: translate(0) } 
  }
  @keyframes hardFlash { 0% { background: rgba(255,0,0,0); } 10% { background: rgba(255,0,0,0.3); } 100% { background: rgba(255,0,0,0); } }

  .hero-text {
    position: absolute; width: 100%; text-align: center;
    z-index: 10; pointer-events: none;
    text-shadow: 0 10px 30px rgba(0,0,0,0.8);
  }
  
  .glass-card {
    background: rgba(16, 20, 24, 0.85);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    border-radius: 24px;
    overflow: hidden;
  }
`;

// ─── PRO TRADINGVIEW CHART COMPONENT ───
const ProChart = ({ step }) => {
    const canvasRef = useRef(null);
    const dataRef = useRef([]); // {o,h,l,c,v}

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        // Config
        const candleWidth = 8;
        const spacing = 4;
        const totalW = canvas.width = window.innerWidth;
        const totalH = canvas.height = window.innerHeight;

        // Initialize standard price
        let currentPrice = 100;

        // Generate initial flat history (so screen isn't empty)
        for (let i = 0; i < 50; i++) {
            const volatility = 0.5;
            const o = currentPrice;
            const c = o + (Math.random() - 0.5) * volatility;
            const h = Math.max(o, c) + Math.random() * volatility;
            const l = Math.min(o, c) - Math.random() * volatility;
            dataRef.current.push({ o, h, l, c, v: Math.random() * 50 });
            currentPrice = c;
        }

        let frame = 0;
        let crashTriggered = false;
        let crashMomentum = 0;

        const render = () => {
            frame++;
            ctx.fillStyle = "#0b0e11";
            ctx.fillRect(0, 0, totalW, totalH);

            // ─── GRID ───
            ctx.strokeStyle = "rgba(255,255,255,0.03)";
            ctx.lineWidth = 1;
            for (let y = 0; y < totalH; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(totalW, y); ctx.stroke(); }
            for (let x = 0; x < totalW; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalH); ctx.stroke(); }

            // ─── LOGIC: PUMP TEHN DUMP ───
            // Step 0-1: Parabolic Pump (The "Fakeout")
            // Step 2: TRIGGER CRASH

            let o = currentPrice;
            let c, h, l;

            const isCrashing = step >= 2;

            if (isCrashing) {
                // 📉 CRASH MODE
                if (!crashTriggered) { crashTriggered = true; crashMomentum = 5; }

                crashMomentum *= 1.05; // Accelerate fall
                const drop = crashMomentum + (Math.random() * 5);
                c = o - drop;
                // Tiny wicks on crash
                h = o + Math.random() * 2;
                l = c - Math.random() * 5;
                // High volume on crash
                dataRef.current.push({ o, h, l, c, v: 1000 + Math.random() * 500 });

            } else {
                // 📈 PUMP MODE (Parabolic)
                // As steps progress, pump harder
                const pumpFactor = frame / 500; // slowly ramp up
                const volatility = 2 + (frame * 0.05);

                c = o + (Math.random() * 1.5) + (frame * 0.02); // Upward drift
                // Occasional red candle to look real
                if (Math.random() > 0.8) c = o - (Math.random() * 2);

                h = Math.max(o, c) + Math.random() * volatility;
                l = Math.min(o, c) - Math.random() * volatility;
                dataRef.current.push({ o, h, l, c, v: 100 + Math.random() * 200 });
            }

            currentPrice = c;

            // Keep only enough candles to fill screen + buffer
            // Actually let's keep more and scroll camera
            const maxCandles = Math.ceil(totalW / (candleWidth + spacing)) + 20;
            if (dataRef.current.length > maxCandles) dataRef.current.shift();

            // ─── DRAW CANDLES ───
            // Calculate Y scale to fit active range
            const visible = dataRef.current;
            const minP = Math.min(...visible.map(d => d.l));
            const maxP = Math.max(...visible.map(d => d.h));
            const padding = totalH * 0.2;
            const scaleY = (totalH - padding * 2) / (maxP - minP || 1);

            // Helper to map Price -> Y
            const getY = (p) => totalH - padding - ((p - minP) * scaleY);

            visible.forEach((d, i) => {
                const x = i * (candleWidth + spacing);
                const yO = getY(d.o);
                const yC = getY(d.c);
                const yH = getY(d.h);
                const yL = getY(d.l);
                const isUp = d.c >= d.o;
                const color = isUp ? "#00E396" : "#FF0044"; // Vivid Green/Red

                ctx.fillStyle = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;

                // Wick
                ctx.beginPath(); ctx.moveTo(x + candleWidth / 2, yH); ctx.lineTo(x + candleWidth / 2, yL); ctx.stroke();

                // Body
                const height = Math.abs(yC - yO);
                ctx.fillRect(x, Math.min(yO, yC), candleWidth, Math.max(1, height));

                // Volume (at bottom, subtle)
                const volMax = 2000;
                const volH = (d.v / volMax) * 100;
                ctx.fillStyle = isUp ? "rgba(0, 227, 150, 0.15)" : "rgba(255, 0, 68, 0.15)";
                ctx.fillRect(x, totalH - volH, candleWidth, volH);
            });

            // ─── CURRENT PRICE CURSOR ───
            const last = visible[visible.length - 1];
            const lastY = getY(last.c);
            const lastX = (visible.length - 1) * (candleWidth + spacing) + candleWidth / 2;

            // Dotted line
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.beginPath(); ctx.moveTo(0, lastY); ctx.lineTo(totalW, lastY); ctx.stroke();
            ctx.setLineDash([]);

            // Price Label
            ctx.fillStyle = last.c >= last.o ? "#00E396" : "#FF0044";
            ctx.fillRect(totalW - 80, lastY - 12, 80, 24);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px 'JetBrains Mono'";
            ctx.fillText(last.c.toFixed(2), totalW - 70, lastY + 5);

            // Blinking dot
            ctx.beginPath();
            ctx.arc(lastX + 10, lastY, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();

            requestAnimationFrame(render);
        };

        const anim = requestAnimationFrame(render);
        return () => cancelAnimationFrame(anim);
    }, [step]);

    return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }} />;
};

// ─── COMPOSED DEMO SCENE ───
const DemoVideo = () => {
    const [step, setStep] = useState(0); // 0:RIP, 1:PumpNames, 2:Crash, 3:SmartText, 4:EarnText, 5:NowYouCan, 6:Reveal, 7:Mock

    useEffect(() => {
        // TIMELINE CONFIG (ms)
        // starts at 0 (RIP 2025)
        setTimeout(() => setStep(1), 3000);  // 3s: Names Fade In (Chart Pumping)
        setTimeout(() => setStep(2), 8000);  // 8s: CRASH (Chart Drops Hard)
        setTimeout(() => setStep(3), 12000); // 12s: "Smart enough"
        setTimeout(() => setStep(4), 16000); // 16s: "Earn from it"
        setTimeout(() => setStep(5), 19000); // 19s: "NOW YOU CAN"
        setTimeout(() => setStep(6), 22000); // 22s: Reveal Logo
        setTimeout(() => setStep(7), 26000); // 26s: Interface Mockup
    }, []);

    return (
        <div className="cinematic-container" style={{ width: "100vw", height: "100vh", position: "relative" }}>
            <style>{styles}</style>

            {/* BACKGROUND CHART: Always visible, logic driven by 'step' prop */}
            <ProChart step={step} />

            {/* VIGNETTE / OVERLAY to make text pop */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 0%, #000 120%)", pointerEvents: "none" }} />
            {step >= 2 && step <= 5 && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255,0,68,0.1), transparent)", animation: "hardFlash 0.5s" }} />}

            {/* SCENE 0: RIP 2025 */}
            {step === 0 && (
                <div className="hero-text" style={{ top: "35%", animation: "fadeInUp 1s ease-out" }}>
                    <h1 style={{ fontSize: "10vw", fontWeight: 900, margin: 0, color: "#FF0044", letterSpacing: -5 }}>RIP 2025</h1>
                </div>
            )}

            {/* SCENE 1: NAMES (The Pump) */}
            {step === 1 && (
                <div className="hero-text" style={{ top: "15%", textAlign: "left", paddingLeft: "10%", animation: "fadeInUp 1s" }}>
                    {["Eclipse", "Monad", "Abstract", "Celestia"].map((n, i) => (
                        <div key={n} style={{ fontSize: "5vw", fontWeight: 700, color: "#fff", opacity: 0, animation: `fadeInUp 0.5s ease-out ${i * 0.4}s forwards` }}>
                            {n}
                        </div>
                    ))}
                    <div style={{ fontSize: "2vw", color: "#888", marginTop: 20, animation: "fadeInUp 0.5s ease-out 2s forwards", opacity: 0 }}>
                        and all other copy & paste chains
                    </div>
                </div>
            )}

            {/* SCENE 3: "Smart enough to predict" */}
            {step === 3 && (
                <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.8s" }}>
                    <div style={{ fontSize: "3vw", color: "#ccc", marginBottom: 10 }}>You were smart enough to</div>
                    <div style={{ fontSize: "6vw", fontWeight: 800, color: "#00E396" }}>PREDICT THE TOP.</div>
                </div>
            )}

            {/* SCENE 4: "Couldn't earn" */}
            {step === 4 && (
                <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.8s" }}>
                    <div style={{ fontSize: "3vw", color: "#ccc", marginBottom: 10 }}>But didn't have a way to</div>
                    <div style={{ fontSize: "6vw", fontWeight: 800, color: "#FF0044", textDecoration: "line-through" }}>EARN FROM IT.</div>
                </div>
            )}

            {/* SCENE 5: NOW YOU CAN */}
            {step === 5 && (
                <div className="hero-text" style={{ top: "35%", animation: "glitch 0.2s infinite" }}>
                    <div style={{ fontSize: "12vw", fontWeight: 900, color: "#fff", lineHeight: 0.9 }}>NOW<br />YOU<br />CAN.</div>
                </div>
            )}

            {/* SCENE 6: REVEAL */}
            {step === 6 && (
                <div className="hero-text" style={{ top: "25%", animation: "fadeInUp 1s" }}>
                    <div style={{ transform: "scale(5)", marginBottom: 60, display: "inline-block" }}>
                        <OlympusLogo theme="dark" />
                    </div>
                    <div style={{ fontSize: "2vw", color: "#ffd700", letterSpacing: 4, marginTop: 40 }}>THE FIRST PREDICTION DEX</div>
                    <div style={{ marginTop: 20, fontSize: "1vw", color: "rgba(255,255,255,0.4)" }}>REFERRAL SYSTEM LIVE SOON</div>
                </div>
            )}

            {/* SCENE 7: INTERFACE MOCK (Embedded) */}
            {step === 7 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeInUp 1s" }}>
                    <div className="glass-card" style={{ width: "90%", maxWidth: 1200, height: "80%", padding: 40, display: "flex", gap: 40 }}>
                        {/* Fake Chart Area */}
                        <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 16, position: "relative", overflow: "hidden" }}>
                            <div style={{ position: "absolute", top: 20, left: 20, fontSize: 24, fontWeight: 700, color: "#fff" }}>SOL/USDC <span style={{ color: "#FF0044" }}>-42.0%</span></div>
                            {/* Reuse chart logic but trapped inside? Or just SVG static for mock */}
                            <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
                                <path d="M0,350 Q200,350 300,300 T500,50 L520,350 L550,380 L800,400" fill="none" stroke="#FF0044" strokeWidth="4" />
                                <path d="M0,400 L0,350 Q200,350 300,300 T500,50 L520,350 L550,380 L800,400 L800,400 Z" fill="rgba(255,0,68,0.2)" />
                            </svg>
                        </div>
                        {/* EZ Panel */}
                        <div style={{ width: 350, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <div style={{ fontSize: 40, fontWeight: 900, background: "linear-gradient(to right, #00E396, #00B8D9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 20 }}>EZ Peeze</div>
                            <div style={{ fontSize: 14, color: "#888", marginBottom: 40 }}>Will SOL go up or down?</div>

                            <div style={{ padding: 30, background: "rgba(255,255,255,0.03)", borderRadius: 20, textAlign: "center", marginBottom: 40 }}>
                                <div style={{ fontSize: 12, textTransform: "uppercase", color: "#666" }}>Current Price</div>
                                <div style={{ fontSize: 48, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono'" }}>124.50</div>
                            </div>

                            <div style={{ display: "flex", gap: 20 }}>
                                <button style={{ flex: 1, padding: 25, fontSize: 18, border: 0, borderRadius: 16, background: "rgba(0,227,150,0.15)", color: "#00E396", fontWeight: 800 }}>UP</button>
                                <button style={{ flex: 1, padding: 25, fontSize: 18, border: 0, borderRadius: 16, background: "#FF0044", color: "#fff", fontWeight: 800, boxShadow: "0 10px 40px rgba(255,0,68,0.4)" }}>DOWN</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DemoVideo />);
