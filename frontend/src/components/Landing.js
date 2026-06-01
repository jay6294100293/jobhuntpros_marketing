import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────
   SwiftPack AI — Landing Page
   Aesthetic: "Kinetic Warmth"
   - Warm cream base, deep black ink, hot coral accent
   - Apple-grade fluid motion: staggered reveals, parallax, magnetic hover
   - Typography: Syne (display) + DM Sans (body) from Google Fonts
   - Nothing remotely close to JobFlow's dark-corporate look
───────────────────────────────────────────── */

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
`;

const CSS = `
  :root {
    --cream: #FAFAF7;
    --surface: #F2F1EC;
    --border: #E8E6DE;
    --ink: #0C0C0A;
    --ink-muted: #6B6860;
    --coral: #FF5C28;
    --coral-light: #FFF0EC;
    --coral-mid: #FFD4C4;
  }

  .sp-landing * { box-sizing: border-box; margin: 0; padding: 0; }
  .sp-landing { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--ink); overflow-x: hidden; }

  /* ── Noise overlay ── */
  .sp-landing::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  /* ── Navbar ── */
  .sp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px; height: 64px;
    background: rgba(250,250,247,0.85);
    backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid var(--border);
    transition: box-shadow 0.3s ease;
  }
  .sp-nav.scrolled { box-shadow: 0 1px 40px rgba(12,12,10,0.06); }
  .sp-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 20px; letter-spacing: -0.5px; color: var(--ink); text-decoration: none; display: flex; align-items: center; gap: 8px; }
  .sp-logo-dot { width: 8px; height: 8px; background: var(--coral); border-radius: 50%; display: inline-block; }
  .sp-nav-links { display: flex; align-items: center; gap: 8px; }
  .sp-btn-ghost { padding: 8px 20px; border-radius: 100px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: var(--ink); background: transparent; border: 1.5px solid var(--border); cursor: pointer; text-decoration: none; transition: all 0.2s ease; }
  .sp-btn-ghost:hover { background: var(--surface); border-color: var(--ink-muted); }
  .sp-btn-primary { padding: 8px 20px; border-radius: 100px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #fff; background: var(--ink); border: none; cursor: pointer; text-decoration: none; transition: all 0.25s ease; letter-spacing: -0.1px; }
  .sp-btn-primary:hover { background: var(--coral); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,92,40,0.35); }

  /* ── Hero ── */
  .sp-hero {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 120px 40px 80px; text-align: center; position: relative;
  }
  .sp-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 16px; border-radius: 100px;
    background: var(--coral-light); border: 1px solid var(--coral-mid);
    font-size: 13px; font-weight: 500; color: var(--coral);
    margin-bottom: 32px;
    opacity: 0; animation: fadeUp 0.6s ease 0.2s forwards;
  }
  .sp-badge-pulse { width: 6px; height: 6px; background: var(--coral); border-radius: 50%; animation: pulse 2s ease infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
  .sp-hero-headline {
    font-family: 'Syne', sans-serif; font-weight: 800; letter-spacing: -2.5px; line-height: 1.02;
    font-size: clamp(52px, 7vw, 96px); color: var(--ink);
    max-width: 900px; margin-bottom: 24px;
    opacity: 0; animation: fadeUp 0.8s ease 0.35s forwards;
  }
  .sp-headline-coral { color: var(--coral); position: relative; display: inline-block; }
  .sp-headline-coral::after {
    content: ''; position: absolute; left: 0; bottom: -4px; height: 4px;
    width: 100%; background: var(--coral); border-radius: 2px;
    transform: scaleX(0); transform-origin: left;
    animation: lineIn 0.6s ease 1.2s forwards;
  }
  @keyframes lineIn { to { transform: scaleX(1); } }
  .sp-hero-sub {
    font-size: 20px; line-height: 1.6; color: var(--ink-muted); font-weight: 400;
    max-width: 560px; margin-bottom: 48px;
    opacity: 0; animation: fadeUp 0.8s ease 0.5s forwards;
  }
  .sp-hero-cta {
    display: flex; gap: 12px; align-items: center; justify-content: center;
    flex-wrap: wrap; margin-bottom: 64px;
    opacity: 0; animation: fadeUp 0.8s ease 0.65s forwards;
  }
  .sp-btn-hero {
    padding: 16px 36px; border-radius: 100px; font-family: 'DM Sans', sans-serif;
    font-size: 16px; font-weight: 600; color: #fff; background: var(--ink);
    border: none; cursor: pointer; text-decoration: none;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    letter-spacing: -0.2px;
  }
  .sp-btn-hero:hover { background: var(--coral); transform: translateY(-2px) scale(1.02); box-shadow: 0 16px 40px rgba(255,92,40,0.4); }
  .sp-btn-hero-outline {
    padding: 16px 36px; border-radius: 100px; font-family: 'DM Sans', sans-serif;
    font-size: 16px; font-weight: 500; color: var(--ink-muted);
    background: transparent; border: 1.5px solid var(--border);
    cursor: pointer; text-decoration: none;
    transition: all 0.2s ease;
  }
  .sp-btn-hero-outline:hover { border-color: var(--ink-muted); color: var(--ink); background: var(--surface); }
  @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }

  /* ── Demo card ── */
  .sp-demo-wrap {
    width: 100%; max-width: 800px; position: relative;
    opacity: 0; animation: fadeUp 1s ease 0.8s forwards;
  }
  .sp-demo-card {
    background: #fff; border-radius: 20px; padding: 32px;
    box-shadow: 0 2px 0 var(--border), 0 32px 80px rgba(12,12,10,0.1), 0 4px 16px rgba(12,12,10,0.06);
    border: 1px solid var(--border); text-align: left;
  }
  .sp-demo-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
  .sp-demo-dot { width: 12px; height: 12px; border-radius: 50%; }
  .sp-demo-url-row { display: flex; align-items: center; gap: 12px; background: var(--surface); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; border: 1px solid var(--border); }
  .sp-demo-url-text { font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--ink-muted); flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .sp-demo-url-text span { color: var(--ink); }
  .sp-demo-go { padding: 8px 18px; background: var(--ink); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: 'DM Sans', sans-serif; transition: background 0.2s ease; }
  .sp-demo-go:hover { background: var(--coral); }
  .sp-demo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .sp-demo-item {
    background: var(--surface); border-radius: 12px; padding: 16px 14px;
    border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;
    transition: all 0.25s ease;
  }
  .sp-demo-item:hover { background: var(--coral-light); border-color: var(--coral-mid); transform: translateY(-2px); }
  .sp-demo-item-icon { font-size: 20px; }
  .sp-demo-item-label { font-size: 12px; font-weight: 600; color: var(--ink); letter-spacing: 0.2px; }
  .sp-demo-item-count { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: var(--coral); }
  .sp-demo-timer { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 20px; font-size: 13px; color: var(--ink-muted); }
  .sp-demo-timer-badge { background: var(--coral-light); color: var(--coral); padding: 4px 10px; border-radius: 100px; font-weight: 700; font-size: 13px; }

  /* ── Stats strip ── */
  .sp-stats { background: var(--ink); padding: 32px 40px; display: flex; justify-content: center; gap: 80px; flex-wrap: wrap; }
  .sp-stat { text-align: center; }
  .sp-stat-num { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 40px; color: #fff; letter-spacing: -1.5px; line-height: 1; }
  .sp-stat-num span { color: var(--coral); }
  .sp-stat-label { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 6px; font-weight: 400; }

  /* ── How it works ── */
  .sp-section { padding: 100px 40px; max-width: 1100px; margin: 0 auto; }
  .sp-section-tag { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--coral); margin-bottom: 16px; }
  .sp-section-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(36px, 4vw, 56px); letter-spacing: -1.5px; line-height: 1.1; color: var(--ink); margin-bottom: 16px; }
  .sp-section-sub { font-size: 18px; color: var(--ink-muted); max-width: 520px; line-height: 1.6; }
  .sp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 60px; }
  .sp-step {
    background: var(--surface); border-radius: 20px; padding: 32px 28px;
    border: 1px solid var(--border); position: relative; overflow: hidden;
    transition: all 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
  }
  .sp-step::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, var(--coral-light) 0%, transparent 60%); opacity: 0; transition: opacity 0.3s ease; }
  .sp-step:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(12,12,10,0.1); border-color: var(--coral-mid); }
  .sp-step:hover::before { opacity: 1; }
  .sp-step-num { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 48px; color: var(--border); line-height: 1; margin-bottom: 16px; transition: color 0.3s ease; position: relative; z-index: 1; }
  .sp-step:hover .sp-step-num { color: var(--coral-mid); }
  .sp-step-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 20px; color: var(--ink); margin-bottom: 10px; position: relative; z-index: 1; }
  .sp-step-desc { font-size: 15px; color: var(--ink-muted); line-height: 1.6; position: relative; z-index: 1; }

  /* ── Features ── */
  .sp-features-wrap { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .sp-features { padding: 100px 40px; max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
  .sp-features-list { display: flex; flex-direction: column; gap: 24px; }
  .sp-feature {
    display: flex; gap: 16px; align-items: flex-start; padding: 20px;
    border-radius: 16px; cursor: pointer; transition: all 0.25s ease;
  }
  .sp-feature.active, .sp-feature:hover { background: #fff; box-shadow: 0 4px 24px rgba(12,12,10,0.07); }
  .sp-feature-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--coral-light); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; border: 1px solid var(--coral-mid); }
  .sp-feature-content {}
  .sp-feature-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; color: var(--ink); margin-bottom: 4px; }
  .sp-feature-desc { font-size: 14px; color: var(--ink-muted); line-height: 1.5; }
  .sp-features-visual { position: relative; }
  .sp-visual-card {
    background: #fff; border-radius: 20px; padding: 32px;
    box-shadow: 0 2px 0 var(--border), 0 24px 60px rgba(12,12,10,0.1);
    border: 1px solid var(--border);
  }
  .sp-visual-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .sp-visual-row:last-child { border-bottom: none; }
  .sp-visual-label { font-size: 14px; color: var(--ink-muted); flex: 1; }
  .sp-visual-value { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: var(--ink); }
  .sp-visual-tag { padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
  .sp-tag-done { background: #E8F9E8; color: #1A7A1A; }
  .sp-tag-gen { background: var(--coral-light); color: var(--coral); }

  /* ── Pricing ── */
  .sp-pricing { padding: 100px 40px; max-width: 1100px; margin: 0 auto; text-align: center; }
  .sp-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 60px; text-align: left; }
  .sp-plan {
    background: #fff; border-radius: 20px; padding: 32px 28px;
    border: 1.5px solid var(--border); position: relative;
    transition: all 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
  }
  .sp-plan.featured {
    border-color: var(--coral); background: var(--ink);
    box-shadow: 0 24px 60px rgba(12,12,10,0.25);
  }
  .sp-plan:not(.featured):hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(12,12,10,0.1); }
  .sp-plan-name { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 16px; }
  .sp-plan.featured .sp-plan-name { color: rgba(255,255,255,0.5); }
  .sp-plan-price { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 52px; letter-spacing: -2px; color: var(--ink); line-height: 1; margin-bottom: 8px; }
  .sp-plan.featured .sp-plan-price { color: #fff; }
  .sp-plan-price sup { font-size: 22px; letter-spacing: 0; vertical-align: super; }
  .sp-plan-price sub { font-size: 16px; font-weight: 400; letter-spacing: 0; color: var(--ink-muted); }
  .sp-plan.featured .sp-plan-price sub { color: rgba(255,255,255,0.5); }
  .sp-plan-desc { font-size: 14px; color: var(--ink-muted); margin-bottom: 28px; line-height: 1.5; }
  .sp-plan.featured .sp-plan-desc { color: rgba(255,255,255,0.6); }
  .sp-plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }
  .sp-plan-features li { font-size: 14px; color: var(--ink-muted); display: flex; align-items: center; gap: 10px; }
  .sp-plan.featured .sp-plan-features li { color: rgba(255,255,255,0.7); }
  .sp-plan-features li::before { content: ''; width: 16px; height: 16px; border-radius: 50%; background: var(--coral-light); border: 1.5px solid var(--coral-mid); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .sp-plan.featured .sp-plan-features li::before { background: rgba(255,92,40,0.2); border-color: rgba(255,92,40,0.4); }
  .sp-plan-cta {
    width: 100%; padding: 14px; border-radius: 12px; font-family: 'DM Sans', sans-serif;
    font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none;
    display: block; text-align: center; transition: all 0.25s ease;
    border: 1.5px solid var(--border); background: transparent; color: var(--ink);
  }
  .sp-plan-cta:hover { background: var(--surface); }
  .sp-plan.featured .sp-plan-cta { background: var(--coral); border-color: var(--coral); color: #fff; }
  .sp-plan.featured .sp-plan-cta:hover { background: #FF7040; box-shadow: 0 8px 24px rgba(255,92,40,0.4); }
  .sp-plan-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--coral); color: #fff; padding: 4px 16px; border-radius: 100px; font-size: 12px; font-weight: 700; white-space: nowrap; }

  /* ── Footer CTA ── */
  .sp-footer-cta {
    background: var(--ink); padding: 100px 40px; text-align: center;
    position: relative; overflow: hidden;
  }
  .sp-footer-cta::before {
    content: ''; position: absolute; width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(255,92,40,0.15) 0%, transparent 70%);
    top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none;
  }
  .sp-footer-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(40px, 5vw, 72px); color: #fff; letter-spacing: -2px; line-height: 1.05; margin-bottom: 24px; position: relative; }
  .sp-footer-sub { font-size: 18px; color: rgba(255,255,255,0.45); margin-bottom: 48px; position: relative; }
  .sp-footer-btn { display: inline-block; padding: 18px 48px; background: var(--coral); color: #fff; border-radius: 100px; font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 600; text-decoration: none; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); position: relative; letter-spacing: -0.2px; }
  .sp-footer-btn:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 20px 50px rgba(255,92,40,0.5); }
  .sp-footer-note { margin-top: 20px; font-size: 13px; color: rgba(255,255,255,0.3); position: relative; }

  /* ── Footer ── */
  .sp-footer { background: var(--ink); padding: 32px 40px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 16px; }
  .sp-footer-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px; color: rgba(255,255,255,0.6); text-decoration: none; }
  .sp-footer-links { display: flex; gap: 24px; }
  .sp-footer-links a { font-size: 13px; color: rgba(255,255,255,0.3); text-decoration: none; transition: color 0.2s; }
  .sp-footer-links a:hover { color: rgba(255,255,255,0.7); }

  /* ── Scroll reveal ── */
  .sp-reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
  .sp-reveal.visible { opacity: 1; transform: translateY(0); }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .sp-nav { padding: 0 20px; }
    .sp-hero { padding: 100px 20px 60px; }
    .sp-steps { grid-template-columns: 1fr; }
    .sp-features { grid-template-columns: 1fr; gap: 40px; }
    .sp-pricing-grid { grid-template-columns: 1fr; }
    .sp-stats { gap: 40px; padding: 32px 20px; }
    .sp-demo-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .sp-section { padding: 60px 20px; }
  }
`;

const TYPING_URL = 'https://yourproduct.com';

export function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [typed, setTyped] = useState('');
  const [activeFeature, setActiveFeature] = useState(0);
  const revealRefs = useRef([]);

  // Navbar scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Typing animation
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= TYPING_URL.length) {
        setTyped(TYPING_URL.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.15 }
    );
    revealRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRevealRef = el => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };

  const features = [
    { icon: '🎬', title: 'AI Video Generation', desc: 'LTX-Video generates cinematic product ads. Free tier gets polished slideshows — Pro gets true AI video.' },
    { icon: '✍️', title: '3 Script Frameworks', desc: 'PAS (Problem-Agitate-Solve), Step-by-Step tutorials, and Before/After transformations — all written in seconds.' },
    { icon: '🎨', title: 'Brand-Matched Posters', desc: 'Extracts your brand colors, fonts, and messaging from any URL. Every poster feels custom-designed.' },
    { icon: '🗣️', title: 'Neural Voice Overs', desc: 'Microsoft Neural voice, background music bed, and animated captions — production-ready out of the box.' },
  ];

  return (
    <>
      <style>{FONT_IMPORT + CSS}</style>
      <div className="sp-landing">

        {/* ── Navbar ── */}
        <nav className={`sp-nav ${scrolled ? 'scrolled' : ''}`}>
          <Link to="/" className="sp-logo">
            <span className="sp-logo-dot" />
            SwiftPack
          </Link>
          <div className="sp-nav-links">
            <Link to="/login" className="sp-btn-ghost">Log in</Link>
            <Link to="/register" className="sp-btn-primary">Start free →</Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="sp-hero">
          <div className="sp-hero-badge">
            <span className="sp-badge-pulse" />
            Now live — join 1,000+ founders using SwiftPack
          </div>

          <h1 className="sp-hero-headline">
            Your product URL.<br />
            A complete{' '}
            <span className="sp-headline-coral">launch pack</span>
            <br />in 90 seconds.
          </h1>

          <p className="sp-hero-sub">
            Paste any product URL. SwiftPack generates 2 videos, 2 scripts,
            and 2 posters — ready to post on every platform.
          </p>

          <div className="sp-hero-cta">
            <Link to="/register" className="sp-btn-hero">Get your launch pack free</Link>
            <Link to="/login" className="sp-btn-hero-outline">See demo →</Link>
          </div>

          <div className="sp-demo-wrap">
            <div className="sp-demo-card">
              <div className="sp-demo-bar">
                <div className="sp-demo-dot" style={{ background: '#FF5F57' }} />
                <div className="sp-demo-dot" style={{ background: '#FEBC2E' }} />
                <div className="sp-demo-dot" style={{ background: '#28C840' }} />
                <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--ink-muted)', fontFamily: 'DM Sans' }}>SwiftPack AI</span>
              </div>
              <div className="sp-demo-url-row">
                <span style={{ fontSize: 16 }}>🔗</span>
                <span className="sp-demo-url-text">
                  <span>{typed}</span>
                  <span style={{ animation: 'pulse 1s ease infinite', color: 'var(--coral)', fontWeight: 700 }}>|</span>
                </span>
                <button className="sp-demo-go">Generate Pack ✦</button>
              </div>
              <div className="sp-demo-grid">
                {[
                  { icon: '🎬', label: 'Videos', count: '2×' },
                  { icon: '✍️', label: 'Scripts', count: '2×' },
                  { icon: '🎨', label: 'Posters', count: '2×' },
                ].map(item => (
                  <div key={item.label} className="sp-demo-item">
                    <span className="sp-demo-item-icon">{item.icon}</span>
                    <span className="sp-demo-item-label">{item.label}</span>
                    <span className="sp-demo-item-count">{item.count}</span>
                  </div>
                ))}
              </div>
              <div className="sp-demo-timer">
                <span>Total generation time</span>
                <span className="sp-demo-timer-badge">≈ 90 seconds</span>
                <span>vs. $400–1,900 agency quote</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <div className="sp-stats">
          {[
            { num: '90', unit: 's', label: 'Average generation time' },
            { num: '6', unit: '×', label: 'Assets per URL' },
            { num: '$0', unit: '', label: 'Cost on free tier' },
            { num: '3', unit: '×', label: 'Script frameworks' },
          ].map(s => (
            <div key={s.label} className="sp-stat">
              <div className="sp-stat-num">{s.num}<span>{s.unit}</span></div>
              <div className="sp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── How it works ── */}
        <div className="sp-section" ref={addRevealRef} style={{ marginBottom: 0 }}>
          <div className="sp-reveal" ref={addRevealRef}>
            <div className="sp-section-tag">How it works</div>
            <h2 className="sp-section-title">Three steps.<br />One launch pack.</h2>
            <p className="sp-section-sub">No designers. No copywriters. No waiting. Just paste and publish.</p>
          </div>
          <div className="sp-steps">
            {[
              { n: '01', title: 'Paste your URL', desc: 'Drop in your product, landing page, or app URL. SwiftPack scrapes your brand colors, headlines, and features automatically.' },
              { n: '02', title: 'AI builds everything', desc: 'Gemini writes the scripts. Neural voice records the voiceover. LTX-Video assembles cinematic video. Pillow designs the posters.' },
              { n: '03', title: 'Download and post', desc: 'Get 2 videos (9:16 TikTok + 16:9 YouTube), 2 scripts (ad + tutorial), and 2 posters (1:1 + 9:16). Ready for every platform.' },
            ].map((step, i) => (
              <div key={i} className="sp-step sp-reveal" ref={addRevealRef} style={{ transitionDelay: `${i * 0.12}s` }}>
                <div className="sp-step-num">{step.n}</div>
                <div className="sp-step-title">{step.title}</div>
                <p className="sp-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Features ── */}
        <div className="sp-features-wrap">
          <div className="sp-features sp-reveal" ref={addRevealRef}>
            <div>
              <div className="sp-section-tag">What you get</div>
              <h2 className="sp-section-title">Production quality.<br />Zero production time.</h2>
              <div className="sp-features-list" style={{ marginTop: 40 }}>
                {features.map((f, i) => (
                  <div
                    key={i}
                    className={`sp-feature ${activeFeature === i ? 'active' : ''}`}
                    onMouseEnter={() => setActiveFeature(i)}
                  >
                    <div className="sp-feature-icon">{f.icon}</div>
                    <div className="sp-feature-content">
                      <div className="sp-feature-title">{f.title}</div>
                      <p className="sp-feature-desc">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sp-features-visual sp-reveal" ref={addRevealRef}>
              <div className="sp-visual-card">
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 20 }}>Launch pack preview</div>
                {[
                  { label: 'TikTok video (9:16)', value: 'magic_launch.mp4', tag: 'done' },
                  { label: 'YouTube video (16:9)', value: 'tutorial.mp4', tag: 'done' },
                  { label: 'Ad script (PAS)', value: '247 words', tag: 'done' },
                  { label: 'Tutorial script', value: '312 words', tag: 'done' },
                  { label: 'Instagram poster', value: '1080×1080', tag: 'done' },
                  { label: 'Story poster', value: '1080×1920', tag: 'gen' },
                ].map((row, i) => (
                  <div key={i} className="sp-visual-row">
                    <span className="sp-visual-label">{row.label}</span>
                    <span className="sp-visual-value">{row.value}</span>
                    <span className={`sp-visual-tag ${row.tag === 'done' ? 'sp-tag-done' : 'sp-tag-gen'}`}>
                      {row.tag === 'done' ? '✓ Done' : '⚡ Generating'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pricing ── */}
        <div className="sp-pricing sp-reveal" ref={addRevealRef}>
          <div className="sp-section-tag">Pricing</div>
          <h2 className="sp-section-title">Simple. Transparent. Cheap.</h2>
          <p className="sp-section-sub" style={{ margin: '0 auto 0' }}>
            What agencies charge $400–1,900 for. Now in 90 seconds.
          </p>
          <div className="sp-pricing-grid">
            {[
              {
                name: 'Free',
                price: '0',
                desc: 'Try SwiftPack with no commitment.',
                features: ['3 launch packs lifetime', '9:16 format only', 'SwiftPack watermark', 'Basic slideshow video'],
                cta: 'Start free',
                href: '/register',
              },
              {
                name: 'Starter',
                price: '19',
                desc: 'For founders launching products every week.',
                features: ['15 packs per month', 'All 3 formats (9:16, 16:9, 1:1)', 'No watermark', 'Background music bed'],
                cta: 'Get Starter',
                href: '/register',
                featured: true,
                badge: 'Most popular',
              },
              {
                name: 'Pro',
                price: '49',
                desc: 'For marketers who need AI video + talking head.',
                features: ['50 packs per month', 'AI-generated video (LTX-Video)', 'Talking head feature', 'Priority rendering'],
                cta: 'Get Pro',
                href: '/register',
              },
            ].map((plan, i) => (
              <div key={i} className={`sp-plan ${plan.featured ? 'featured' : ''}`}>
                {plan.badge && <div className="sp-plan-badge">{plan.badge}</div>}
                <div className="sp-plan-name">{plan.name}</div>
                <div className="sp-plan-price">
                  <sup>$</sup>{plan.price}<sub>/mo</sub>
                </div>
                <p className="sp-plan-desc">{plan.desc}</p>
                <ul className="sp-plan-features">
                  {plan.features.map((f, j) => <li key={j}>{f}</li>)}
                </ul>
                <Link to={plan.href} className="sp-plan-cta">{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className="sp-footer-cta">
          <h2 className="sp-footer-title">Your next launch.<br />90 seconds away.</h2>
          <p className="sp-footer-sub">Paste your URL. Walk away with a complete marketing pack.</p>
          <Link to="/register" className="sp-footer-btn">Create your free pack →</Link>
          <p className="sp-footer-note">No credit card. No design skills. No waiting.</p>
        </div>

        {/* ── Footer ── */}
        <footer className="sp-footer">
          <Link to="/" className="sp-footer-logo">SwiftPack AI</Link>
          <div className="sp-footer-links">
            <Link to="/pricing">Pricing</Link>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="https://novajaytech.com">NovaJay Tech</a>
          </div>
        </footer>

      </div>
    </>
  );
}
