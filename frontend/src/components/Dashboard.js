import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Link as LinkIcon, Zap, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Steps with cumulative % and estimated duration in seconds
const STEPS = [
  { label: 'Analyzing website',       pct: 8,   duration: 4  },
  { label: 'Extracting brand colors', pct: 14,  duration: 3  },
  { label: 'Writing ad script',       pct: 30,  duration: 12 },
  { label: 'Writing tutorial script', pct: 46,  duration: 12 },
  { label: 'Rendering ad video',      pct: 68,  duration: 20 },
  { label: 'Rendering tutorial video',pct: 88,  duration: 18 },
  { label: 'Creating social posters', pct: 96,  duration: 5  },
  { label: 'Packaging results',       pct: 100, duration: 2  },
];

export const Dashboard = () => {
  const [url, setUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [showCreative, setShowCreative] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [usedCreative, setUsedCreative] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canUseCreative = user?.tier && user.tier !== 'free';

  const TOTAL_EST = STEPS.reduce((s, x) => s + x.duration, 0); // ~76s

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
    const advance = () => {
      if (idx >= STEPS.length) return;
      setStepIdx(idx);
      setProgress(STEPS[idx].pct);
      const next = STEPS[idx + 1];
      if (next) {
        stepTimerRef.current = setTimeout(advance, STEPS[idx].duration * 1000);
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
    if (!url || !productName || !targetAudience) {
      toast.error('Please fill in all fields');
      return;
    }

    const hasCreative = canUseCreative && creativeDirection.trim().length > 0;
    setUsedCreative(hasCreative);
    setLoading(true);
    startProgress();
    try {
      const response = await axios.post(`${API}/magic-button`, {
        url,
        product_name: productName,
        target_audience: targetAudience,
        ...(hasCreative ? { creative_direction: creativeDirection.trim() } : {}),
      });

      setProgress(100);
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
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-heading font-bold tracking-tight mb-4" data-testid="dashboard-title">
          <span className="text-gradient">Create Pro Content</span>
          <br />
          <span className="text-zinc-100">In One Click</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Transform any URL into a complete marketing package: ads, tutorials, and social posters.
        </p>
      </div>
      
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-8">
          <div className="space-y-6">
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
                    <span className="text-indigo-400 font-medium">{STEPS[stepIdx]?.label}…</span>
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
            <div className="text-center">
              <h2 className="text-2xl font-heading font-semibold">Your Launch Pack is Ready! 🎉</h2>
              {usedCreative && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <span>✦</span> Creative direction applied
                </span>
              )}
            </div>
            
            {/* Videos Section */}
            {(results.ad_video || results.tutorial_video) && (
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Complete Videos with Voiceover & Captions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.ad_video && (
                    <div className="bg-zinc-950/50 rounded-lg p-4">
                      <p className="text-sm text-zinc-400 mb-2">Ad Video (9:16 - TikTok/Reels)</p>
                      <p className="text-xs text-zinc-500 mb-3">
                        ✓ Voiceover • ✓ Captions • ✓ Zoom Effects • ✓ Progress Bar
                      </p>
                      <a
                        href={`${BACKEND_URL}${results.ad_video.url}`}
                        download
                        data-testid="download-ad-video"
                        className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-md transition-all"
                      >
                        Download Ad Video
                      </a>
                    </div>
                  )}
                  {results.tutorial_video && (
                    <div className="bg-zinc-950/50 rounded-lg p-4">
                      <p className="text-sm text-zinc-400 mb-2">Tutorial Video (16:9 - YouTube)</p>
                      <p className="text-xs text-zinc-500 mb-3">
                        ✓ Voiceover • ✓ Captions • ✓ Zoom Effects • ✓ Progress Bar
                      </p>
                      <a
                        href={`${BACKEND_URL}${results.tutorial_video.url}`}
                        download
                        data-testid="download-tutorial-video"
                        className="inline-block bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 rounded-md transition-all"
                      >
                        Download Tutorial Video
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Scripts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Ad Script (PAS)
                </h3>
                <p className="text-sm text-zinc-400 whitespace-pre-wrap" data-testid="ad-script">{results.ad_script.content.substring(0, 200)}...</p>
              </div>
              
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  Tutorial Script
                </h3>
                <p className="text-sm text-zinc-400 whitespace-pre-wrap" data-testid="tutorial-script">{results.tutorial_script.content.substring(0, 200)}...</p>
              </div>
            </div>
            
            {/* Posters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.posters.map((poster, index) => (
                <div key={poster.id} className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-3">Poster {index + 1} ({poster.format})</h3>
                  <a
                    href={`${BACKEND_URL}${poster.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`download-poster-${index + 1}`}
                    className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-md transition-all"
                  >
                    Download Poster
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'AI-Powered Scripts', desc: 'PAS, Step-by-Step, Before/After frameworks', icon: '📝' },
          { title: 'Auto Video Creation', desc: 'Zoom, pan, captions, and progress bars', icon: '🎬' },
          { title: 'Multi-Format Export', desc: '16:9, 9:16, 1:1 for all platforms', icon: '📱' },
        ].map((feature, i) => (
          <div key={i} className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 card-hover">
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-zinc-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
