import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Palette, Wand2, Download, Check, Loader2, Sparkles, LayoutTemplate, Cpu, Briefcase, Star, Lock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useBrand } from '../context/BrandContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STYLES = [
  { id: 'minimal',  label: 'Minimal',  desc: 'Clean & simple' },
  { id: 'bold',     label: 'Bold',     desc: 'Strong & striking' },
  { id: 'tech',     label: 'Tech',     desc: 'Code aesthetic' },
  { id: 'gradient', label: 'Gradient', desc: 'Colorful flow' },
  { id: 'monogram', label: 'Monogram', desc: 'Initial mark' },
  { id: 'split',    label: 'Split',    desc: 'Two-tone split' },
];

const MODES = [
  { id: 'template', label: 'Templates only', desc: 'Free, instant, consistent', Icon: LayoutTemplate },
  { id: 'ai',       label: 'AI only',        desc: 'Requires Ideogram key',     Icon: Sparkles },
  { id: 'both',     label: 'Both',           desc: 'Templates + AI concepts',   Icon: Cpu },
];

const inputCls = "w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600";

export const LogoCreator = () => {
  const { activeBrand, canUseBrands } = useBrand();
  const [brandName, setBrandName]           = useState('');
  const [tagline, setTagline]               = useState('');
  const [primaryColor, setPrimaryColor]     = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [style, setStyle]                   = useState('minimal');
  const [mode, setMode]                     = useState('both');
  const [loading, setLoading]               = useState(false);
  const [results, setResults]               = useState(null);
  const [selected, setSelected]             = useState(null);
  const [settingLogo, setSettingLogo]       = useState(false);

  const token = () => localStorage.getItem('jhp_token');

  // Auto-fill brand fields whenever the app-wide active brand changes
  useEffect(() => {
    if (!activeBrand) return;
    if (activeBrand.brand_name)      setBrandName(activeBrand.brand_name);
    if (activeBrand.tagline)         setTagline(activeBrand.tagline);
    if (activeBrand.primary_color)   setPrimaryColor(activeBrand.primary_color);
    if (activeBrand.secondary_color) setSecondaryColor(activeBrand.secondary_color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id]);

  const handleSetActiveLogo = async (logoUrl) => {
    if (!activeBrand) {
      toast.error('Pick a brand from the switcher in the navbar first');
      return;
    }
    setSettingLogo(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/brand-profiles/${activeBrand.id}/set-logo`,
        { logo_url: logoUrl },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      toast.success(`Logo saved to "${activeBrand.brand_name}" — it will now appear on your video slides and posters`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save logo');
    } finally {
      setSettingLogo(false);
    }
  };

  const handleSelect = async (logo) => {
    setSelected(logo);
    if (activeBrand) {
      await handleSetActiveLogo(logo.url);
    }
  };

  const handleGenerate = async () => {
    if (!brandName.trim()) { toast.error('Brand name is required'); return; }
    setLoading(true);
    setResults(null);
    setSelected(null);
    try {
      const { data } = await axios.post(`${API}/generate-logo`, {
        brand_name: brandName.trim(),
        tagline: tagline.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        style,
        mode,
      }, { headers: { Authorization: `Bearer ${token()}` } });
      setResults(data);
      const total = (data.templates?.length || 0) + (data.ai_concepts?.length || 0);
      toast.success(`${total} logo${total !== 1 ? 's' : ''} generated`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Logo generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const res = await axios.get(`${BACKEND_URL}${url}`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Download failed');
    }
  };

  const safeName = brandName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'logo';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Palette className="w-5 h-5 text-white" />
          </div>
          Logo Creator
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Generate brand logos with AI and templates. Select a brand profile to auto-fill and save the logo back.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left panel: controls ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Active brand status */}
          {canUseBrands ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Active Brand</h2>
              {activeBrand ? (
                <>
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10">
                    <div className="flex gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ background: activeBrand.primary_color }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: activeBrand.secondary_color }} />
                    </div>
                    <span className="text-sm text-indigo-300 font-medium flex-1 truncate">{activeBrand.brand_name}</span>
                    <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-emerald-500 mt-2">
                    Fields auto-filled from this brand. Clicking a logo will save it here automatically.
                  </p>
                </>
              ) : (
                <Link
                  to="/brands"
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 text-sm text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  Create a brand profile to auto-fill & save logos
                </Link>
              )}
              <Link to="/brands" className="block text-xs text-zinc-600 hover:text-zinc-400 mt-2 transition-colors">
                Manage brands →
              </Link>
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-zinc-600" />
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Brand Profile</h2>
              </div>
              <p className="text-xs text-zinc-600 mb-3">
                Save logos to your brand so they auto-appear in videos, posters, and legal docs.
              </p>
              <Link to="/pricing" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Upgrade to Starter to unlock →
              </Link>
            </div>
          )}

          {/* Brand info */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Brand Info</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Brand Name *</label>
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
                       placeholder="FitnessGuru AI" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Tagline (optional)</label>
                <input type="text" value={tagline} onChange={e => setTagline(e.target.value)}
                       placeholder="Your AI personal trainer" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Brand Colors</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Primary',   val: primaryColor,   set: setPrimaryColor },
                { label: 'Secondary', val: secondaryColor, set: setSecondaryColor },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-xs text-zinc-500 mb-2 block">{label}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={val} onChange={e => set(e.target.value)}
                           className="w-9 h-9 rounded-lg border border-zinc-700 cursor-pointer bg-transparent p-0.5" />
                    <span className="text-xs font-mono text-zinc-400">{val}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Template Style</h2>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                        className={`p-3 rounded-lg border text-left transition-all active:scale-95 ${
                          style === s.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-600'
                        }`}>
                  <div className="text-sm font-medium text-zinc-200">{s.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Generation Mode</h2>
            <div className="space-y-2">
              {MODES.map(({ id, label, desc, Icon }) => (
                <button key={id} onClick={() => setMode(id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          mode === id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-600'
                        }`}>
                  <Icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200">{label}</div>
                    <div className="text-xs text-zinc-500">{desc}</div>
                  </div>
                  {mode === id && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !brandName.trim()}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-4 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
              : <><Wand2 className="w-5 h-5" /> Generate Logos</>}
          </button>
        </div>

        {/* ── Right panel: results ── */}
        <div className="lg:col-span-2">
          {!results && !loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl text-zinc-600">
              <Palette className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">Fill in your brand details and click Generate</p>
              <p className="text-xs mt-1 opacity-60">Templates are free — no API key needed</p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              <p className="text-zinc-400 text-sm">Creating your logos...</p>
            </div>
          )}

          {results && !loading && (
            <div className="space-y-6">

              {!results.ai_available && mode !== 'template' && (
                <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-4 text-sm text-amber-300">
                  <strong>Ideogram API not configured.</strong> Set <code className="font-mono text-xs bg-amber-900/40 px-1 py-0.5 rounded">IDEOGRAM_API_KEY</code> in your .env to unlock AI concepts. Showing templates only.
                </div>
              )}

              {results.templates?.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Template Logos</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {results.templates.map(logo => (
                      <LogoCard key={logo.id} logo={logo}
                                isSelected={selected?.id === logo.id}
                                onSelect={() => handleSelect(logo)}
                                onDownload={() => handleDownload(logo.url, `${safeName}-${logo.template}.png`)}
                                backendUrl={BACKEND_URL} />
                    ))}
                  </div>
                </div>
              )}

              {results.ai_concepts?.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    AI Concepts <span className="text-indigo-400">✦</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {results.ai_concepts.map(logo => (
                      <LogoCard key={logo.id} logo={logo}
                                isSelected={selected?.id === logo.id}
                                onSelect={() => handleSelect(logo)}
                                onDownload={() => handleDownload(logo.url, `${safeName}-ai-${logo.id.slice(0, 6)}.png`)}
                                backendUrl={BACKEND_URL} isAI />
                    ))}
                  </div>
                </div>
              )}

              {/* Selected action bar */}
              {selected && (
                <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm text-indigo-300">Logo selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDownload(selected.url, `${safeName}-logo-1024.png`)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Download 1024×1024
                    </button>
                    {canUseBrands && (
                      <button
                        onClick={() => handleSetActiveLogo(selected.url)}
                        disabled={settingLogo || !activeBrand}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors active:scale-95 border disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: activeBrand ? 'rgba(16,185,129,0.1)' : 'rgba(39,39,42,0.6)',
                          borderColor: activeBrand ? 'rgba(16,185,129,0.3)' : 'rgba(63,63,70,1)',
                          color: activeBrand ? '#6ee7b7' : '#71717a',
                        }}
                      >
                        {settingLogo
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Star className="w-4 h-4" />}
                        {activeBrand
                          ? `Save to "${activeBrand.brand_name}"`
                          : 'Pick a brand above first'}
                      </button>
                    )}
                  </div>
                  {canUseBrands && !activeBrand && (
                    <p className="text-xs text-zinc-600">
                      Pick a brand from the switcher in the navbar — clicking a logo will save it automatically.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LogoCard = ({ logo, isSelected, onSelect, onDownload, backendUrl, isAI = false }) => {
  const src = logo.url.startsWith('http') ? logo.url : `${backendUrl}${logo.url}`;
  return (
    <div onClick={onSelect}
         className={`relative group rounded-xl border overflow-hidden cursor-pointer transition-all ${
           isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-zinc-800 hover:border-zinc-600'
         }`}>
      <div className="aspect-square bg-zinc-950">
        <img src={src} alt={logo.template || 'AI logo'}
             className="w-full h-full object-cover"
             onError={e => { e.target.style.display = 'none'; }} />
      </div>
      <div className="absolute inset-0 bg-zinc-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
        <button onClick={e => { e.stopPropagation(); onDownload(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors active:scale-95">
          <Download className="w-3 h-3" /> Download PNG
        </button>
        {!isSelected && <span className="text-xs text-zinc-500">Click to select</span>}
      </div>
      <div className="absolute top-2 left-2 flex gap-1">
        {isAI && <span className="px-1.5 py-0.5 bg-indigo-600/90 text-white text-xs rounded font-medium">AI</span>}
        {isSelected && <span className="px-1.5 py-0.5 bg-green-600/90 text-white text-xs rounded font-medium">Selected</span>}
      </div>
      {logo.template && (
        <div className="absolute bottom-0 inset-x-0 bg-zinc-900/90 px-3 py-1.5">
          <span className="text-xs text-zinc-400 capitalize">{logo.template}</span>
        </div>
      )}
    </div>
  );
};
