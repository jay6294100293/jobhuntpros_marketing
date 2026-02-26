import React, { useState } from 'react';
import { Wand2, Loader2, Copy, Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ScriptGenerator = () => {
  const [framework, setFramework] = useState('PAS');
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [features, setFeatures] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const frameworks = [
    { id: 'PAS', name: 'Problem-Agitate-Solution', desc: 'Perfect for ads highlighting pain points' },
    { id: 'Step-by-Step', name: 'Step-by-Step Tutorial', desc: 'Great for educational content' },
    { id: 'Before/After', name: 'Before/After', desc: 'Showcase transformation stories' },
  ];
  
  const addFeature = () => {
    setFeatures([...features, '']);
  };
  
  const updateFeature = (index, value) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };
  
  const removeFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
  };
  
  const generateScript = async () => {
    if (!productName || !targetAudience || features.filter(f => f).length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/generate-script`, {
        framework,
        product_name: productName,
        target_audience: targetAudience,
        key_features: features.filter(f => f)
      });
      
      setScript(response.data);
      toast.success('Script generated successfully!');
    } catch (error) {
      console.error('Script generation error:', error);
      toast.error('Failed to generate script');
    } finally {
      setLoading(false);
    }
  };
  
  const copyScript = () => {
    if (script) {
      navigator.clipboard.writeText(script.content);
      setCopied(true);
      toast.success('Script copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold mb-3" data-testid="script-generator-title">AI Script Generator</h1>
        <p className="text-zinc-400">Generate compelling scripts using proven frameworks</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Script Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Framework</label>
                <div className="space-y-2">
                  {frameworks.map((fw) => (
                    <label key={fw.id} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="framework"
                        value={fw.id}
                        checked={framework === fw.id}
                        onChange={(e) => setFramework(e.target.value)}
                        data-testid={`framework-${fw.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium group-hover:text-indigo-400 transition-colors">{fw.name}</p>
                        <p className="text-sm text-zinc-500">{fw.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Enter product name"
                  data-testid="product-name-input"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Who is this for?"
                  data-testid="target-audience-input"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Key Features</label>
                <div className="space-y-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder={`Feature ${index + 1}`}
                        data-testid={`feature-input-${index}`}
                        className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                      />
                      {features.length > 1 && (
                        <button
                          onClick={() => removeFeature(index)}
                          data-testid={`remove-feature-${index}`}
                          className="px-3 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addFeature}
                  data-testid="add-feature-button"
                  className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  + Add Feature
                </button>
              </div>
              
              <button
                onClick={generateScript}
                disabled={loading}
                data-testid="generate-script-button"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-md shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Script
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-7">
          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Generated Script</h2>
              {script && (
                <button
                  onClick={copyScript}
                  data-testid="copy-script-button"
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            
            {script ? (
              <div className="bg-zinc-950/50 rounded-lg p-6 min-h-[400px]" data-testid="generated-script">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-full">
                    {script.framework}
                  </span>
                  <span className="text-xs text-zinc-500">{script.product_name}</span>
                </div>
                <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{script.content}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-zinc-600">
                <div className="text-center">
                  <Wand2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Your AI-generated script will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
