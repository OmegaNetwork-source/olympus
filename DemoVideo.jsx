import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import OlympusLogo from "./OlympusLogo.jsx";

// ─── STYLES ───
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap');
  
  body, html { margin: 0; padding: 0; overflow: hidden; background: #050505; }
  
  .cinematic-container {
    perspective: 1000px;
    font-family: 'Inter', sans-serif;
  }
  
  .bubble-text {
    font-family: 'Titan One', cursive;
    text-shadow: 4px 4px 0px #000;
  }

  @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 80% { opacity: 1; transform: scale(1.1); } 100% { transform: scale(1); } }
  
  .hero-text { 
    position: absolute; width: 100%; text-align: center; z-index: 20; 
    pointer-events: none; text-shadow: 0 10px 40px rgba(0,0,0,0.9); 
  }

  /* Mountain Reveal Animation */
  .mountain-path {
    stroke-dasharray: 2000;
    stroke-dashoffset: 2000;
    animation: drawMountain 3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }
  @keyframes drawMountain { to { stroke-dashoffset: 0; } }
  
  /* DASHBOARD & UI STYLES (Keep existing) */
  .dash-container {
    background: #000; width: 100%; height: 100%;
    display: flex; flex-direction: column; padding: 10px; box-sizing: border-box; gap: 8px; color: #ccc; font-size: 11px;
    transition: filter 1s transform 1s;
  }
  .bg-blurred { filter: blur(8px) brightness(0.4); transform: scale(0.98); }
  .dash-header { display: flex; align-items: center; gap: 20px; padding: 0 10px 10px; border-bottom: 1px solid #222; }
  .dash-grid { display: grid; grid-template-columns: 280px 1fr 340px; gap: 8px; flex: 1; overflow: hidden; }
  .panel { background: #0E0E0E; border: 1px solid #1F1F1F; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
  
  .ez-card {
    background: #0E0E0E; border: 1px solid #333; border-radius: 20px; padding: 0;
    width: 340px; display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.8);
  }
  .ez-header { display: flex; margin: 10px; background: #111; border-radius: 8px; padding: 2px; }
  .ez-tab { flex: 1; text-align: center; padding: 8px 0; color: #666; fontWeight: 700; font-size: 10px; }
  .ez-tab.active { background: #222; color: #fff; border-radius: 6px; }
  .ez-content { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
  .ez-title { text-align: center; }
  .ez-logo { font-size: 24px; font-weight: 900; background: linear-gradient(90deg, #4ade80, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'Titan One', cursive; letter-spacing: 1px; }
  .ez-price-box { background: #151515; border: 1px solid #222; border-radius: 12px; padding: 16px 0; text-align: center; }
  .ez-price { fontSize: 36px; color: #fff; fontWeight: 700; }
  .ez-btn { flex: 1; height: 100px; border-radius: 12px; display: flex; flex-direction: column; alignItems: center; justifyContent: center; gap: 4; cursor: pointer; transition: transform 0.2s; }
  .btn-up { border: 1px solid rgba(34,197,94,0.3); background: rgba(34,197,94,0.1); }
  .btn-down { border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.1); }
`;

// ─── SVG LOGOS ───
const EclipseLogo = () => (<svg width="40" height="40" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="black" stroke="#fff" strokeWidth="4" /><path d="M 50 5 A 45 45 0 0 1 50 95 A 35 35 0 0 0 50 5 Z" fill="#fff" /></svg>);
const MonadLogo = () => (<svg width="40" height="40" viewBox="0 0 100 100"><path d="M 20 80 L 20 20 L 50 50 L 80 20 L 80 80" stroke="#8A2BE2" strokeWidth="12" fill="none" strokeLinecap="round" /></svg>);
const AbstractLogo = () => (<svg width="40" height="40" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" rx="20" fill="none" stroke="#00CED1" strokeWidth="8" /><circle cx="70" cy="30" r="10" fill="#00CED1" /></svg>);
const CelestiaLogo = () => (<svg width="40" height="40" viewBox="0 0 100 100"><rect x="20" y="55" width="25" height="25" fill="#FF00FF" /><rect x="55" y="55" width="25" height="25" fill="#FF00FF" /><rect x="55" y="20" width="25" height="25" fill="#FF00FF" /></svg>);

// ─── DASHBOARD BG ───
const DashboardBg = ({ blur }) => (
    <div className={`dash-container ${blur ? "bg-blurred" : ""}`}>
        <div className="dash-header">
            <div style={{ fontWeight: 800, fontSize: 16, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%" }}></div>SOL / USDC</div>
            <div style={{ fontSize: 18, color: "#22c55e", fontWeight: 700 }}>$82.16</div>
            <div style={{ flex: 1 }}></div> <div>Prediction</div>
        </div>
        <div className="dash-grid">
            <div className="panel" style={{ padding: 12 }}>
                {["Solana flips ETH volume", "Jupiter airdrop imminent"].map((n, i) => (<div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #222", color: "#ddd", fontWeight: 600 }}>{n}</div>))}
            </div>
            <div className="panel" style={{ position: "relative", background: "#050505" }}></div>
            <div className="panel" style={{ opacity: 0.3 }}><div className="ez-card" style={{ opacity: 0 }}></div></div>
        </div>
    </div>
);

// ─── EZ PEEZE CARD ───
const EzPeezeCard = () => (
    <div className="ez-card">
        <div className="ez-header"><div className="ez-tab">SWAP</div><div className="ez-tab active">EZ PEEZE</div></div>
        <div className="ez-content">
            <div className="ez-title"><div className="ez-logo">EZ Peeze</div><div style={{ fontSize: 10, color: "#666" }}>Will SOL go up or down?</div></div>
            <div className="ez-price-box"><div style={{ fontSize: 9, color: "#555" }}>CURRENT PRICE</div><div className="ez-price">82.16</div></div>
            <div style={{ display: "flex", gap: 10 }}>
                <button className="ez-btn btn-up"><div style={{ fontSize: 24 }}>📈</div><div style={{ color: "#22c55e", fontWeight: 800 }}>UP</div></button>
                <button className="ez-btn btn-down"><div style={{ fontSize: 24 }}>📉</div><div style={{ color: "#ef4444", fontWeight: 800 }}>DOWN</div></button>
            </div>
        </div>
    </div>
);

// ─── MOUNTAIN RISE ANIMATION ───
const MountainScene = () => {
    // Generate mountain path
    // Start bottom left -> Jagged up to Center Peak -> Jagged down to bottom right
    const w = window.innerWidth;
    const h = window.innerHeight;
    const peakX = w / 2;
    const peakY = h * 0.3; // High peak

    // Create points
    let points = [[0, h]];
    // Left slope
    for (let x = 0; x < peakX; x += 50) {
        let y = h - ((x / peakX) * (h - peakY)) + (Math.random() - 0.5) * 50;
        points.push([x, y]);
    }
    points.push([peakX, peakY]); // Peak
    // Right slope
    for (let x = peakX + 50; x < w; x += 50) {
        let y = peakY + (((x - peakX) / (w - peakX)) * (h - peakY)) + (Math.random() - 0.5) * 50;
        points.push([x, y]);
    }
    points.push([w, h]);

    const pathD = "M " + points.map(p => p.join(",")).join(" L ");

    return (
        <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            <svg style={{ width: "100%", height: "100%", overflow: "visible" }}>
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="greenGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* The Green Line */}
                <path d={pathD} stroke="#4ade80" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"
                    className="mountain-path" filter="drop-shadow(0 0 15px rgba(74, 222, 128, 0.6))" />
                {/* Fill under the mountain (Fade in) */}
                <path d={`${pathD} L ${w},${h} L 0,${h} Z`} fill="url(#greenGrad)" style={{ opacity: 0, animation: "fadeInUp 1s 1s forwards" }} />
            </svg>

            {/* Olympus Logo at Peak */}
            <div style={{
                position: "absolute", top: peakY - 100, left: peakX - 250, width: 500,
                textAlign: "center", animation: "popIn 1s 2s forwards", opacity: 0
            }}>
                <div style={{ transform: "scale(4)", marginBottom: 40, display: "inline-block" }}>
                    <OlympusLogo theme="dark" />
                </div>
                <div className="bubble-text" style={{ fontSize: "3vw", color: "#ffd700", marginTop: 20 }}>THE FIRST PREDICTION DEX</div>
                <div className="bubble-text" style={{ marginTop: 20, fontSize: "1.5vw", color: "#fff" }}>REFERRAL SYSTEM LIVE SOON</div>
            </div>
        </div>
    );
};

// ─── CRASH ARROW (Red) ───
const CrashScene = ({ visible }) => {
    const [progress, setProgress] = useState(0);
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

    const points = [[100, 50], [250, 100], [200, 300], [300, 350], [250, 500], [400, 700], [350, 900], [500, 1200]];
    const pathD = "M " + points.map(p => p.join(",")).join(" L ");
    const totalLen = 1500;

    // Chain reveal thresholds
    const show1 = progress > 0.15;
    const show2 = progress > 0.35;
    const show3 = progress > 0.55;
    const show4 = progress > 0.75;
    const shake = progress > 0 && progress < 1;

    return (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, animation: shake ? "crashShake 0.1s infinite" : "none" }}>
            <svg style={{ width: "100%", height: "100%" }}>
                <path d={pathD} stroke="#ef4444" strokeWidth="8" fill="none" strokeDasharray={totalLen} strokeDashoffset={totalLen - (progress * totalLen)} filter="drop-shadow(0 0 10px red)" />
            </svg>
            <div style={{ position: "absolute", inset: 0 }}>
                <div style={{ position: "absolute", top: "15%", left: "30%", opacity: show1 ? 1 : 0, transition: "0.2s" }}><EclipseLogo /> <span className="bubble-text" style={{ fontSize: 30, color: "#fff" }}>Eclipse</span></div>
                <div style={{ position: "absolute", top: "35%", left: "40%", opacity: show2 ? 1 : 0, transition: "0.2s" }}><MonadLogo /> <span className="bubble-text" style={{ fontSize: 30, color: "#fff" }}>Monad</span></div>
                <div style={{ position: "absolute", top: "55%", left: "30%", opacity: show3 ? 1 : 0, transition: "0.2s" }}><AbstractLogo /> <span className="bubble-text" style={{ fontSize: 30, color: "#fff" }}>Abstract</span></div>
                <div style={{ position: "absolute", top: "75%", left: "45%", opacity: show4 ? 1 : 0, transition: "0.2s" }}><CelestiaLogo /> <span className="bubble-text" style={{ fontSize: 30, color: "#fff" }}>Celestia</span></div>
            </div>
        </div>
    );
};

// ─── MAIN APP ───
const DemoVideo = () => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        // 0: RIP
        setTimeout(() => setStep(1), 2000); // 1: Crash Starts
        setTimeout(() => setStep(2), 7000); // 2: Smart (Text)
        setTimeout(() => setStep(3), 10000); // 3: Earn (Text)
        setTimeout(() => setStep(4), 13000); // 4: NOW YOU CAN (Transition)
        setTimeout(() => setStep(5), 15000); // 5: Mountain Rise (Olympus)
        setTimeout(() => setStep(6), 21000); // 6: Final UI
    }, []);

    return (
        <div className="cinematic-container" style={{ width: "100vw", height: "100vh", position: "relative" }}>
            <style>{styles}</style>

            {/* BACKGROUNDS */}
            {step === 6 && <div style={{ position: "absolute", inset: 0, zIndex: 1 }}><DashboardBg blur={true} /></div>}

            {/* SCENES */}
            {step === 0 && <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.5s" }}><h1 className="bubble-text" style={{ fontSize: "10vw", color: "#fff" }}>RIP <span style={{ color: "#ef4444" }}>2025</span></h1></div>}

            {/* CRASH */}
            {step === 1 && <CrashScene visible={true} />}

            {/* TEXT OVERLAYS */}
            {step === 2 && <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.5s" }}><h2 className="bubble-text" style={{ fontSize: "5vw", color: "#ccc" }}>Smart enough to <span style={{ color: "#4ade80" }}>predict</span> this</h2></div>}
            {step === 3 && <div className="hero-text" style={{ top: "40%", animation: "fadeInUp 0.5s" }}><h2 className="bubble-text" style={{ fontSize: "5vw", color: "#ccc" }}>But couldn't <span style={{ color: "#ef4444", textDecoration: "line-through" }}>earn</span> from it</h2></div>}

            {step === 4 && <div className="hero-text" style={{ top: "35%", animation: "popIn 0.5s" }}><h1 className="bubble-text" style={{ fontSize: "10vw", color: "#fff" }}>NOW YOU CAN</h1></div>}

            {/* MOUNTAIN RISE & REVEAL */}
            {step === 5 && <MountainScene />}

            {/* FINAL UI */}
            {step === 6 && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", animation: "popIn 0.5s" }}>
                    <div style={{ transform: "scale(1.2)" }}><EzPeezeCard /></div>
                </div>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DemoVideo />);
