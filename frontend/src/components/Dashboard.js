import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Link as LinkIcon, Zap, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Dashboard = () => {
  const [url, setUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();
  
  const handleMagicButton = async () => {
    if (!url || !productName || !targetAudience) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/magic-button`, {
        url,
        product_name: productName,
        target_audience: targetAudience
      });
      
      setResults(response.data);
      toast.success('Launch Pack generated successfully!');
    } catch (error) {
      console.error('Magic button error:', error);
      const detail = error?.response?.data?.detail || error?.message || 'Failed to generate content';
      toast.error(detail);
    } finally {
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
                  placeholder="SwiftPack AI"
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
            
            <button
              onClick={handleMagicButton}
              disabled={loading}
              data-testid="magic-button"
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-bold px-8 py-4 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </div>
        
        {results && (
          <div className="mt-8 space-y-6" data-testid="results-section">
            <h2 className="text-2xl font-heading font-semibold text-center">Your Launch Pack is Ready! 🎉</h2>
            
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
