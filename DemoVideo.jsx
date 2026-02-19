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
  
  /* LIGHTNING FLASH */
  @keyframes flashLightning { 
    0% { opacity: 0; } 5% { opacity: 1; background: #fff; } 10% { opacity: 0; } 15% { opacity: 1; background: #fff; } 30% { opacity: 0; } 
  }
  .lightning-flash { position: absolute; inset: 0; pointer-events: none; animation: flashLightning 0.5s 6s linear forwards; opacity: 0; z-index: 50; }

  /* FINAL SCENE STYLES */
  .final-bg-img {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
    filter: blur(8px) brightness(0.3); transform: scale(1.05);
  }
  .final-center-card {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.8);
    width: 400px; height: auto;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.9);
    animation: popIn 0.5s forwards;
    z-index: 10;
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
    z-index: 20;
  }
  
  /* KEYWORD POPUPS */
  .keyword-pop {
     position: absolute; font-family: 'Titan One', cursive; color: #fff; 
     text-shadow: 0 5px 15px #000; font-size: 4vw; z-index: 30;
     animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
  }

  .c-logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; background: #000; }
  .shape-appear { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards; }
`;

// ─── SVG LOGO FALLBACKS ───
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

    // Sequence for clicks and words
    useEffect(() => {
        setTimeout(() => setStage(1), 1000); // Click UP
        setTimeout(() => setStage(2), 1500); // Show PREDICT
        setTimeout(() => setStage(3), 2500); // Click DOWN
        setTimeout(() => setStage(4), 3000); // Show EARN
        setTimeout(() => setStage(5), 4000); // Show REWARDS
    }, []);

    // NOTE: Replace these src with the actual uploaded images if hosted, 
    // for now using placeholders based on description or base64 if provided.
    // Assuming local file structure or public folder usage for the user
    // Since I can't see the file system images, I will use the user provided descriptions to create styled divs or use placeholder URLS that WOULD be the images.
    // Ideally the user puts 'dashboard.png' and 'mobile-card.png' in public folder.
    // For this demo, I will use a screenshot-like placeholder using the user's uploaded images if they were URLs, but they are files.
    // I will use CSS backgrounds that look like the images.

    // Background Image (2nd image)
    const bgUrl = "https://i.imgur.com/G5g2G8r.jpeg"; // Placeholder for the dark dashboard screenshot
    // Center Card Image (3rd image)
    const cardUrl = "https://i.imgur.com/8Q6Zq8M.png"; // Placeholder for the mobile UI card

    return (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, overflow: "hidden" }}>
            {/* Background */}
            <div className="final-bg-img" style={{
                background: `url(${bgUrl}) center/cover no-repeat`, /* In real app use <img src="/dashboard.png" /> */
                backgroundColor: "#111"
            }}>
                {/* Fallback visual if image fails */}
                <div style={{ width: "100%", height: "100%", background: "linear-gradient(45deg, #111, #000)" }}></div>
            </div>

            {/* Center Card */}
            <img src={cardUrl} className="final-center-card" alt="EZ Peeze Interface"
                style={{
                    // fallback style if image missing
                    background: "#1a1a1a", border: "1px solid #333", minHeight: 600
                }}
            />

            {/* Interactions Overlay */}
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 400, height: 600, pointerEvents: "none" }}>
                {/* Approximate button locations based on mobile card image */}
                {/* UP Button area: Bottom Left */}
                {stage === 1 && <div className="click-circle" style={{ bottom: 100, left: 60 }}></div>}

                {/* DOWN Button area: Bottom Right */}
                {stage === 3 && <div className="click-circle" style={{ bottom: 100, right: 60 }}></div>}
            </div>

            {/* Keywords */}
            {stage >= 2 && <div className="keyword-pop" style={{ top: "20%", left: "15%", color: "#4ade80" }}>PREDICT</div>}
            {stage >= 4 && <div className="keyword-pop" style={{ top: "50%", right: "15%", color: "#ef4444" }}>EARN</div>}
            {stage >= 5 && <div className="keyword-pop" style={{ bottom: "15%", left: "50%", transform: "translateX(-50%)", color: "#ffd700", fontSize: "5vw" }}>REWARDS</div>}
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
            <div className="lightning-flash" />
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

    // Use the image URLs provided in the user request context (I'll define these in FinalScene)
    // For the actual code, since I can't upload files, I will use the placeholder <img src> logic 
    // but pointing to where these would be if I could upload them. 
    // I will assume the user has these images locally or I'll use placeholders.
    // Actually, since this is a React component string, I'll rely on online placeholders or 
    // if feasible use the data URI if I had it. 
    // Best approach: Use the previously viewed screenshot structure but enhanced.
    // Wait, I don't have the image data. I will trust the user to replace the src or 
    // I will use a generic placeholder that looks *exactly* like the request description.

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

            {/* Step 6: Final UI with Click Interaction */}
            {step === 6 && <FinalScene />}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DemoVideo />);
