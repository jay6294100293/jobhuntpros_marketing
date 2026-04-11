import React, { useState } from 'react';
import { Video, Image as ImageIcon, Download, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const CreateContent = () => {
  const [contentType, setContentType] = useState('video');
  const [format, setFormat] = useState('16:9');
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [colors, setColors] = useState(['#6366f1', '#8b5cf6', '#10b981']);
  const [scriptText, setScriptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  
  const formats = [
    { id: '16:9', name: 'YouTube (16:9)', platform: 'YouTube, Web' },
    { id: '9:16', name: 'Stories (9:16)', platform: 'TikTok, Reels, Stories' },
    { id: '1:1', name: 'Square (1:1)', platform: 'Instagram, LinkedIn' },
  ];
  
  const createPoster = async () => {
    if (!headline) {
      toast.error('Please enter a headline');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/create-poster`, {
        headline,
        subtext,
        brand_colors: colors,
        format
      });
      
      setOutput(response.data);
      toast.success('Poster created successfully!');
    } catch (error) {
      console.error('Poster creation error:', error);
      toast.error('Failed to create poster');
    } finally {
      setLoading(false);
    }
  };
  
  const createVideo = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('video_type', 'tutorial');
      formData.append('format_type', format);
      formData.append('script_text', scriptText || headline || 'Sample video');
      formData.append('image_paths', '[]');
      
      const response = await axios.post(`${API}/create-video`, formData);
      
      setOutput(response.data);
      toast.success('Video created successfully!');
    } catch (error) {
      console.error('Video creation error:', error);
      toast.error('Failed to create video');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreate = () => {
    if (contentType === 'poster') {
      createPoster();
    } else {
      createVideo();
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold mb-3" data-testid="create-content-title">Create Content</h1>
        <p className="text-zinc-400">Generate videos and posters in multiple formats</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Content Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Content Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setContentType('video')}
                    data-testid="content-type-video"
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      contentType === 'video'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Video className="w-5 h-5" />
                    Video
                  </button>
                  <button
                    onClick={() => setContentType('poster')}
                    data-testid="content-type-poster"
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      contentType === 'poster'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <ImageIcon className="w-5 h-5" />
                    Poster
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Format</label>
                <div className="space-y-2">
                  {formats.map((fmt) => (
                    <label key={fmt.id} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="format"
                        value={fmt.id}
                        checked={format === fmt.id}
                        onChange={(e) => setFormat(e.target.value)}
                        data-testid={`format-${fmt.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium group-hover:text-indigo-400 transition-colors">{fmt.name}</p>
                        <p className="text-sm text-zinc-500">{fmt.platform}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {contentType === 'poster' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Headline</label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Enter headline"
                      data-testid="headline-input"
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Subtext</label>
                    <input
                      type="text"
                      value={subtext}
                      onChange={(e) => setSubtext(e.target.value)}
                      placeholder="Optional subtext"
                      data-testid="subtext-input"
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Brand Colors</label>
                    <div className="flex gap-3">
                      {colors.map((color, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const next = [...colors];
                              next[i] = e.target.value;
                              setColors(next);
                            }}
                            data-testid={`color-picker-${i}`}
                            className="w-10 h-10 rounded cursor-pointer border border-zinc-700 bg-transparent"
                          />
                          <span className="text-xs text-zinc-500">{i === 0 ? 'Primary' : i === 1 ? 'Secondary' : 'Accent'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {contentType === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Script / Text</label>
                  <textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="Enter the script or text for your video..."
                    data-testid="script-text-input"
                    rows={4}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600 resize-none"
                  />
                </div>
              )}
              
              <button
                onClick={handleCreate}
                disabled={loading}
                data-testid="create-button"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-md shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {contentType === 'poster' ? <ImageIcon className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    Create {contentType === 'poster' ? 'Poster' : 'Video'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-7">
          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 h-full">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            
            {output ? (
              <div className="space-y-4" data-testid="output-preview">
                <div className="bg-zinc-950/50 rounded-lg p-4">
                  <p className="text-sm text-zinc-500 mb-2">Format: {output.format}</p>
                  <a
                    href={`${BACKEND_URL}${output.url}`}
                    download
                    data-testid="download-output-button"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-md transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download {contentType === 'poster' ? 'Poster' : 'Video'}
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-zinc-600">
                <div className="text-center">
                  {contentType === 'poster' ? (
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  ) : (
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  )}
                  <p>Your {contentType} will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
