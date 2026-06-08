import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Zap, FileText, Image, Video, ArrowRight, Check,
  Palette, Scale, MessageSquare, Shield, Briefcase, Users,
  Globe, Wand2, Mic, Download, RefreshCw, ChevronRight
} from 'lucide-react';

/* ─────────────────────────────────────────────────────
   LaunchBusiness AI — Landing Page
   Two pillars: Launch Pack (URL → marketing) + Legal Documents
   Design: Cybernetic Studio — Outfit + DM Sans, Indigo/Violet
───────────────────────────────────────────────────── */

const TYPING_DEMOS = [
  'https://notion.so',
  'https://linear.app',
  'https://stripe.com',
  'https://figma.com',
];

const GRD = { background: 'linear-gradient(135deg, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };
const BTN_PRIMARY = { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.35)' };
const CARD = { background: 'rgba(24,24,27,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };

export function Landing() {
  const [typed, setTyped] = useState('');
  const [demoIdx, setDemoIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const revealRefs = useRef([]);

  useEffect(() => {
    const url = TYPING_DEMOS[demoIdx];
    let i = 0; let deleting = false;
    const iv = setInterval(() => {
      if (!deleting) {
        setTyped(url.slice(0, ++i));
        if (i === url.length) setTimeout(() => { deleting = true; }, 1800);
      } else {
        setTyped(url.slice(0, --i));
        if (i === 0) { deleting = false; setDemoIdx(p => (p + 1) % TYPING_DEMOS.length); clearInterval(iv); }
      }
    }, 80);
    return () => clearInterval(iv);
  }, [demoIdx]);

  useEffect(() => {
    const f = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; } }),
      { threshold: 0.1 }
    );
    revealRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const addRef = el => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };
  const rv = (d = 0) => ({ opacity: 0, transform: 'translateY(24px)', transition: `opacity 0.6s ease ${d}s, transform 0.6s ease ${d}s` });

  const plans = [
    {
      name: 'Free', price: '0', desc: 'Explore the platform.',
      features: ['Logo creator (all templates)', '3 videos · lifetime', '5 scripts · lifetime', '9:16 format only', 'Watermarked output'],
      legal: null, cta: 'Start free', featured: false,
    },
    {
      name: 'Starter', price: '19', desc: 'For solo founders launching weekly.',
      features: ['Logo + AI concepts', '15 videos / month', '50 scripts / month', 'All formats (9:16, 16:9, 1:1)', 'No watermark + music bed'],
      legal: '20 legal credits / month · 1 business profile', cta: 'Get Starter', featured: true,
    },
    {
      name: 'Pro', price: '49', desc: 'Power users and serious launchers.',
      features: ['50 videos / month', '200 scripts / month', 'GPU-accelerated cinematic video', 'Talking head feature'],
      legal: '60 legal credits / month · 3 business profiles', cta: 'Get Pro', featured: false,
    },
    {
      name: 'Agency', price: '149', desc: 'Teams and high-volume creators.',
      features: ['200 videos / month', 'Unlimited scripts + posters', 'White label option', 'Team seats + priority support'],
      legal: '150 legal credits / month · Unlimited profiles', cta: 'Get Agency', featured: false,
    },
  ];

  const launchFeatures = [
    { icon: <Palette className="w-5 h-5" />, title: 'Logo Creator', desc: '6 AI-powered templates + Ideogram AI concepts. Your colors, your style — a production-ready 1024×1024 brand logo in seconds.' },
    { icon: <Video className="w-5 h-5" />, title: 'AI Video Generation', desc: 'Paste a URL — get cinematic branded video clips that animate your actual product visuals. All formats: TikTok (9:16), YouTube (16:9), Instagram (1:1), Facebook (4:5). Polished voiceover and animated captions included.' },
    { icon: <Wand2 className="w-5 h-5" />, title: '3 Script Frameworks', desc: 'Gemini AI writes PAS (Problem-Agitate-Solve), Step-by-Step tutorial, and Before/After transformation scripts — from your URL, in seconds.' },
    { icon: <Image className="w-5 h-5" />, title: 'Brand-Matched Posters', desc: 'Extracts your exact brand colors and messaging from any URL. Every poster is typeset to match your product identity.' },
    { icon: <Mic className="w-5 h-5" />, title: 'Neural Voiceover + Music', desc: 'Human-quality neural voiceover with royalty-free background music and animated UGC-style captions — sounds like a real presenter, not a robot.' },
    { icon: <Globe className="w-5 h-5" />, title: 'URL Intelligence', desc: 'Scrapes brand colors, headlines, and features from any website. One URL kick-starts the entire pipeline.' },
  ];

  const legalDocCategories = [
    { icon: <Shield className="w-4 h-4" />, name: 'Privacy & Compliance', docs: ['Privacy Policy (GDPR / PIPEDA / CCPA)', 'Data Processing Agreement', 'Cookie Policy', 'Data Breach Response Plan'] },
    { icon: <Briefcase className="w-4 h-4" />, name: 'Business Agreements', docs: ['NDA', 'Terms of Service', 'Service Agreement', 'Client Contract'] },
    { icon: <Sparkles className="w-4 h-4" />, name: 'Corporate & Equity', docs: ['Founder Agreement', 'Shareholder Agreement', 'Vesting Schedule', 'LLC Operating Agreement'] },
    { icon: <Users className="w-4 h-4" />, name: 'HR & Employment', docs: ['Employment Contract', 'Offer Letter', 'Employee Handbook', 'Contractor Agreement'] },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="noise-texture" />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>LaunchBusiness AI</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors no-underline">Features</a>
          <a href="#legal" className="hover:text-white transition-colors no-underline">Legal Docs</a>
          <a href="#pricing" className="hover:text-white transition-colors no-underline">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors no-underline">Log in</Link>
          <Link to="/register" className="px-5 py-2 text-sm font-semibold text-white rounded-md no-underline active:scale-95 transition-all" style={BTN_PRIMARY}>
            Start free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden min-h-screen">
        <div className="absolute top-0 left-1/2 pointer-events-none" style={{ transform: `translateX(-50%) translateY(${scrollY * 0.15}px)`, width: 900, height: 550, background: 'radial-gradient(ellipse, rgba(99,102,241,0.16) 0%, rgba(139,92,246,0.07) 50%, transparent 70%)', filter: 'blur(50px)' }} />

        <div ref={addRef} style={rv(0.1)}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border" style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Launch pack in 90 seconds · Legal documents · Built for founders
          </div>
        </div>

        <h1 ref={addRef} style={{ ...rv(0.2), fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(36px, 5vw, 68px)', letterSpacing: '-2.5px', lineHeight: 1.06, maxWidth: 820, marginBottom: 20 }}>
          From URL to launch-ready.{' '}
          <span style={GRD}>Marketing + legal,</span>{' '}
          covered.
        </h1>

        {/* ── Feature pills — visible without scrolling ── */}
        <div ref={addRef} style={{ ...rv(0.25), display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 680, marginBottom: 20 }}>
          {[
            { icon: <Palette className="w-3 h-3" />, label: 'Logo Creator' },
            { icon: <Video className="w-3 h-3" />, label: 'AI Video + Voiceover' },
            { icon: <Wand2 className="w-3 h-3" />, label: '3 Script Frameworks' },
            { icon: <Image className="w-3 h-3" />, label: 'Brand Posters' },
            { icon: <Scale className="w-3 h-3" />, label: '28 Legal Documents' },
            { icon: <Shield className="w-3 h-3" />, label: 'GDPR · PIPEDA · CCPA' },
            { icon: <MessageSquare className="w-3 h-3" />, label: 'AI Intake Chat' },
            { icon: <Globe className="w-3 h-3" />, label: 'URL Intelligence' },
          ].map(f => (
            <span key={f.label} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border" style={{ background: 'rgba(39,39,42,0.7)', borderColor: 'rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
              <span style={{ color: '#818cf8' }}>{f.icon}</span>{f.label}
            </span>
          ))}
        </div>

        <p ref={addRef} style={{ ...rv(0.3), fontSize: 17, lineHeight: 1.6, color: '#71717a', maxWidth: 520, marginBottom: 28 }}>
          Paste a URL → marketing pack in 90s. Tell the AI about your business → legal documents tailored to your jurisdiction. What used to cost $400–$6,900. Now in minutes.
        </p>

        <div ref={addRef} style={{ ...rv(0.4), display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
          <Link to="/register" className="flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white rounded-lg no-underline active:scale-95 transition-all" style={{ ...BTN_PRIMARY, fontSize: 15 }}>
            <Zap className="w-4 h-4" /> Create free account
          </Link>
          <Link to="/login" className="flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-zinc-300 rounded-lg no-underline transition-all border border-zinc-800 hover:border-zinc-600 hover:text-white" style={{ fontSize: 15 }}>
            Sign in <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── 3-column value trio — what each pillar delivers ── */}
        <div ref={addRef} style={{ ...rv(0.42), display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, width: '100%', maxWidth: 680, marginBottom: 28 }}>
          {[
            {
              color: '#818cf8',
              title: '🚀 Marketing Pack',
              items: ['Brand logo · AI templates', 'Videos with neural voiceover', 'PAS + tutorial scripts', 'Brand-matched posters'],
            },
            {
              color: '#6ee7b7',
              title: '⚖️ Legal Documents',
              items: ['28 document types', 'GDPR · PIPEDA · CCPA', '2026 law — fetched live', 'AI intake chat, not forms'],
            },
            {
              color: '#a78bfa',
              title: '⚡ All in One Platform',
              items: ['No agencies needed', 'No lawyers on retainer', 'Free tier to start', 'Credits never expire'],
            },
          ].map(col => (
            <div key={col.title} style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: col.color, marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>{col.title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.items.map(item => (
                  <li key={item} style={{ fontSize: 11, color: '#71717a', marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                    <span style={{ color: col.color, marginTop: 1, flexShrink: 0 }}>›</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Demo card */}
        <div ref={addRef} style={{ ...rv(0.5), width: '100%', maxWidth: 760, background: 'rgba(24,24,27,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '24px 28px', boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-3 h-3 rounded-full bg-zinc-700" /><div className="w-3 h-3 rounded-full bg-zinc-700" /><div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="flex-1 mx-3 bg-zinc-800/60 rounded-md px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs text-zinc-500">launchbusinessai.com</span>
            </div>
          </div>

          {/* URL input */}
          <div className="flex items-center gap-3 rounded-lg px-4 py-3 mb-5" style={{ background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-zinc-500 text-sm">🔗</span>
            <span className="flex-1 text-sm text-zinc-300 font-mono">{typed}<span className="animate-pulse text-indigo-400 font-bold">|</span></span>
            <button className="px-4 py-1.5 text-xs font-semibold text-white rounded-md" style={BTN_PRIMARY}>Generate ✦</button>
          </div>

          {/* Output grid — 5 outputs with subtitles */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { icon: <Palette className="w-4 h-4" />, label: 'Logo', sub: 'AI templates', val: '✦', color: '#f0abfc' },
              { icon: <Video className="w-4 h-4" />, label: 'Videos', sub: 'Ad + Tutorial', val: '2×', color: '#818cf8' },
              { icon: <FileText className="w-4 h-4" />, label: 'Scripts', sub: 'PAS + Step', val: '2×', color: '#a78bfa' },
              { icon: <Image className="w-4 h-4" />, label: 'Posters', sub: 'Brand-matched', val: '2×', color: '#c4b5fd' },
              { icon: <Scale className="w-4 h-4" />, label: 'Legal', sub: 'GDPR ready', val: '28+', color: '#6ee7b7' },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-1.5 rounded-lg p-3 transition-all hover:scale-105 cursor-default" style={{ background: 'rgba(39,39,42,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: item.color }}>{item.icon}</span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 18, color: item.color, lineHeight: 1 }}>{item.val}</span>
                <span className="text-xs font-semibold text-zinc-300">{item.label}</span>
                <span style={{ fontSize: 10, color: '#52525b', lineHeight: 1.3 }}>{item.sub}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-4 text-xs text-zinc-500 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Marketing pack: <span className="text-indigo-400 font-semibold">90 seconds</span></span>
            <span className="text-zinc-700">·</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Legal documents: <span className="text-emerald-400 font-semibold">minutes</span></span>
            <span className="text-zinc-700">·</span>
            <span>Agency quotes: <span className="line-through">$400–$6,900</span></span>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ background: 'rgba(24,24,27,0.5)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { num: '90s', label: 'Full marketing pack' },
            { num: '28', label: 'Legal document types' },
            { num: '2026', label: 'Law context included' },
            { num: '$0', label: 'To start on free tier' },
          ].map((s, i) => (
            <div key={i} className="text-center" ref={addRef} style={rv(i * 0.08)}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 38, letterSpacing: '-1.5px', ...GRD, lineHeight: 1 }}>{s.num}</div>
              <div className="text-xs text-zinc-500 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div ref={addRef} style={rv(0)}>
          <div className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4">How it works</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 4vw, 50px)', letterSpacing: '-1.5px', marginBottom: 12, color: '#fafafa' }}>
            From zero to launched. In minutes.
          </h2>
          <p className="text-zinc-400 text-lg max-w-lg">No designers, no copywriters, no lawyers on retainer.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-5 mt-14">
          {[
            { n: '01', title: 'Create your logo', desc: 'Start with your brand. Pick a style, your colors — AI generates a production-ready logo in seconds.' },
            { n: '02', title: 'Paste your URL', desc: 'Drop in your product URL. We extract brand data and build your full marketing pack in 90 seconds.' },
            { n: '03', title: 'Chat with the AI', desc: 'Tell our legal AI about your business in a natural conversation — jurisdiction, revenue model, data practices.' },
            { n: '04', title: 'Download everything', desc: 'Marketing assets ready to post. Legal drafts ready for your lawyer. All in one platform.' },
          ].map((step, i) => (
            <div key={i} ref={addRef} style={{ ...rv(i * 0.1), ...CARD, padding: '24px 20px', cursor: 'default', transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s, border-color 0.3s ease` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(99,102,241,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 42, color: 'rgba(129,140,248,0.55)', lineHeight: 1, marginBottom: 18 }}>{step.n}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, color: '#fafafa', marginBottom: 8 }}>{step.title}</div>
              <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Launch Pack Features ── */}
      <section id="features" style={{ background: 'rgba(24,24,27,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div ref={addRef} style={rv(0)} className="mb-14">
            <div className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4">Marketing tools</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 4vw, 50px)', letterSpacing: '-1.5px', color: '#fafafa' }}>
              Production quality.<br />Zero production time.
            </h2>
            <p className="text-zinc-400 mt-3 max-w-lg">Paste your URL and walk away with everything a launch needs — logo, videos, scripts, and posters.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {launchFeatures.map((f, i) => (
              <div key={i} ref={addRef} style={{ ...rv(i * 0.08), display: 'flex', flexDirection: 'column', gap: 12, ...CARD, padding: '22px 20px', cursor: 'default', transition: `opacity 0.6s ease ${i * 0.08}s, transform 0.6s ease ${i * 0.08}s, border-color 0.3s ease` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15, color: '#fafafa', marginBottom: 6 }}>{f.title}</div>
                  <p style={{ fontSize: 13, color: '#71717a', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Legal Documents — big feature section ── */}
      <section id="legal" className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div ref={addRef} style={rv(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)', color: '#6ee7b7' }}>
              <Scale className="w-3.5 h-3.5" /> New feature — Legal Documents
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 3.5vw, 46px)', letterSpacing: '-1.5px', color: '#fafafa', lineHeight: 1.1, marginBottom: 16 }}>
              28 legal documents.<br />
              <span style={GRD}>Tailored to your business.</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8" style={{ fontSize: 16 }}>
              An AI legal specialist chats with you to understand your business — jurisdiction,
              revenue model, data practices, team size. Then generates professional draft
              documents grounded in <strong className="text-zinc-300">2026 law</strong>, fetched fresh for every generation.
            </p>

            <div className="space-y-3 mb-8">
              {[
                { icon: <MessageSquare className="w-4 h-4" />, text: 'Adaptive intake chat — asks the right questions for your specific business' },
                { icon: <Globe className="w-4 h-4" />, text: 'Live web search before each doc — always the latest GDPR, PIPEDA, CCPA requirements' },
                { icon: <RefreshCw className="w-4 h-4" />, text: 'Regenerate when laws change — 10% credit discount on every update' },
                { icon: <Download className="w-4 h-4" />, text: 'Download as Markdown · copy to clipboard · review with your lawyer' },
                { icon: <Shield className="w-4 h-4" />, text: 'Canada, USA, EU jurisdiction support — more regions coming' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#6ee7b7' }}>
                    {item.icon}
                  </div>
                  <span className="text-zinc-300 text-sm leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border p-4 mb-8" style={{ background: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
              <p className="text-xs text-yellow-300 leading-relaxed">
                <strong>Always requires lawyer review.</strong> Generated documents are AI-drafted starting points only — professional legal advice before signing or publishing.
              </p>
            </div>

            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-lg no-underline active:scale-95 transition-all" style={BTN_PRIMARY}>
              Start generating <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right — document category grid */}
          <div ref={addRef} style={rv(0.15)} className="grid grid-cols-2 gap-3">
            {legalDocCategories.map((cat, i) => (
              <div key={i} style={{ ...CARD, padding: '18px 16px', transition: 'border-color 0.3s ease', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)', color: '#6ee7b7' }}>
                    {cat.icon}
                  </div>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 12, color: '#d4d4d8' }}>{cat.name}</span>
                </div>
                <ul className="space-y-1.5">
                  {cat.docs.map((doc, j) => (
                    <li key={j} className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span className="w-1 h-1 rounded-full bg-zinc-700 flex-shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Credit cost callout */}
            <div className="col-span-2 rounded-xl border p-4 flex items-center justify-between gap-4" style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
              <div>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: '#fafafa' }}>From 1–5 credits per document</p>
                <p className="text-xs text-zinc-500 mt-0.5">Credits included in Starter, Pro, and Agency plans. Topup available.</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                <Zap className="w-3 h-3" /> Credit-based
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ background: 'rgba(24,24,27,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <div ref={addRef} style={rv(0)} className="mb-14">
            <div className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4">Pricing</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 4vw, 50px)', letterSpacing: '-1.5px', color: '#fafafa' }}>Simple. Transparent.</h2>
            <p className="text-zinc-400 text-lg mt-3">Marketing assets + legal documents. Everything a founder needs.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
            {plans.map((plan, i) => (
              <div key={i} ref={addRef} style={{ ...rv(i * 0.1), position: 'relative', borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', ...(plan.featured ? { background: 'linear-gradient(145deg, rgba(99,102,241,0.14), rgba(139,92,246,0.07))', border: '1px solid rgba(99,102,241,0.35)', boxShadow: '0 0 40px rgba(99,102,241,0.1)' } : { background: 'rgba(24,24,27,0.4)', border: '1px solid rgba(255,255,255,0.06)' }) }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    Most popular
                  </div>
                )}
                <div className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">{plan.name}</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 46, letterSpacing: '-2px', color: '#fafafa', lineHeight: 1 }}>
                  <sup style={{ fontSize: 18, verticalAlign: 'super' }}>$</sup>{plan.price}
                  <sub style={{ fontSize: 14, fontWeight: 400, color: '#71717a', letterSpacing: 0 }}>/mo</sub>
                </div>
                <p className="text-sm text-zinc-500 mt-2 mb-4">{plan.desc}</p>

                {/* Marketing features */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, marginBottom: 14 }}>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Marketing</p>
                  <ul className="space-y-2">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-zinc-400">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Legal credits */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, marginBottom: 14 }} className="flex-1">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Legal Documents</p>
                  {plan.legal ? (
                    <div className="flex items-start gap-2.5">
                      <Scale className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400 mt-0.5" />
                      <span className="text-sm text-zinc-400">{plan.legal}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5">
                      <span className="text-zinc-600 text-sm">— Document catalog visible, generation requires upgrade</span>
                    </div>
                  )}
                </div>

                <Link to="/register" className="block w-full text-center py-2.5 rounded-lg text-sm font-semibold no-underline transition-all active:scale-95 mt-auto" style={{ ...(plan.featured ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', boxShadow: '0 0 20px rgba(99,102,241,0.3)' } : { background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }) }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="relative overflow-hidden py-28 text-center px-6">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
        <div ref={addRef} style={rv(0)}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(34px, 5vw, 62px)', letterSpacing: '-2px', color: '#fafafa', marginBottom: 16, lineHeight: 1.1 }}>
            Your next launch.<br />
            <span style={GRD}>90 seconds away.</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-4">Marketing pack. Legal documents. Everything in one platform.</p>
          <p className="text-zinc-600 text-sm mb-10">What agencies charge $400–1,900 for. What lawyers charge $5,000+ for.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-lg no-underline active:scale-95 transition-all" style={{ ...BTN_PRIMARY, boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}>
            <Zap className="w-5 h-5" /> Create free account
          </Link>
          <p className="text-xs text-zinc-600 mt-4">No credit card. No design skills. No lawyers on retainer.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: '#52525b' }}>LaunchBusiness AI</span>
        </div>
        <div className="flex gap-6">
          {[['Pricing', '#pricing'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['NovaJay Tech', 'https://novajaytech.com']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 13, color: '#3f3f46', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#71717a'}
              onMouseLeave={e => e.target.style.color = '#3f3f46'}
            >{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
