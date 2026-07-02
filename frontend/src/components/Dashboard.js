import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Link as LinkIcon, Zap, Loader2, CheckCircle2, ChevronDown, ChevronUp, Briefcase, Palette, Scale, Megaphone, ArrowRight, FileText } from 'lucide-react';
import axios from 'axios';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Steps with cumulative % and estimated duration in seconds
const STEPS_URL = [
  { label: 'Analyzing website',       pct: 8,   duration: 4  },
  { label: 'Extracting brand colors', pct: 14,  duration: 3  },
  { label: 'Writing ad script',       pct: 30,  duration: 12 },
  { label: 'Writing tutorial script', pct: 46,  duration: 12 },
  { label: 'Rendering ad video',      pct: 68,  duration: 20 },
  { label: 'Rendering tutorial video',pct: 88,  duration: 18 },
  { label: 'Creating social posters', pct: 96,  duration: 5  },
  { label: 'Packaging results',       pct: 100, duration: 2  },
];
const STEPS_DESC = [
  { label: 'Processing product brief', pct: 8,   duration: 2  },
  { label: 'Preparing brand assets',   pct: 14,  duration: 2  },
  { label: 'Writing ad script',        pct: 30,  duration: 12 },
  { label: 'Writing tutorial script',  pct: 46,  duration: 12 },
  { label: 'Rendering ad video',       pct: 68,  duration: 20 },
  { label: 'Rendering tutorial video', pct: 88,  duration: 18 },
  { label: 'Creating social posters',  pct: 96,  duration: 5  },
  { label: 'Packaging results',        pct: 100, duration: 2  },
];

export const Dashboard = () => {
  const [url, setUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [showCreative, setShowCreative] = useState(false);
  const [inputMode, setInputMode] = useState('url'); // 'url' | 'description'
  const [userDescription, setUserDescription] = useState('');
  const [userFeatures, setUserFeatures] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [usedCreative, setUsedCreative] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [savingBrand, setSavingBrand] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeBrand, canUseBrands, selectBrand, refreshProfiles } = useBrand();
  const canUseCreative = user?.tier && user.tier !== 'free';

  // Auto-fill the launch form whenever the app-wide active brand changes
  useEffect(() => {
    if (!activeBrand) return;
    if (activeBrand.brand_name) setProductName(activeBrand.brand_name);
    if (activeBrand.url)        setUrl(activeBrand.url);
    if (activeBrand.audience)   setTargetAudience(activeBrand.audience);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id]);

  const hasFreeTrial = user && !user.free_pro_trial_used;

  const activeSteps = inputMode === 'url' ? STEPS_URL : STEPS_DESC;
  const TOTAL_EST = activeSteps.reduce((s, x) => s + x.duration, 0); // ~76s

  const startProgress = () => {
    setProgress(0);
    setStepIdx(0);
    setElapsed(0);
    startTimeRef.current = Date.now();

    // Tick elapsed every second
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Advance through steps
    let idx = 0;
    const steps = inputMode === 'url' ? STEPS_URL : STEPS_DESC;
    const advance = () => {
      if (idx >= steps.length) return;
      setStepIdx(idx);
      setProgress(steps[idx].pct);
      const next = steps[idx + 1];
      if (next) {
        stepTimerRef.current = setTimeout(advance, steps[idx].duration * 1000);
      }
      idx++;
    };
    advance();
  };

  const stopProgress = () => {
    clearInterval(timerRef.current);
    clearTimeout(stepTimerRef.current);
  };

  const handleMagicButton = async () => {
    if (!productName || !targetAudience) {
      toast.error('Please fill in all fields');
      return;
    }

    if (inputMode === 'url') {
      // Client-side URL sanity check
      try {
        const parsed = new URL(url.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          toast.error('Please enter a valid website URL (starting with http:// or https://)');
          return;
        }
      } catch {
        toast.error('Please enter a valid website URL');
        return;
      }
    } else {
      if (!userDescription.trim()) {
        toast.error('Please describe your product');
        return;
      }
    }

    const hasCreative = canUseCreative && creativeDirection.trim().length > 0;
    setUsedCreative(hasCreative);
    setLoading(true);
    startProgress();
    posthog.capture('magic_button_started', { has_brand: !!activeBrand, has_creative: !!creativeDirection.trim(), mode: inputMode });

    const filledFeatures = userFeatures.map(f => f.trim()).filter(Boolean);

    try {
      const response = await axios.post(`${API}/magic-button`, {
        ...(inputMode === 'url' ? { url } : {
          user_description: userDescription.trim(),
          ...(filledFeatures.length ? { user_features: filledFeatures } : {}),
        }),
        product_name: productName,
        target_audience: targetAudience,
        ...(hasCreative ? { creative_direction: creativeDirection.trim() } : {}),
        ...(activeBrand ? { profile_id: activeBrand.id } : {}),
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('jhp_token')}` } });

      setProgress(100);
      posthog.capture('magic_button_completed', { video_count: response.data?.videos?.length ?? 0 });
      setResults(response.data);
      toast.success('Launch Pack generated successfully!');
    } catch (error) {
      console.error('Magic button error:', error);
      const detail = error?.response?.data?.detail || error?.message || 'Failed to generate content';
      toast.error(detail);
    } finally {
      stopProgress();
      setLoading(false);
    }
  };

  // One-click: turn this launch's inputs + scraped colors/features into a reusable brand profile
  const handleSaveAsBrand = async () => {
    const token = localStorage.getItem('jhp_token');
    if (!token) return;
    setSavingBrand(true);
    try {
      const brandData = results?.brand_data || {};
      const payload = {
        brand_name: productName,
        tagline: (brandData.description || '').slice(0, 100),
        description: (brandData.description || '').slice(0, 500),
        url,
        primary_color: brandData.colors?.[0] || '#6366f1',
        secondary_color: brandData.colors?.[1] || '#8b5cf6',
        audience: targetAudience,
        key_features: (brandData.features || []).slice(0, 3),
      };
      const { data } = await axios.post(`${BACKEND_URL}/api/brand-profiles`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshProfiles();
      selectBrand(data);
      toast.success(`Saved as brand "${data.brand_name}" — now active across Logo, Marketing & Legal`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save brand profile');
    } finally {
      setSavingBrand(false);
    }
  };

  const backendLogoSrc = activeBrand?.active_logo_url
    ? (activeBrand.active_logo_url.startsWith('http')
        ? activeBrand.active_logo_url
        : `${BACKEND_URL}${activeBrand.active_logo_url}`)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Brand Hub — compact status bar ────────────────────────────── */}
      <div className="relative z-10 max-w-3xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row items-stretch gap-0 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">

          {/* Brand Identity */}
          <Link to="/logo" className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors border-b sm:border-b-0 sm:border-r border-zinc-800 group min-w-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center flex-shrink-0">
              <Palette className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-300 truncate">Brand Identity</p>
              {backendLogoSrc
                ? <p className="text-xs text-emerald-400">Logo saved ✓</p>
                : <p className="text-xs text-zinc-600">No logo yet</p>}
            </div>
            <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors ml-auto flex-shrink-0" />
          </Link>

          {/* Marketing */}
          <button
            onClick={() => document.getElementById('magic-button-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-indigo-950/40 transition-colors border-b sm:border-b-0 sm:border-r border-zinc-800 group min-w-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold text-zinc-300 truncate">Marketing</p>
              <p className="text-xs text-zinc-500">
                {(user?.usage?.videos ?? 0)} videos · {(user?.usage?.posters ?? 0)} posters
              </p>
            </div>
            <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-indigo-400 transition-colors ml-auto flex-shrink-0" />
          </button>

          {/* Legal */}
          <Link to="/legal" className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors group min-w-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center flex-shrink-0">
              <Scale className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-300 truncate">Legal</p>
              {(user?.legal?.total_available ?? 0) > 0
                ? <p className="text-xs text-emerald-400">{user.legal.total_available} credits</p>
                : <p className="text-xs text-zinc-600">Starter+ required</p>}
            </div>
            <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors ml-auto flex-shrink-0" />
          </Link>
        </div>
      </div>

      {/* ── Marketing Creator ─────────────────────────────────────────── */}
      <div id="magic-button-section" className="relative z-10 max-w-3xl mx-auto">

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-3" data-testid="dashboard-title">
            <span className="text-gradient">Create Your Launch Pack</span>
          </h1>
          <p className="text-base text-zinc-400">
            Paste your product URL — or describe your product if you don't have a site yet.
            We write the scripts, render 4 videos in every format, and create social posters. All in ~90 seconds.
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Also need contracts, privacy policies, or NDAs?{' '}
            <Link to="/legal" className="text-indigo-400 hover:text-indigo-300 transition-colors">Try the Legal tool →</Link>
          </p>
        </div>

        {/* Free Pro trial banner */}
        {hasFreeTrial && (
          <div className="mb-4 flex items-center gap-3 px-5 py-3.5 rounded-xl border border-indigo-500/25"
               style={{ background: 'rgba(99,102,241,0.06)' }}>
            <span className="text-indigo-400 text-lg">✦</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-indigo-300">1 free Pro generation available</span>
              <span className="text-xs text-zinc-500 ml-2">AI video + music — experience Pro quality before you upgrade</span>
            </div>
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full flex-shrink-0">FREE TRIAL</span>
          </div>
        )}

        <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-8">
          <div className="space-y-6">

            {/* Active brand indicator — Starter+ only */}
            {canUseBrands && (
              activeBrand ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5">
                  <Briefcase className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">
                    Using brand <span className="font-semibold text-indigo-300">{activeBrand.brand_name}</span> — fields and logo auto-applied
                  </span>
                  <span className="text-xs text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full ml-auto flex-shrink-0">Auto-filled</span>
                </div>
              ) : (
                <Link
                  to="/brands"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 text-sm text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  <Briefcase className="w-4 h-4 flex-shrink-0" />
                  Create a brand profile to auto-fill these fields and add your logo
                </Link>
              )
            )}

            {/* ── Input mode toggle ── */}
            <div className="flex items-center gap-1 p-1 bg-zinc-900/60 border border-zinc-800 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === 'url' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Website URL
              </button>
              <button
                type="button"
                onClick={() => setInputMode('description')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === 'description' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <FileText className="w-3.5 h-3.5" />
                No website yet
              </button>
            </div>

            {/* URL input */}
            {inputMode === 'url' && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <LinkIcon className="inline w-4 h-4 mr-2" />
                  Website URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  data-testid="url-input"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                />
              </div>
            )}

            {/* Description mode inputs */}
            {inputMode === 'description' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <FileText className="inline w-4 h-4 mr-2" />
                    What does your product do?
                    <span className="text-zinc-500 font-normal ml-2">1–2 sentences</span>
                  </label>
                  <textarea
                    value={userDescription}
                    onChange={e => setUserDescription(e.target.value.slice(0, 500))}
                    placeholder="e.g. LaunchBusiness AI turns any product URL into a full marketing pack — 4 videos, 3 scripts, and social posters — in 90 seconds."
                    rows={3}
                    data-testid="user-description-input"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600 resize-none"
                  />
                  <div className="text-right text-xs text-zinc-600 mt-1">
                    <span className={userDescription.length > 450 ? 'text-amber-500' : ''}>{userDescription.length}/500</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Key features
                    <span className="text-zinc-500 font-normal ml-2">optional · up to 3</span>
                  </label>
                  <div className="space-y-2">
                    {userFeatures.map((f, i) => (
                      <input
                        key={i}
                        type="text"
                        value={f}
                        onChange={e => setUserFeatures(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                        placeholder={['Generates 4 videos in every format', 'No design skills needed', 'Results in under 90 seconds'][i]}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="LaunchBusiness AI"
                  data-testid="product-name-input"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Job seekers"
                  data-testid="target-audience-input"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>
            
            {/* ── Creative Direction (Starter+) ── */}
            <div>
              {!showCreative ? (
                <button
                  type="button"
                  onClick={() => setShowCreative(true)}
                  className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-indigo-400 transition-colors"
                >
                  <span className="text-indigo-400 text-base">✦</span>
                  Add creative direction
                  <ChevronDown className="w-3.5 h-3.5" />
                  {!canUseCreative && (
                    <span className="ml-1 text-xs text-zinc-700">Starter+</span>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <span className="text-indigo-400">✦</span>
                      Creative direction
                      <span className="text-xs text-zinc-500 font-normal">optional · shapes tone &amp; hook</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowCreative(false); setCreativeDirection(''); }}
                      className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      Remove <ChevronUp className="w-3 h-3" />
                    </button>
                  </div>

                  {!canUseCreative ? (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-500">
                      Creative direction is available on Starter and above.{' '}
                      <Link to="/pricing" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                        Upgrade →
                      </Link>
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={creativeDirection}
                        onChange={e => setCreativeDirection(e.target.value.slice(0, 300))}
                        placeholder='e.g. "Dark, urgent tone. Start with the problem — not the product. End bold with a clear CTA."'
                        rows={3}
                        data-testid="creative-direction-input"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600 resize-none"
                      />
                      <div className="flex justify-between items-center text-xs text-zinc-600">
                        <span>Gemini will weave this into every script</span>
                        <span className={creativeDirection.length > 270 ? 'text-amber-500' : ''}>
                          {creativeDirection.length}/300
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pre-wall nudge for free tier users */}
            {user?.tier === 'free' && (() => {
              const used = user?.usage?.videos ?? 0;
              const remaining = Math.max(0, 3 - used);
              if (remaining === 1) return (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
                  <span className="text-amber-400 mt-0.5">⚠</span>
                  <span className="text-amber-300">
                    <strong>Last free generation.</strong> After this you'll need to{' '}
                    <Link to="/pricing" className="underline hover:text-amber-200">upgrade to Starter ($19/mo)</Link> to keep creating.
                  </span>
                </div>
              );
              if (remaining === 0) return (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/5 text-sm">
                  <span className="text-red-400 mt-0.5">✕</span>
                  <span className="text-red-300">
                    <strong>Free limit reached (3/3).</strong>{' '}
                    <Link to="/pricing" className="underline hover:text-red-200">Upgrade to Starter</Link> for 15 generations per month.
                  </span>
                </div>
              );
              return null;
            })()}

            <button
              onClick={handleMagicButton}
              disabled={loading}
              data-testid="magic-button"
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-bold px-8 py-4 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Your Launch Pack...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Launch Pack
                  <Zap className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Progress panel */}
            {loading && (
              <div className="mt-4 bg-zinc-950/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                    <span className="text-indigo-400 font-medium">{activeSteps[stepIdx]?.label}…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-[2000ms] ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Steps list */}
                <div className="space-y-1.5">
                  {STEPS.map((step, i) => {
                    const done = i < stepIdx;
                    const active = i === stepIdx;
                    return (
                      <div key={i} className={`flex items-center gap-2 text-xs transition-opacity ${active ? 'opacity-100' : done ? 'opacity-50' : 'opacity-25'}`}>
                        {done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : active ? (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 flex-shrink-0" />
                        )}
                        <span className={active ? 'text-zinc-200' : done ? 'text-zinc-500' : 'text-zinc-700'}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Time estimate */}
                <p className="text-xs text-zinc-600 text-center">
                  {elapsed < TOTAL_EST
                    ? `~${Math.max(0, TOTAL_EST - elapsed)}s remaining`
                    : 'Almost done…'}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {results && (
          <div className="mt-8 space-y-6" data-testid="results-section">
            {/* Header + ZIP download */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-heading font-semibold">Launch Pack Ready</h2>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {usedCreative && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      ✦ Creative direction applied
                    </span>
                  )}
                  {activeBrand && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Briefcase className="w-3 h-3" /> {activeBrand.brand_name}
                    </span>
                  )}
                </div>
              </div>
              {/* ZIP download all */}
              {(() => {
                const ids = [
                  results.ad_video?.id,
                  results.tutorial_video?.id,
                  results.video_1_1?.id,
                  results.video_4_5?.id,
                  ...(results.posters || []).map(p => p.id),
                ].filter(Boolean).join(',');
                return ids ? (
                  <a
                    href={`${BACKEND_URL}/api/download-pack?ids=${ids}`}
                    download="launchbusiness-pack.zip"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                  >
                    <Zap className="w-4 h-4" /> Download All as ZIP
                  </a>
                ) : null;
              })()}
            </div>

            {/* Videos — All 4 formats */}
            {(results.ad_video || results.tutorial_video || results.video_1_1 || results.video_4_5) && (
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Videos — All Formats
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                  {results.ad_video?.engine === 'hybrid-pexels-ltx' && 'Real footage + cinematic branded intro/outro · '}
                  {results.ad_video?.engine === 'pexels' && 'Real footage + product overlay · '}
                  Branded typography · animated captions · neural voiceover
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { video: results.ad_video,       fmt: '9:16',  label: 'TikTok / Reels',    color: 'bg-indigo-600 hover:bg-indigo-500',  testId: 'download-ad-video' },
                    { video: results.tutorial_video, fmt: '16:9',  label: 'YouTube / LinkedIn', color: 'bg-violet-600 hover:bg-violet-500',  testId: 'download-tutorial-video' },
                    { video: results.video_1_1,      fmt: '1:1',   label: 'Instagram / Twitter', color: 'bg-emerald-700 hover:bg-emerald-600', testId: 'download-11-video' },
                    { video: results.video_4_5,      fmt: '4:5',   label: 'Facebook / IG Feed', color: 'bg-rose-700 hover:bg-rose-600',      testId: 'download-45-video' },
                  ].map(({ video, fmt, label, color, testId }) => (
                    video ? (
                      <div key={fmt} className="bg-zinc-950/60 rounded-lg p-3 space-y-2 border border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-300">{fmt}</span>
                          <span className="text-xs text-zinc-600">{video.engine}</span>
                        </div>
                        <p className="text-xs text-zinc-500">{label}</p>
                        <a href={`${BACKEND_URL}${video.url}`} download data-testid={testId}
                           className={`inline-flex items-center gap-1.5 ${color} text-white text-xs font-medium px-3 py-1.5 rounded-md transition-all w-full justify-center`}>
                          <Zap className="w-3 h-3" /> Download
                        </a>
                      </div>
                    ) : (
                      <div key={fmt} className="bg-zinc-950/30 rounded-lg p-3 border border-zinc-800/50 flex items-center justify-center">
                        <p className="text-xs text-zinc-700">{fmt} generating…</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Hook variants — 3 scripts */}
            {results.hook_variants?.length > 0 && (
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  3 Script Variants
                </h3>
                <p className="text-xs text-zinc-500 mb-4">PAS · Step-by-Step · Before/After — pick the angle that fits your campaign</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results.hook_variants.map((script, i) => {
                    const labels = ['PAS — Pain / Agitate / Solve', 'Step-by-Step — Tutorial', 'Before / After — Transformation'];
                    const colors = ['#818cf8', '#a78bfa', '#6ee7b7'];
                    return (
                      <div key={script.id || i} className="bg-zinc-950/50 rounded-lg p-4 space-y-3">
                        <p className="text-xs font-semibold" style={{ color: colors[i] }}>{labels[i]}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed" data-testid={i === 0 ? 'ad-script' : i === 1 ? 'tutorial-script' : undefined}>
                          {script.content?.substring(0, 160)}…
                        </p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(script.content); toast.success('Script copied'); }}
                          className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors border border-zinc-800 hover:border-zinc-600 px-3 py-1 rounded"
                        >
                          Copy full script
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Posters */}
            {results.posters?.length > 0 && (
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  Social Posters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.posters.map((poster, index) => (
                    <div key={poster.id} className="bg-zinc-950/50 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-medium text-zinc-300">
                        Poster {index + 1} <span className="text-zinc-600 font-normal">{poster.format}</span>
                      </p>
                      <a href={`${BACKEND_URL}${poster.url}`} target="_blank" rel="noopener noreferrer"
                         data-testid={`download-poster-${index + 1}`}
                         className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-all">
                        <Zap className="w-3.5 h-3.5" /> Download Poster
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's Next — connect this launch to the rest of the platform */}
            <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-indigo-400" />
                What's Next
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {canUseBrands ? (
                  !activeBrand ? (
                    <button
                      onClick={handleSaveAsBrand}
                      disabled={savingBrand}
                      className="flex items-start gap-3 p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-left transition-colors disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-md bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        {savingBrand ? <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" /> : <Briefcase className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">Save "{productName}" as a brand</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Reuse this identity across Logo, Marketing &amp; Legal — no re-typing next time</p>
                      </div>
                    </button>
                  ) : !backendLogoSrc && (
                    <Link to="/logo" className="flex items-start gap-3 p-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors">
                      <div className="w-8 h-8 rounded-md bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                        <Palette className="w-4 h-4 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">Add a logo for {activeBrand.brand_name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">It'll automatically appear on your video slides and posters</p>
                      </div>
                    </Link>
                  )
                ) : (
                  <Link to="/pricing" className="flex items-start gap-3 p-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors">
                    <div className="w-8 h-8 rounded-md bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Save this as a reusable brand</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Upgrade to Starter to keep this identity across Logo, Marketing &amp; Legal</p>
                    </div>
                  </Link>
                )}

                <Link to="/legal" className="flex items-start gap-3 p-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      {(user?.legal?.total_available ?? 0) > 0 ? `Generate legal docs for ${productName}` : 'Set up Privacy Policy & Terms'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {(user?.legal?.total_available ?? 0) > 0
                        ? `${user.legal.total_available} credit${user.legal.total_available === 1 ? '' : 's'} available`
                        : 'Available on Starter and above'}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
