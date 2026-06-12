import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Plus, Edit2, Trash2, Check, Loader2,
  Globe, Palette, Users, Zap, ChevronRight, X
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/brand-profiles`;

const TONES       = ['Professional', 'Bold', 'Casual', 'Energetic', 'Friendly', 'Luxury'];
const BIZ_TYPES   = ['SaaS', 'Mobile App', 'E-commerce', 'Service', 'Agency', 'Marketplace', 'Other'];
const JURISDICTIONS = ['Canada', 'USA', 'EU', 'UK', 'Australia', 'Other'];
const REVENUE_MODELS = ['Subscription', 'One-time', 'Freemium', 'Marketplace', 'Ads', 'Services'];
const CTA_OPTIONS = ['Try free', 'Get started', 'Buy now', 'Learn more', 'Download free', 'Book a demo'];

const EMPTY_FORM = {
  brand_name: '', tagline: '', description: '', url: '',
  primary_color: '#6366f1', secondary_color: '#8b5cf6',
  audience: '', tone: 'Professional', business_type: 'SaaS',
  jurisdiction: 'Canada', revenue_model: 'Subscription',
  data_practices: '', key_features: ['', '', ''], cta_text: 'Try free',
};

// ── Small helpers ──────────────────────────────────────────────────────────────

const ColorDot = ({ color }) => (
  <span className="inline-block w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
        style={{ background: color }} />
);

const Badge = ({ label, color = '#6366f1' }) => (
  <span className="text-xs px-2 py-0.5 rounded-full border"
        style={{ borderColor: `${color}40`, color, background: `${color}15` }}>
    {label}
  </span>
);

// ── Profile Card ───────────────────────────────────────────────────────────────

function ProfileCard({ profile, onEdit, onDelete, onSelect, selected }) {
  const features = (profile.key_features || []).filter(Boolean);
  return (
    <div
      onClick={() => onSelect(profile)}
      className="relative rounded-xl p-5 cursor-pointer transition-all border"
      style={{
        background: selected ? 'rgba(99,102,241,0.08)' : 'rgba(24,24,27,0.5)',
        borderColor: selected ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)',
        boxShadow: selected ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none',
      }}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
             style={{ background: '#6366f1' }}>
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="flex gap-1.5 mt-1">
          <ColorDot color={profile.primary_color} />
          <ColorDot color={profile.secondary_color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate"
             style={{ fontFamily: "'Outfit', sans-serif" }}>
            {profile.brand_name}
          </p>
          {profile.tagline && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">{profile.tagline}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {profile.business_type && <Badge label={profile.business_type} />}
        {profile.jurisdiction  && <Badge label={profile.jurisdiction} color="#10b981" />}
        {profile.tone          && <Badge label={profile.tone} color="#a78bfa" />}
      </div>

      {features.length > 0 && (
        <ul className="space-y-1 mb-3">
          {features.slice(0, 2).map((f, i) => (
            <li key={i} className="text-xs text-zinc-500 flex items-start gap-1.5">
              <span className="text-indigo-400 mt-0.5">›</span>{f}
            </li>
          ))}
        </ul>
      )}

      {profile.active_logo_url && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-3">
          <Check className="w-3 h-3" /> Logo set
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-white/5">
        <button
          onClick={e => { e.stopPropagation(); onEdit(profile); }}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(profile); }}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/5"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>
  );
}

// ── Profile Form Modal ─────────────────────────────────────────────────────────

function ProfileFormModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const setFeature = (i, val) => {
    const arr = [...(form.key_features || ['', '', ''])];
    arr[i] = val;
    setForm(f => ({ ...f, key_features: arr }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.brand_name.trim()) { toast.error('Brand name is required'); return; }
    const payload = {
      ...form,
      key_features: (form.key_features || []).filter(Boolean),
    };
    onSave(payload);
  };

  const inputCls = "w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600";
  const labelCls = "text-xs text-zinc-500 mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800"
           style={{ background: '#09090b' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {initial ? 'Edit Brand Profile' : 'New Brand Profile'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Identity */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Brand Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Brand name *</label>
                <input className={inputCls} value={form.brand_name}
                       onChange={e => set('brand_name', e.target.value)}
                       placeholder="LaunchBusiness AI" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Tagline (optional)</label>
                <input className={inputCls} value={form.tagline || ''}
                       onChange={e => set('tagline', e.target.value)}
                       placeholder="From URL to launch-ready in 90 seconds" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>What does this business do? (optional — speeds up Legal intake)</label>
                <textarea className={inputCls} rows={2} value={form.description || ''}
                          onChange={e => set('description', e.target.value)}
                          maxLength={500}
                          placeholder="A 2–3 sentence description of the product, who it's for, and how it makes money." />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Website URL (optional — auto-extracts colors)</label>
                <input className={inputCls} value={form.url || ''}
                       onChange={e => set('url', e.target.value)}
                       placeholder="https://launchbusinessai.com" />
              </div>
              <div>
                <label className={labelCls}>Primary color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color}
                         onChange={e => set('primary_color', e.target.value)}
                         className="w-10 h-9 rounded cursor-pointer border-0 bg-transparent" />
                  <input className={inputCls} value={form.primary_color}
                         onChange={e => set('primary_color', e.target.value)}
                         placeholder="#6366f1" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Secondary color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondary_color}
                         onChange={e => set('secondary_color', e.target.value)}
                         className="w-10 h-9 rounded cursor-pointer border-0 bg-transparent" />
                  <input className={inputCls} value={form.secondary_color}
                         onChange={e => set('secondary_color', e.target.value)}
                         placeholder="#8b5cf6" />
                </div>
              </div>
            </div>
          </div>

          {/* Audience */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Audience & Tone</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Target audience</label>
                <input className={inputCls} value={form.audience || ''}
                       onChange={e => set('audience', e.target.value)}
                       placeholder="Solo founders and small business owners" />
              </div>
              <div>
                <label className={labelCls}>Tone</label>
                <select className={inputCls} value={form.tone || 'Professional'}
                        onChange={e => set('tone', e.target.value)}>
                  {TONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>CTA text</label>
                <select className={inputCls} value={form.cta_text || 'Try free'}
                        onChange={e => set('cta_text', e.target.value)}>
                  {CTA_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Business context */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Business Context <span className="text-zinc-600 normal-case font-normal">(feeds Legal Documents)</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Business type</label>
                <select className={inputCls} value={form.business_type || 'SaaS'}
                        onChange={e => set('business_type', e.target.value)}>
                  {BIZ_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Jurisdiction</label>
                <select className={inputCls} value={form.jurisdiction || 'Canada'}
                        onChange={e => set('jurisdiction', e.target.value)}>
                  {JURISDICTIONS.map(j => <option key={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Revenue model</label>
                <select className={inputCls} value={form.revenue_model || 'Subscription'}
                        onChange={e => set('revenue_model', e.target.value)}>
                  {REVENUE_MODELS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className={labelCls}>Data practices (optional — for Privacy Policy generation)</label>
                <input className={inputCls} value={form.data_practices || ''}
                       onChange={e => set('data_practices', e.target.value)}
                       placeholder="Stores user email and usage data. No third-party sharing." />
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Key Features <span className="text-zinc-600 normal-case font-normal">(used in video scripts)</span></p>
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <input key={i} className={inputCls}
                       value={(form.key_features || [])[i] || ''}
                       onChange={e => setFeature(i, e.target.value)}
                       placeholder={['AI video generation in 90 seconds', 'Legal documents included', 'All social media formats'][i]} />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg border border-zinc-800 hover:border-zinc-600">
              Cancel
            </button>
            <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BrandProfiles({ onSelect, selectedId, compact = false }) {
  const { user } = useAuth();
  const [profiles, setProfiles]   = useState([]);
  const [meta, setMeta]           = useState({ limit: 0, tier: 'free' });
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  const token = () => localStorage.getItem('jhp_token');
  const auth  = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API, auth());
      setProfiles(data.profiles || []);
      setMeta({ limit: data.limit, tier: data.tier });
    } catch {
      toast.error('Failed to load brand profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/${editing.id}`, payload, auth());
        toast.success('Profile updated');
      } else {
        await axios.post(API, payload, auth());
        toast.success('Profile created');
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profile) => {
    if (!window.confirm(`Delete "${profile.brand_name}"? This cannot be undone.`)) return;
    setDeleting(profile.id);
    try {
      await axios.delete(`${API}/${profile.id}`, auth());
      toast.success('Profile deleted');
      if (selectedId === profile.id && onSelect) onSelect(null);
      await load();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const tierLimit = meta.limit;
  const atLimit   = profiles.length >= tierLimit && tierLimit > 0;
  const canCreate = tierLimit > 0 && !atLimit;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  // Free tier gate
  if (tierLimit === 0) return (
    <div className="rounded-xl border border-zinc-800 p-6 text-center"
         style={{ background: 'rgba(24,24,27,0.5)' }}>
      <Briefcase className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
      <p className="text-zinc-400 text-sm mb-1">Brand profiles require a Starter plan</p>
      <p className="text-zinc-600 text-xs">Starter ($19/mo) gives you 1 profile · Pro ($49) gives 3 · Agency ($149) unlimited</p>
    </div>
  );

  return (
    <div className={compact ? '' : 'space-y-4'}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Brand Profiles
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profiles.length}/{tierLimit === 999 ? '∞' : tierLimit} profiles · {meta.tier} plan
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              <Plus className="w-4 h-4" /> New profile
            </button>
          )}
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <Briefcase className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm mb-3">No brand profiles yet</p>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg mx-auto transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <Plus className="w-4 h-4" /> Create first profile
          </button>
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {profiles.map(p => (
            <ProfileCard
              key={p.id}
              profile={p}
              selected={selectedId === p.id}
              onSelect={onSelect || (() => {})}
              onEdit={prof => { setEditing(prof); setShowForm(true); }}
              onDelete={handleDelete}
            />
          ))}
          {canCreate && compact && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="rounded-xl border border-dashed border-zinc-800 p-4 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all"
            >
              <Plus className="w-4 h-4" /> New profile
            </button>
          )}
        </div>
      )}

      {showForm && (
        <ProfileFormModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
