import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Video, Download, Upload, Chrome, Play, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const TutorialStudio = () => {
  const { user } = useAuth();
  const [phase, setPhase] = useState('idle'); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [productName, setProductName] = useState('');
  const [brandColor, setBrandColor] = useState('#6366f1');
  const fileInputRef = useRef(null);

  const isPaidTier = user && user.tier !== 'free';

  // ── Manual file upload (fallback for non-Chrome users) ──────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 300 * 1024 * 1024) {
      toast.error('Recording too large (max 300 MB)');
      return;
    }

    setPhase('uploading');
    setProgress(0);
    setResult(null);
    setErrorMsg('');

    const form = new FormData();
    form.append('video', file);
    form.append('format', '16:9');
    form.append('product_name', productName);
    form.append('brand_color', brandColor);

    // Fake progress since fetch doesn't expose upload progress easily
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.5, 88));
    }, 600);

    try {
      const res = await axios.post(`${API}/tutorial/process`, form);
      clearInterval(interval);
      setProgress(100);

      const data = res.data;
      setResult({ ...data, downloadUrl: `${BACKEND_URL}${data.url}` });
      setPhase('done');
      toast.success('Tutorial video ready!');
    } catch (err) {
      clearInterval(interval);
      const msg = err.response?.data?.detail || err.message || 'Processing failed';
      setErrorMsg(msg);
      setPhase('error');
      toast.error('Tutorial processing failed');
    }
  }

  function reset() {
    setPhase('idle');
    setProgress(0);
    setResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Upgrade gate ─────────────────────────────────────────────────────────────
  if (!isPaidTier) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Video className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Tutorial Studio</h1>
          <p className="text-zinc-400 max-w-md mx-auto">
            Record your product in action and auto-generate a polished YouTube tutorial video.
            Available on Starter plan and above.
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
          >
            Upgrade to Starter — $19/mo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Video className="w-6 h-6 text-indigo-400" />
          Tutorial Studio
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Record your product demo → AI narrates each screen → polished YouTube tutorial in 2 minutes.
        </p>
      </div>

      {/* How it works + Chrome Extension */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Chrome Extension card */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Chrome className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-zinc-100 text-sm">Chrome Extension (Recommended)</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Install once. Open your product (logged in), click Record, demo it for 30–90 seconds, click Stop.
            Auto-uploads and processes.
          </p>
          <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
            <li>Install the LaunchBusiness AI extension</li>
            <li>Open your product dashboard in Chrome</li>
            <li>Click the extension icon → Start Recording</li>
            <li>Demo your product → Stop Recording</li>
            <li>Tutorial video appears here automatically</li>
          </ol>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            <Chrome className="w-3.5 h-3.5" />
            Install from Chrome Web Store →
          </a>
          <p className="text-xs text-zinc-600">
            Can't find it? Sideload from <code className="text-zinc-500">extension/</code> folder in the project.
          </p>
        </div>

        {/* Manual upload card */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-zinc-400" />
            <h2 className="font-semibold text-zinc-100 text-sm">Upload a Recording</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Already have a screen recording? Upload it directly. Any screen recorder works
            (OBS, Loom export, QuickTime, etc.).
          </p>
          <p className="text-xs text-zinc-500">Accepted: .webm, .mp4, .mov — max 300 MB</p>

          {/* Settings */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Product name (optional)</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. FitnessGuru AI"
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Brand color</label>
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-zinc-600 font-mono">{brandColor}</span>
            </div>
          </div>

          {phase === 'idle' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Choose Recording File
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/webm,video/mp4,video/quicktime,.webm,.mp4,.mov"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Processing state */}
      {phase === 'uploading' && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <div>
              <p className="font-semibold text-zinc-100 text-sm">Processing your tutorial…</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Extracting frames → Gemini narrates each screen → Edge TTS voices it → FFmpeg assembles the video
              </p>
            </div>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 text-center">Usually takes 45–90 seconds</p>
        </div>
      )}

      {/* Done state */}
      {phase === 'done' && result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-zinc-100">Tutorial video ready!</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-lg font-bold text-zinc-100">{result.frames}</p>
              <p className="text-xs text-zinc-500">screens captured</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-lg font-bold text-zinc-100">{Math.round(result.duration)}s</p>
              <p className="text-xs text-zinc-500">video length</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-lg font-bold text-zinc-100">16:9</p>
              <p className="text-xs text-zinc-500">YouTube format</p>
            </div>
          </div>

          {result.script && (
            <div className="bg-zinc-900/80 rounded-lg p-3 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1 font-medium">Generated narration script:</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{result.script}</p>
            </div>
          )}

          <div className="flex gap-3">
            <a
              href={result.downloadUrl}
              download
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download MP4
            </a>
            <a
              href="/gallery"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              Gallery
            </a>
          </div>

          <button
            onClick={reset}
            className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Record another tutorial →
          </button>
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h2 className="font-semibold text-zinc-100 text-sm">Processing failed</h2>
          </div>
          <p className="text-sm text-zinc-400">{errorMsg}</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Info callout */}
      {phase === 'idle' && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 flex gap-3">
          <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            <strong className="text-zinc-400">How the AI narration works:</strong> Your recording is
            split into one screenshot every 4 seconds (max 12 frames). Gemini Vision looks at each
            screenshot and writes one tutorial sentence describing what's visible — like a real presenter.
            Edge TTS voices the narration, and FFmpeg assembles it into a polished 16:9 YouTube video
            with captions, music, and a branded progress bar.
          </p>
        </div>
      )}

    </div>
  );
};
