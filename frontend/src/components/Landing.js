import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Zap, FileText, Image, Video, ArrowRight, Check, Palette } from 'lucide-react';

/* ─────────────────────────────────────────────────────
   LaunchBusiness AI — Landing Page
   Design system: Cybernetic Studio (matches app exactly)
   - bg-zinc-950 dark base
   - Outfit (headings) + DM Sans (body) — already installed
   - Indigo/violet gradient accent (#6366f1 → #8b5cf6)
   - Zinc color scale for text and surfaces
   - Glass morphism cards, indigo glow effects
───────────────────────────────────────────────────── */

const TYPING_DEMOS = [
  'https://notion.so',
  'https://linear.app',
  'https://stripe.com',
  'https://figma.com',
];

export function Landing() {
  const [typed, setTyped] = useState('');
  const [demoIdx, setDemoIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const revealRefs = useRef([]);

  // Typing animation cycling through demo URLs
  useEffect(() => {
    const url = TYPING_DEMOS[demoIdx];
    let i = 0;
    let deleting = false;
    const interval = setInterval(() => {
      if (!deleting) {
        setTyped(url.slice(0, i + 1));
        i++;
        if (i === url.length) {
          setTimeout(() => { deleting = true; }, 1800);
        }
      } else {
        setTyped(url.slice(0, i - 1));
        i--;
        if (i === 0) {
          deleting = false;
          setDemoIdx(prev => (prev + 1) % TYPING_DEMOS.length);
          clearInterval(interval);
        }
      }
    }, 80);
    return () => clearInterval(interval);
  }, [demoIdx]);

  // Scroll for parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
        }
      }),
      { threshold: 0.12 }
    );
    revealRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = el => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };

  const revealStyle = (delay = 0) => ({
    opacity: 0,
    transform: 'translateY(28px)',
    transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
  });

  const plans = [
    {
      name: 'Free',
      price: '0',
      desc: 'Try LaunchBusiness AI with no commitment.',
      features: ['Logo creator (free, all styles)', '3 videos lifetime', '5 scripts lifetime', '9:16 format only', 'LaunchBusiness AI watermark'],
      cta: 'Start free',
      featured: false,
    },
    {
      name: 'Starter',
      price: '19',
      desc: 'For founders launching every week.',
      features: ['Logo creator + AI concepts', '15 videos / month', '50 scripts / month', 'All formats (9:16, 16:9, 1:1)', 'No watermark + music bed'],
      cta: 'Get Starter',
      featured: true,
    },
    {
      name: 'Pro',
      price: '49',
      desc: 'AI video + talking head for pros.',
      features: ['50 videos / month', '200 scripts / month', 'AI video (LTX-Video on A100)', 'Talking head feature'],
      cta: 'Get Pro',
      featured: false,
    },
    {
      name: 'Agency',
      price: '149',
      desc: 'For teams and high-volume creators.',
      features: ['200 videos / month', 'Unlimited scripts + posters', 'White label option', 'Team seats + priority support'],
      cta: 'Get Agency',
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Noise texture */}
      <div className="noise-texture" />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px', color: '#fafafa' }}>
            LaunchBusiness AI
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors no-underline"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 text-sm font-semibold text-white rounded-md no-underline active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 overflow-hidden min-h-screen">

        {/* Hero glow */}
        <div
          className="absolute top-0 left-1/2 pointer-events-none"
          style={{
            transform: `translateX(-50%) translateY(${scrollY * 0.15}px)`,
            width: 800, height: 500,
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 pointer-events-none"
          style={{
            width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <div ref={addRef} style={revealStyle(0.1)}>
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Now live — Logo + full launch pack in 90 seconds
          </div>
        </div>

        <h1
          ref={addRef}
          style={{
            ...revealStyle(0.2),
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(44px, 6vw, 80px)',
            letterSpacing: '-2.5px',
            lineHeight: 1.05,
            maxWidth: 820,
            marginBottom: 24,
          }}
        >
          Your product URL.{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            A complete launch pack
          </span>{' '}
          in 90 seconds.
        </h1>

        <p
          ref={addRef}
          style={{
            ...revealStyle(0.3),
            fontSize: 19,
            lineHeight: 1.65,
            color: '#a1a1aa',
            maxWidth: 540,
            marginBottom: 40,
          }}
        >
          Start with your brand logo. Then paste your product URL and get 2 videos,
          2 scripts, and 2 posters — everything you need to launch. What agencies
          charge $400–1,900 for. In 90 seconds.
        </p>

        <div ref={addRef} style={{ ...revealStyle(0.4), display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          <Link
            to="/register"
            className="flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white rounded-lg no-underline active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 30px rgba(99,102,241,0.4)', fontSize: 15 }}
          >
            <Zap className="w-4 h-4" />
            Create your free pack
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-zinc-300 rounded-lg no-underline transition-all border border-zinc-800 hover:border-zinc-600 hover:text-white"
            style={{ fontSize: 15 }}
          >
            Sign in <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Demo card */}
        <div
          ref={addRef}
          style={{
            ...revealStyle(0.5),
            width: '100%',
            maxWidth: 720,
            background: 'rgba(24,24,27,0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '24px 28px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
          }}
        >
          {/* Browser dots */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="flex-1 mx-3 bg-zinc-800/60 rounded-md px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs text-zinc-500">launchbusinessai.com</span>
            </div>
          </div>

          {/* URL input */}
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3 mb-5"
            style={{ background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-zinc-500 text-sm">🔗</span>
            <span className="flex-1 text-sm text-zinc-300 font-mono">
              {typed}
              <span className="animate-pulse text-indigo-400 font-bold">|</span>
            </span>
            <button
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-md transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              Generate ✦
            </button>
          </div>

          {/* Output grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: <Palette className="w-4 h-4" />, label: 'Logo', count: '✦', color: '#f0abfc' },
              { icon: <Video className="w-4 h-4" />, label: 'Videos', count: '2×', color: '#818cf8' },
              { icon: <FileText className="w-4 h-4" />, label: 'Scripts', count: '2×', color: '#a78bfa' },
              { icon: <Image className="w-4 h-4" />, label: 'Posters', count: '2×', color: '#c4b5fd' },
            ].map(item => (
              <div
                key={item.label}
                className="flex flex-col gap-2 rounded-lg p-4 transition-all hover:scale-105 cursor-default"
                style={{ background: 'rgba(39,39,42,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span style={{ color: item.color }}>{item.icon}</span>
                <span className="text-xs font-medium text-zinc-400">{item.label}</span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 22, color: item.color }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-zinc-500">
            <span>Total time</span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              ≈ 90 seconds
            </span>
            <span>vs $400–1,900 agency quote</span>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div style={{ background: 'rgba(24,24,27,0.5)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { num: '90s', label: 'Average generation time' },
            { num: '7×', label: 'Assets per URL' },
            { num: '$0', label: 'Cost on free tier' },
            { num: '3', label: 'Script frameworks' },
          ].map(s => (
            <div key={s.label} className="text-center" ref={addRef} style={revealStyle(0.1)}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 40, letterSpacing: '-1.5px', background: 'linear-gradient(135deg, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1 }}>
                {s.num}
              </div>
              <div className="text-xs text-zinc-500 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div ref={addRef} style={revealStyle(0)}>
          <div className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4">How it works</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-1.5px', marginBottom: 16, color: '#fafafa' }}>
            Three steps. One launch pack.
          </h2>
          <p className="text-zinc-400 text-lg max-w-lg">No designers. No copywriters. No waiting.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {[
            { n: '01', title: 'Create your logo', desc: 'Generate your brand logo first — AI templates or Ideogram AI. Pick a style, your colors, done in seconds.' },
            { n: '02', title: 'Paste your URL', desc: 'Drop in your product URL. LaunchBusiness AI extracts brand colors, headlines, and features — then builds everything.' },
            { n: '03', title: 'Download and post', desc: 'Get your logo + 2 videos, 2 scripts, and 2 posters — ready for TikTok, YouTube, Instagram, and LinkedIn.' },
          ].map((step, i) => (
            <div
              key={i}
              ref={addRef}
              style={{
                ...revealStyle(i * 0.12),
                background: 'rgba(24,24,27,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: '28px 24px',
                transition: `opacity 0.65s ease ${i * 0.12}s, transform 0.65s ease ${i * 0.12}s, box-shadow 0.3s ease, border-color 0.3s ease`,
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(99,102,241,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 48, color: 'rgba(99,102,241,0.2)', lineHeight: 1, marginBottom: 20 }}>{step.n}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18, color: '#fafafa', marginBottom: 10 }}>{step.title}</div>
              <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ background: 'rgba(24,24,27,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div ref={addRef} style={revealStyle(0)} className="mb-14">
            <div className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4">What you get</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-1.5px', color: '#fafafa' }}>
              Production quality.<br />Zero production time.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: <Palette className="w-5 h-5" />, title: 'Logo Creator', desc: '6 AI-powered logo templates + Ideogram AI concepts. Pick your colors and style — get a 1024×1024 brand logo in seconds, before you launch anything.' },
              { icon: <Video className="w-5 h-5" />, title: 'AI Video Generation', desc: 'LTX-Video on Modal A100 GPU generates cinematic product videos for Pro/Agency users. Free tier gets polished animated slideshows with Edge TTS voiceover.' },
              { icon: <FileText className="w-5 h-5" />, title: '3 Script Frameworks', desc: 'PAS (Problem-Agitate-Solve), Step-by-Step tutorial, and Before/After transformation — Gemini AI writes all three in seconds from your URL.' },
              { icon: <Image className="w-5 h-5" />, title: 'Brand-Matched Posters', desc: 'Extracts your brand colors, fonts, and messaging from any URL. Every poster is designed to match your product identity.' },
              { icon: <Sparkles className="w-5 h-5" />, title: 'Neural Voiceover + Music', desc: 'Microsoft Edge TTS Neural voice with royalty-free background music bed and animated captions — production-ready audio out of the box.' },
            ].map((f, i) => (
              <div
                key={i}
                ref={addRef}
                style={{
                  ...revealStyle(i * 0.1),
                  display: 'flex',
                  gap: 16,
                  background: 'rgba(24,24,27,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  padding: '24px 22px',
                  cursor: 'default',
                  transition: `opacity 0.65s ease ${i * 0.1}s, transform 0.65s ease ${i * 0.1}s, border-color 0.3s ease`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, color: '#fafafa', marginBottom: 6 }}>{f.title}</div>
                  <p style={{ fontSize: 14, color: '#71717a', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div ref={addRef} style={revealStyle(0)} className="mb-14">
          <div className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4">Pricing</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-1.5px', color: '#fafafa' }}>
            Simple. Transparent.
          </h2>
          <p className="text-zinc-400 text-lg mt-3">What agencies charge $400–1,900 for. Now in 90 seconds.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {plans.map((plan, i) => (
            <div
              key={i}
              ref={addRef}
              style={{
                ...revealStyle(i * 0.1),
                position: 'relative',
                borderRadius: 16,
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                ...(plan.featured
                  ? { background: 'linear-gradient(145deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.35)', boxShadow: '0 0 40px rgba(99,102,241,0.12)' }
                  : { background: 'rgba(24,24,27,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                ),
              }}
            >
              {plan.featured && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  Most popular
                </div>
              )}
              <div className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-4">{plan.name}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 52, letterSpacing: '-2px', color: '#fafafa', lineHeight: 1 }}>
                <sup style={{ fontSize: 22, verticalAlign: 'super' }}>$</sup>
                {plan.price}
                <sub style={{ fontSize: 15, fontWeight: 400, color: '#71717a', letterSpacing: 0 }}>/mo</sub>
              </div>
              <p className="text-sm text-zinc-500 mt-3 mb-6">{plan.desc}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-zinc-400">
                    <Check className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full text-center py-3 rounded-lg text-sm font-semibold no-underline transition-all active:scale-95"
                style={{ marginTop: 'auto', ...(plan.featured
                  ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }
                  : { background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }
                ) }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="relative overflow-hidden py-28 text-center px-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
        />
        <div ref={addRef} style={revealStyle(0)}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-2px', color: '#fafafa', marginBottom: 16, lineHeight: 1.1 }}>
            Your next launch.<br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              90 seconds away.
            </span>
          </h2>
          <p className="text-zinc-400 text-lg mb-10">Paste your URL. Walk away with a complete marketing pack.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-lg no-underline active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 40px rgba(99,102,241,0.4)', fontSize: 16 }}
          >
            <Zap className="w-5 h-5" />
            Create your free pack
          </Link>
          <p className="text-xs text-zinc-600 mt-4">No credit card. No design skills. No waiting.</p>
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
          {[['Pricing', '/pricing'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['NovaJay Tech', 'https://novajaytech.com']].map(([label, href]) => (
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
