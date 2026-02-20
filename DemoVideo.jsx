import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import OlympusLogo from "./OlympusLogo.jsx";

// ─── STYLES ───
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap');
  
  body, html { margin: 0; padding: 0; overflow: hidden; background: #050505; }
  .cinematic-container { perspective: 1000px; font-family: 'Inter', sans-serif; }
  
  /* FONTS */
  .bubble-text { 
    font-family: 'Titan One', cursive; 
    text-shadow: 0 5px 15px rgba(0,0,0,0.8);
    letter-spacing: 2px;
  }
  
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 80% { opacity: 1; transform: scale(1.1); } 100% { transform: scale(1); } }
  .hero-text { position: absolute; width: 100%; text-align: center; z-index: 20; pointer-events: none; }
  
  /* HIDE/SHOW HELPERS */
  .fade-out { animation: fadeOut 0.5s forwards; }
  @keyframes fadeOut { to { opacity: 0; } }

  /* HUGE X ANIMATION */
  .x-mark {
    position: absolute; left: 50%; top: 50%; width: 200%; height: 300%; 
    transform: translate(-50%, -50%); pointer-events: none;
  }
  .x-line {
    position: absolute; background: #ef4444; border-radius: 10px; opacity: 0;
    transition: opacity 0.1s, height 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
  }
  .x-line.one { width: 12px; height: 0%; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(45deg); }
  .x-line.two { width: 12px; height: 0%; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-45deg); }
  .x-active .x-line.one { height: 100%; opacity: 1; transition-delay: 0s; }
  .x-active .x-line.two { height: 100%; opacity: 1; transition-delay: 0.1s; }

  /* SLOW MOUNTAIN ANIMATION (6s) */
  .mountain-line { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: drawMountain 6s linear forwards; }
  @keyframes drawMountain { to { stroke-dashoffset: 0; } }
  
  /* LIGHTNING FLASH - Updated for more intensity */
  @keyframes flashLightning { 
    0% { opacity: 0; } 
    5% { opacity: 1; background: #fff; } 
    10% { opacity: 0; } 
    15% { opacity: 1; background: #fff; } 
    25% { opacity: 0; } 
    30% { opacity: 1; background: #fff; }
    40% { opacity: 0; }
  }
  .lightning-flash { position: absolute; inset: 0; pointer-events: none; animation: flashLightning 0.5s linear forwards; opacity: 0; z-index: 50; }

  .final-scene-container {
    position: absolute; inset: 0; z-index: 10;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  
  .high-fi-dashboard {
     width: 100%; height: 100%; background: #0b0b0b;
     display: grid; grid-template-rows: 60px 1fr 300px;
     filter: blur(6px) brightness(0.4);
     transform: scale(1.05); /* hide blur edges */
  }
  .hf-header { border-bottom: 1px solid #222; display: flex; align-items: center; padding: 0 20px; gap: 20px; }
  .hf-chart-area { border: 1px solid #222; margin: 10px; background: #111; position: relative; }
  .hf-candle { width: 6px; background: #22c55e; position: absolute; bottom: 20%; }
  
  .hf-ez-card {
    position: relative;
    width: 360px; background: #0E0E0E; border: 1px solid #333; border-radius: 24px;
    box-shadow: 0 40px 100px rgba(0,0,0,0.9);
    display: flex; flex-direction: column; overflow: hidden;
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
    z-index: 20;
    transition: opacity 0.5s;
  }
  
  /* CLICK FINGER ANIMATION */
  @keyframes clickTap {
    0% { transform: scale(1); opacity: 0; }
    20% { opacity: 1; }
    50% { transform: scale(0.8); }
    100% { transform: scale(1); opacity: 0; }
  }
  .click-circle {
    position: absolute; width: 60px; height: 60px; border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.8); background: rgba(255,255,255,0.2);
    animation: clickTap 0.5s linear forwards;
    pointer-events: none;
    z-index: 30;
  }
  
  .keyword-pop {
     position: absolute; font-family: 'Titan One', cursive; color: #fff; 
     text-shadow: 0 5px 15px #000; font-size: 4vw; z-index: 40;
     animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
     pointer-events: none;
     background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 12px;
  }

  .c-logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; background: #000; }
  .shape-appear { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards; }
`;

// ─── SVG LOGOS ───
const EclipseSvg = () => (<svg width="60" height="60" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="black" stroke="#fff" strokeWidth="4" /><path d="M 50 5 A 45 45 0 0 1 50 95 A 35 35 0 0 0 50 5 Z" fill="#fff" /></svg>);
const MonadSvg = () => (<svg width="60" height="60" viewBox="0 0 100 100"><path d="M 20 80 L 20 20 L 50 50 L 80 20 L 80 80" stroke="#8A2BE2" strokeWidth="12" fill="none" strokeLinecap="round" /></svg>);
const BeraSvg = () => (<svg width="60" height="60" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#fca5a5" stroke="#fff" strokeWidth="2" /><circle cx="35" cy="40" r="5" fill="#000" /><circle cx="65" cy="40" r="5" fill="#000" /><path d="M 40 70 Q 50 80 60 70" stroke="#000" strokeWidth="3" fill="none" /></svg>);
const CelestiaSvg = () => (<svg width="60" height="60" viewBox="0 0 100 100"><rect x="20" y="55" width="25" height="25" fill="#FF00FF" /><rect x="55" y="55" width="25" height="25" fill="#FF00FF" /><rect x="55" y="20" width="25" height="25" fill="#FF00FF" /></svg>);

const ChainLogo = ({ name, fallback }) => {
    const [src, setSrc] = useState(null);
    const [err, setErr] = useState(false);
    useEffect(() => {
        if (name === "Eclipse") setSrc("https://assets.coingecko.com/coins/images/54958/standard/image_%2832%29.png?1742979704");
        if (name === "Monad") setSrc("https://assets.coingecko.com/coins/images/38927/standard/mon.png?1766029057");
        if (name === "Berachain") setSrc("https://assets.coingecko.com/coins/images/25235/standard/BERA.png?1738822008");
        if (name === "Celestia") setSrc("https://assets.coingecko.com/coins/images/31967/large/tia.jpg");
    }, [name]);
    if (src && !err) return <img src={src} className="c-logo" alt={name} onError={() => setErr(true)} />;
    return <div className="c-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{fallback}</div>;
};

// ─── FINAL SCENE ───
const FinalScene = () => {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        // 0s start
        setTimeout(() => setStage(1), 800);  // Click UP
        setTimeout(() => setStage(2), 1600); // Show PREDICT
        setTimeout(() => setStage(3), 2400); // Click DOWN
        setTimeout(() => setStage(4), 3200); // Show EARN
        setTimeout(() => setStage(5), 4000); // Show REWARDS

        // Extended Sequence
        setTimeout(() => setStage(6), 5500); // Click SWAP
        setTimeout(() => setStage(7), 6000); // Show SWAP Text
        setTimeout(() => setStage(8), 7000); // Show PROVIDE LIQUIDITY
        setTimeout(() => setStage(9), 8000); // Show AUTOMATED MM

        setTimeout(() => setStage(10), 9000); // Show PRE-TGE
        setTimeout(() => setStage(11), 10000); // Show ALL COINS

        // Blackout & Monday
        setTimeout(() => setStage(12), 12000); // Blackout
    }, []);

    // If stage 12, show blackout overlay with STORM LIGHTNING
    if (stage >= 12) {
        return (
            <div style={{ position: "absolute", inset: 0, background: "#000", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* MULTIPLE LIGHTNING FLASHES FOR "MORE LIGHTNING" */}
                <div className="lightning-flash" style={{ animationDuration: "0.2s", animationDelay: "0s" }}></div>
                <div className="lightning-flash" style={{ animationDuration: "0.15s", animationDelay: "0.4s", animationIterationCount: 2 }}></div>
                <div className="lightning-flash" style={{ animationDuration: "0.1s", animationDelay: "1.2s" }}></div>

                <h1 className="bubble-text" style={{ fontSize: "10vw", color: "#fff", animation: "popIn 0.2s backwards", zIndex: 101 }}>
                    - Monday -
                </h1>
            </div>
        );
    }

    return (
        <div className="final-scene-container">
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                <div className="high-fi-dashboard">
                    <div className="hf-header"><div style={{ width: 30, height: 30, background: "#fff", borderRadius: "50%" }}></div><div style={{ color: "#fff", fontWeight: 800 }}>OLYMPUS</div></div>
                    <div className="hf-chart-area">{[...Array(20)].map((_, i) => <div key={i} className="hf-candle" style={{ left: `${i * 5}%`, height: 20 + Math.random() * 100, bottom: 20 + Math.random() * 40 }}></div>)}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 10 }}><div style={{ background: "#111", border: "1px solid #222" }}></div><div style={{ background: "#111", border: "1px solid #222" }}></div></div>
                </div>
            </div>

            <div className="hf-ez-card">
                <div style={{ display: "flex", background: "#111", margin: 10, borderRadius: 8, padding: 4 }}>
                    <div style={{ flex: 1, textAlign: "center", padding: 8, color: "#666", fontSize: 11, fontWeight: 700, position: "relative" }}>
                        SWAP
                        {stage === 6 && <div className="click-circle" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>}
                    </div>
                    <div style={{ flex: 1, textAlign: "center", padding: 8, color: "#666", fontSize: 11, fontWeight: 700 }}>EASY</div>
                    <div style={{ flex: 1, textAlign: "center", padding: 8, background: "#222", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>EZ PEEZE</div>
                </div>
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 32, fontFamily: 'Titan One', color: "#4ade80", marginBottom: 4 }}>EZ Peeze</div>
                        <div style={{ fontSize: 12, color: "#888" }}>Will SOL go up or down?</div>
                    </div>
                    <div style={{ background: "#151515", border: "1px solid #222", borderRadius: 16, padding: 20, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 4 }}>CURRENT PRICE</div>
                        <div style={{ fontSize: 42, fontWeight: 800, color: "#fff" }}>82.16</div>
                        <div style={{ fontSize: 10, color: "#555" }}>SOL / USDC</div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1, height: 120, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
                            <div style={{ fontSize: 30 }}>📈</div>
                            <div style={{ color: "#22c55e", fontWeight: 800, marginTop: 8 }}>UP</div>
                            {stage === 1 && <div className="click-circle" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>}
                        </div>
                        <div style={{ flex: 1, height: 120, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
                            <div style={{ fontSize: 30 }}>📉</div>
                            <div style={{ color: "#ef4444", fontWeight: 800, marginTop: 8 }}>DOWN</div>
                            {stage === 3 && <div className="click-circle" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* KEYWORDS */}
            {stage >= 2 && <div className="keyword-pop" style={{ top: "25%", left: "10%", color: "#4ade80" }}>PREDICT</div>}
            {stage >= 4 && <div className="keyword-pop" style={{ top: "40%", right: "10%", color: "#ef4444" }}>EARN</div>}
            {stage >= 5 && <div className="keyword-pop" style={{ bottom: "5%", left: "10%", color: "#ffd700", fontSize: "3vw" }}>REWARDS</div>}

            {stage >= 7 && <div className="keyword-pop" style={{ top: "15%", left: "50%", transform: "translateX(-50%)", color: "#fff", fontSize: "3vw" }}>SWAP</div>}
            {stage >= 8 && <div className="keyword-pop" style={{ bottom: "25%", right: "5%", color: "#60a5fa", fontSize: "2.5vw" }}>PROVIDE LIQUIDITY</div>}
            {stage >= 9 && <div className="keyword-pop" style={{ top: "50%", left: "5%", color: "#a78bfa", fontSize: "2.5vw", maxWidth: 300 }}>AUTOMATED MARKET MAKING</div>}

            {stage >= 10 && <div className="keyword-pop" style={{ top: "10%", right: "5%", color: "#fb923c", fontSize: "2.5vw" }}>PRE-TGE COINS</div>}
            {stage >= 11 && <div className="keyword-pop" style={{ bottom: "10%", right: "10%", color: "#fff", fontSize: "4vw" }}>ALL COINS</div>}
        </div>
    );
};

// ─── STRIKE TEXT WITH "HUGE X" ───
const StrikeText = () => {
    const [crossed, setCrossed] = useState(false);
    useEffect(() => { setTimeout(() => setCrossed(true), 800); }, []);
    return (
        <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.5s" }}>
            <h2 className="bubble-text" style={{ fontSize: "5vw", color: "#ccc" }}>
                But couldn't <span style={{ position: "relative", display: "inline-block", color: "#ef4444", padding: "0 10px" }}>
                    earn
                    <div className={crossed ? "x-mark x-active" : "x-mark"}>
                        <div className="x-line one"></div>
                        <div className="x-line two"></div>
                    </div>
                </span> from it
            </h2>
        </div>
    );
};

// ─── MOUNTAIN RISE ANIMATION ───
const MountainScene = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const peakX = w / 2;
    const peakY = h * 0.45;
    let slopeL = [[0, h]];
    for (let x = 0; x <= peakX; x += 40) {
        let y = h - ((x / peakX) * (h - peakY)) + (Math.random() - 0.5) * 30; if (x >= peakX - 25) y = peakY; slopeL.push([x, y]);
    }
    const pathL = "M " + slopeL.map(p => p.join(",")).join(" L ");
    let slopeR = [[w, h]];
    for (let x = w; x >= peakX; x -= 40) {
        let y = h - (((w - x) / (w - peakX)) * (h - peakY)) + (Math.random() - 0.5) * 30; if (x <= peakX + 25) y = peakY; slopeR.push([x, y]);
    }
    const pathR = "M " + slopeR.map(p => p.join(",")).join(" L ");

    return (
        <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            <div className="lightning-flash" style={{ animationDuration: "0.5s", animationDelay: "6s" }} />
            <svg style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <defs><filter id="whiteGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter></defs>
                <path d={pathL} stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" className="mountain-line" filter="url(#whiteGlow)" />
                <path d={pathR} stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" className="mountain-line" filter="url(#whiteGlow)" />
            </svg>
            <div style={{ position: "absolute", top: "10%", left: 0, width: "100%", textAlign: "center", animation: "popIn 0.3s 6s backwards", opacity: 1, animationFillMode: "both" }}>
                <div style={{ transform: "scale(5)", marginBottom: 50, display: "inline-block", filter: "drop-shadow(0 10px 20px #000)" }}>
                    <OlympusLogo theme="dark" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="bubble-text" style={{ fontSize: "5vw", color: "#ffd700", textShadow: "0 10px 20px #000" }}>THE FIRST PREDICTION DEX</div>
                    <div className="bubble-text" style={{ fontSize: "2vw", color: "#fff", textShadow: "0 5px 10px #000", opacity: 0.8 }}>REFERRAL SYSTEM LIVE SOON</div>
                </div>
            </div>
        </div>
    );
};

// ─── BIG RED CRASH (With Logos) ───
const BigCrashScene = ({ visible }) => {
    const [progress, setProgress] = useState(0);
    const w = window.innerWidth;
    const h = window.innerHeight;

    useEffect(() => {
        if (visible) {
            let start = Date.now();
            const loop = () => {
                const p = Math.min(1, (Date.now() - start) / 4000);
                setProgress(p);
                if (p < 1) requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }
    }, [visible]);

    const points = [[w * 0.1, h * 0.1], [w * 0.2, h * 0.15], [w * 0.18, h * 0.3], [w * 0.3, h * 0.4], [w * 0.28, h * 0.5], [w * 0.4, h * 0.55], [w * 0.5, h * 0.6], [w * 0.48, h * 0.75], [w * 0.65, h * 0.8], [w * 0.75, h * 0.85], [w * 0.9, h * 0.95]];
    const pathD = "M " + points.map(p => p.join(",")).join(" L ");
    const totalLen = 3000;

    const show1 = progress > 0.2;
    const show = (idx) => progress > (0.2 + idx * 0.2);

    return (
        <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            <svg style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <path d={pathD} stroke="#ef4444" strokeWidth="12" fill="none" strokeDasharray={totalLen} strokeDashoffset={totalLen - (progress * totalLen)} filter="drop-shadow(0 0 20px red)" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0 }}>
                <div style={{ position: "absolute", top: h * 0.2 - 30, left: w * 0.3, display: "flex", alignItems: "center", gap: 10 }} hidden={!show(0)} className={show(0) ? "shape-appear" : ""}>
                    <ChainLogo name="Eclipse" fallback={<EclipseSvg />} /> <span className="bubble-text" style={{ fontSize: 40, color: "#fff" }}>Eclipse</span>
                </div>
                <div style={{ position: "absolute", top: h * 0.4 - 30, left: w * 0.5, display: "flex", alignItems: "center", gap: 10 }} hidden={!show(1)} className={show(1) ? "shape-appear" : ""}>
                    <ChainLogo name="Monad" fallback={<MonadSvg />} /> <span className="bubble-text" style={{ fontSize: 40, color: "#fff" }}>Monad</span>
                </div>
                <div style={{ position: "absolute", top: h * 0.6 - 30, left: w * 0.3, display: "flex", alignItems: "center", gap: 10 }} hidden={!show(2)} className={show(2) ? "shape-appear" : ""}>
                    <ChainLogo name="Berachain" fallback={<BeraSvg />} /> <span className="bubble-text" style={{ fontSize: 40, color: "#fff" }}>Berachain</span>
                </div>
                <div style={{ position: "absolute", top: h * 0.75 - 30, left: w * 0.7, display: "flex", alignItems: "center", gap: 10 }} hidden={!show(3)} className={show(3) ? "shape-appear" : ""}>
                    <ChainLogo name="Celestia" fallback={<CelestiaSvg />} /> <span className="bubble-text" style={{ fontSize: 40, color: "#fff" }}>Celestia</span>
                </div>
            </div>
        </div>
    );
};

// ─── MAIN APP ───
const DemoVideo = () => {
    const [step, setStep] = useState(0);
    useEffect(() => {
        setTimeout(() => setStep(1), 2000);
        setTimeout(() => setStep(2), 7000);
        setTimeout(() => setStep(3), 10000);
        setTimeout(() => setStep(4), 13000);
        setTimeout(() => setStep(5), 15000);
        setTimeout(() => setStep(6), 24000);
    }, []);

    return (
        <div className="cinematic-container" style={{ width: "100vw", height: "100vh", position: "relative" }}>
            <style>{styles}</style>

            {step === 0 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, animation: "fadeInUp 0.5s" }}>
                    <h1 className="bubble-text" style={{ fontSize: "12vw", color: "#fff", margin: 0 }}>RIP <span style={{ color: "#ef4444" }}>2025</span></h1>
                </div>
            )}
            {step === 1 && <BigCrashScene visible={true} />}
            {step === 2 && <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.5s" }}><h2 className="bubble-text" style={{ fontSize: "5vw", color: "#ccc" }}>Smart enough to <span style={{ color: "#4ade80" }}>predict</span> this</h2></div>}
            {step === 3 && <StrikeText />}
            {step === 4 && <div className="hero-text" style={{ top: "35%", animation: "popIn 0.5s" }}><h1 className="bubble-text" style={{ fontSize: "10vw", color: "#fff" }}>NOW YOU CAN</h1></div>}
            {step === 5 && <MountainScene />}
            {step === 6 && <FinalScene />}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DemoVideo />);
