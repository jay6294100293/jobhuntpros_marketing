import React, { useState, useEffect } from 'react';
import {
  Lock, Loader2, Zap, ChevronDown, ChevronUp,
  FileText, Shield, Briefcase, DollarSign, Users, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

const CATEGORY_ICONS = {
  'Privacy & Compliance': Shield,
  'Business Agreements': Briefcase,
  'Corporate & Equity': Zap,
  'Finance & Operations': DollarSign,
  'HR & Employment': Users,
};

function CreditBadge({ credits }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
      <Zap className="w-2.5 h-2.5" />{credits}
    </span>
  );
}

export default function DocumentCatalog({ profile, user, onGenerate }) {
  const [catalog, setCatalog] = useState({});
  const [credits, setCredits] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState({});
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const canGenerate = user?.tier !== 'free';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/legal/catalog`, { headers });
        setCatalog(res.data.catalog);
        setCredits(res.data.credits);
        // Expand all categories by default
        const exp = {};
        Object.keys(res.data.catalog).forEach(cat => { exp[cat] = true; });
        setExpanded(exp);
      } catch {
        toast.error('Could not load document catalog');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (docId) => {
    if (!canGenerate) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const totalCreditsNeeded = [...selected].reduce((sum, id) => {
    for (const docs of Object.values(catalog)) {
      const doc = docs.find(d => d.id === id);
      if (doc) return sum + doc.credits;
    }
    return sum;
  }, 0);

  const available = credits?.total_available ?? 0;
  const canAfford = available >= totalCreditsNeeded;

  const handleGenerate = async () => {
    if (!selected.size || !canAfford || generating) return;
    if (!profile.intake_complete) {
      toast.error('Complete the intake chat before generating documents.');
      return;
    }
    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/api/legal/generate`,
        { profile_id: profile.id, doc_ids: [...selected] },
        { headers }
      );
      toast.success(`${res.data.generated.length} document(s) generated successfully!`);
      setSelected(new Set());
      // Refresh credit display
      const creditRes = await axios.get(`${API}/api/legal/catalog`, { headers });
      setCredits(creditRes.data.credits);
      onGenerate?.(res.data.generated);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 402) {
        toast.error(detail || 'Not enough credits');
      } else {
        toast.error(detail || 'Generation failed');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: catalog */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="mb-2">
          <h2 className="text-xl font-heading font-bold text-white">{profile.name}</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Select the documents you need. Credits shown per document.</p>
        </div>

        {Object.entries(catalog).map(([category, docs]) => {
          const Icon = CATEGORY_ICONS[category] || FileText;
          const isExpanded = expanded[category] ?? true;
          const selectedInCat = docs.filter(d => selected.has(d.id)).length;

          return (
            <div key={category} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [category]: !prev[category] }))}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="font-medium text-white text-sm">{category}</span>
                  {selectedInCat > 0 && (
                    <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                      {selectedInCat} selected
                    </span>
                  )}
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-zinc-500" />
                  : <ChevronDown className="w-4 h-4 text-zinc-500" />
                }
              </button>

              {/* Docs */}
              {isExpanded && (
                <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
                  {docs.map((doc) => {
                    const isSelected = selected.has(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`flex items-start gap-4 px-5 py-3.5 cursor-pointer transition-colors ${
                          !canGenerate
                            ? 'opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-500/8'
                            : 'hover:bg-zinc-800/30'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="mt-0.5 shrink-0">
                          {canGenerate ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggle(doc.id)}
                              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-offset-zinc-900 cursor-pointer"
                            />
                          ) : (
                            <Lock className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>

                        {/* Doc info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${isSelected ? 'text-indigo-300' : 'text-zinc-200'}`}>
                              {doc.name}
                            </span>
                            <CreditBadge credits={doc.credits} />
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{doc.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: sticky summary panel */}
      <div className="lg:w-72 shrink-0">
        <div className="sticky top-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
          <h3 className="font-heading font-bold text-white mb-4">Summary</h3>

          {/* Credit balance */}
          <div className="rounded-lg bg-zinc-800/60 p-3 mb-4">
            <p className="text-xs text-zinc-500 mb-1">Available credits</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{available}</span>
              <span className="text-xs text-zinc-500">credits</span>
            </div>
            {credits && (
              <div className="mt-2 space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Monthly</span>
                  <span className="text-zinc-400">{credits.monthly_remaining}/{credits.monthly_credits}</span>
                </div>
                {credits.topup > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Topup</span>
                    <span className="text-zinc-400">{credits.topup}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected docs */}
          {selected.size > 0 ? (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Selected ({selected.size})</p>
              {[...selected].map(id => {
                let doc = null;
                for (const docs of Object.values(catalog)) {
                  doc = docs.find(d => d.id === id);
                  if (doc) break;
                }
                if (!doc) return null;
                return (
                  <div key={id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-300 truncate flex-1">{doc.name}</span>
                    <span className="text-xs text-indigo-400 shrink-0">{doc.credits}cr</span>
                  </div>
                );
              })}
              <div className="border-t border-zinc-700 pt-2 flex justify-between">
                <span className="text-xs font-medium text-zinc-300">Total</span>
                <span className="text-xs font-bold text-indigo-400">{totalCreditsNeeded} credits</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-600 mb-4 text-center py-3">No documents selected yet</p>
          )}

          {/* Not enough credits warning */}
          {selected.size > 0 && !canAfford && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 mb-3">
              <p className="text-xs text-red-400">
                Need {totalCreditsNeeded - available} more credits. Purchase a topup or wait for monthly renewal.
              </p>
            </div>
          )}

          {/* Intake incomplete warning */}
          {selected.size > 0 && !profile.intake_complete && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-3">
              <p className="text-xs text-amber-400">
                Complete the intake chat first — the AI needs your business details to generate accurate documents.
              </p>
            </div>
          )}

          {/* Generate button */}
          {canGenerate ? (
            <button
              onClick={handleGenerate}
              disabled={!selected.size || !canAfford || !profile.intake_complete || generating}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                <>Generate {selected.size > 0 ? selected.size : ''} document{selected.size !== 1 ? 's' : ''} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          ) : (
            <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 p-3 text-center">
              <Lock className="w-4 h-4 text-zinc-500 mx-auto mb-1.5" />
              <p className="text-xs text-zinc-500">Upgrade to generate documents</p>
            </div>
          )}

          {generating && (
            <p className="text-xs text-zinc-600 mt-2 text-center">
              Fetching latest 2026 legal requirements + generating…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
