import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  Users, DollarSign, Tag, Inbox, ShieldCheck, Search, LayoutDashboard,
  Ban, Crown, KeyRound, RefreshCw, Trash2, Plus, Loader2, TrendingUp,
  Film, Scale, Server, ScrollText, ShieldAlert, X, Check, Circle,
  Lock, LogOut, ArrowLeft, Database, ExternalLink,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const api = (path) => `${BACKEND_URL}/api/admin${path}`;

const TIERS = ['free', 'starter', 'pro', 'agency'];
const fmtDate = (s) => (s ? new Date(s).toLocaleString() : '—');

// ── Shared primitives ───────────────────────────────────────────────────────
const ACCENT = {
  indigo:  'bg-indigo-500/10 text-indigo-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber:   'bg-amber-500/10 text-amber-400',
  sky:     'bg-sky-500/10 text-sky-400',
  rose:    'bg-rose-500/10 text-rose-400',
  zinc:    'bg-zinc-500/10 text-zinc-400',
};

const Stat = ({ icon: Icon, label, value, sub, accent = 'indigo' }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
    <div className="flex items-start justify-between">
      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${ACCENT[accent]}`}><Icon className="h-4 w-4" /></span>
    </div>
    <div className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</div>
    {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
  </div>
);

const BADGE = {
  free:     'bg-zinc-700/40 text-zinc-300',
  starter:  'bg-sky-500/15 text-sky-300',
  pro:      'bg-indigo-500/15 text-indigo-300',
  agency:   'bg-amber-500/15 text-amber-300',
  admin:    'bg-amber-500/15 text-amber-300',
  banned:   'bg-rose-500/15 text-rose-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  pending:  'bg-amber-500/15 text-amber-300',
};
const Badge = ({ kind, children }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${BADGE[kind] || BADGE.free}`}>{children || kind}</span>
);

const Table = ({ head, children }) => (
  <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-800 text-left text-[11px] uppercase tracking-wider text-zinc-500">
          {head.map((h, i) => <th key={i} className={`px-4 py-3 font-medium ${h.right ? 'text-right' : ''}`}>{h.label}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800/60">{children}</tbody>
    </table>
  </div>
);

const Loading = () => <div className="flex items-center gap-2 py-12 justify-center text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
const Empty = ({ cols, text }) => <tr><td colSpan={cols} className="px-4 py-10 text-center text-zinc-500">{text}</td></tr>;
const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors';
const inputCls = 'rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none';

// ── Overview ────────────────────────────────────────────────────────────────
const Overview = () => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    axios.get(api('/overview')).then(r => setData(r.data)).catch(e => setErr(e.response?.data?.detail || 'Failed to load'));
  }, []);
  if (err) return <div className="text-rose-400 text-sm">{err}</div>;
  if (!data) return <Loading />;
  const u = data.users, r = data.revenue, g = data.usage;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total users" value={u.total.toLocaleString()} sub={`${u.new_today} today · ${u.new_week} this week`} accent="sky" />
        <Stat icon={DollarSign} label="MRR" value={`$${r.mrr_usd.toLocaleString()}`} sub={`$${r.arr_usd.toLocaleString()}/yr · ARPU $${r.arpu_usd}`} accent="emerald" />
        <Stat icon={TrendingUp} label="Paid users" value={u.paid} sub={`${u.conversion_pct}% conversion`} accent="indigo" />
        <Stat icon={Film} label="Videos (30d)" value={g.videos_month} sub={`${g.videos_today} today`} accent="amber" />
      </div>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Users by plan</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map(t => <Stat key={t} icon={Tag} label={`${t} tier`} value={u.by_tier[t]} accent={t === 'free' ? 'zinc' : 'indigo'} />)}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Operations</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Inbox} label="Waitlist pending" value={data.waitlist.pending} sub={`${data.waitlist.total} total`} accent="amber" />
          <Stat icon={Ban} label="Banned" value={u.banned} accent="rose" />
          <Stat icon={ShieldCheck} label="Admins" value={u.admins} accent="indigo" />
          <Stat icon={Database} label="Database" value={data.system.db_connected ? 'Healthy' : 'Down'} sub={data.system.db_connected ? 'connected' : 'unreachable'} accent={data.system.db_connected ? 'emerald' : 'rose'} />
        </div>
      </div>
    </div>
  );
};

// ── User detail drawer ──────────────────────────────────────────────────────
const Row = ({ label, value, mono }) => (
  <div className="flex justify-between gap-3 py-1.5 border-b border-zinc-800/50 last:border-0">
    <span className="text-zinc-500">{label}</span>
    <span className={`text-zinc-300 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
  </div>
);

const UserDrawer = ({ userId, onClose }) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!userId) return;
    setData(null);
    axios.get(api(`/users/${userId}`)).then(r => setData(r.data)).catch(() => toast.error('Failed to load user'));
  }, [userId]);
  if (!userId) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className={`absolute top-4 right-4 text-zinc-400 ${iconBtn}`}><X className="w-4 h-4" /></button>
        {!data ? <Loading /> : (
          <div className="space-y-6">
            <div>
              <div className="text-lg font-semibold text-white">{data.user.name || '—'}</div>
              <div className="text-sm text-zinc-500">{data.user.email}</div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge kind={data.subscription.tier} />
                {data.user.is_admin && <Badge kind="admin" />}
                {data.user.is_banned && <Badge kind="banned" />}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {Object.entries(data.counts).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-900/40 py-3">
                  <div className="text-lg font-semibold text-white">{v}</div>
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">{k.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
            <div className="text-sm">
              <Row label="User ID" value={data.user.id} mono />
              <Row label="Stripe customer" value={data.subscription.stripe_customer_id || '—'} mono />
              <Row label="Tier expires" value={fmtDate(data.subscription.tier_expires_at)} />
              <Row label="Identity verified" value={data.identity_verified ? 'Yes' : 'No'} />
              <Row label="Accepted agreement" value={data.has_agreed ? 'Yes' : 'No'} />
              <Row label="Joined" value={fmtDate(data.user.created_at)} />
            </div>
            {data.brands.length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Brand profiles</div>
                {data.brands.map(b => (
                  <div key={b.id} className="flex items-center gap-2 py-1 text-sm text-zinc-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.primary_color }} /> {b.brand_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Users ───────────────────────────────────────────────────────────────────
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    axios.get(api('/users'), { params: { search, tier, limit: 50 } })
      .then(r => { setUsers(r.data.users); setTotal(r.data.total); })
      .catch(e => toast.error(e.response?.data?.detail || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [search, tier]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  const patch = async (id, body, label) => {
    try { await axios.patch(api(`/users/${id}`), body); toast.success(label); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Update failed'); }
  };
  const resetPw = async (id, email) => {
    if (!window.confirm(`Reset password for ${email}?`)) return;
    try {
      const r = await axios.post(api(`/users/${id}/reset-password`));
      toast.success(r.data.emailed ? 'Reset & emailed' : `Temp password: ${r.data.temp_password}`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Reset failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search email or name…" className={`w-full pl-9 pr-3 py-2 ${inputCls}`} />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)} className={`px-3 py-2 ${inputCls}`}>
          <option value="">All tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Apply
        </button>
      </div>
      <Table head={[{ label: `User · ${total}` }, { label: 'Plan' }, { label: 'Usage v/s/p' }, { label: 'Status' }, { label: 'Actions', right: true }]}>
        {users.map(usr => (
          <tr key={usr.id} className="hover:bg-zinc-900/40 transition-colors">
            <td className="px-4 py-3 cursor-pointer" onClick={() => setDrawer(usr.id)}>
              <div className="font-medium text-zinc-100 hover:text-indigo-300">{usr.name || '—'}</div>
              <div className="text-zinc-500 text-xs">{usr.email}</div>
            </td>
            <td className="px-4 py-3">
              <select value={usr.tier || 'free'} onChange={e => patch(usr.id, { tier: e.target.value }, `Tier → ${e.target.value}`)}
                className="px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-200">
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </td>
            <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">{usr.usage ? `${usr.usage.videos}/${usr.usage.scripts}/${usr.usage.posters}` : '—'}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                {usr.is_admin && <Badge kind="admin" />}
                {usr.is_banned && <Badge kind="banned" />}
                {!usr.is_admin && !usr.is_banned && <span className="text-zinc-600 text-xs">—</span>}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center justify-end gap-1">
                <button title={usr.is_admin ? 'Revoke admin' : 'Make admin'} onClick={() => { if (window.confirm(usr.is_admin ? `Revoke admin access from ${usr.email}?` : `Grant admin access to ${usr.email}?`)) patch(usr.id, { is_admin: !usr.is_admin }, usr.is_admin ? 'Admin revoked' : 'Now admin'); }} className={`text-amber-400 ${iconBtn}`}><Crown className="w-4 h-4" /></button>
                <button title={usr.is_banned ? 'Unban' : 'Ban'} onClick={() => patch(usr.id, { is_banned: !usr.is_banned }, usr.is_banned ? 'Unbanned' : 'Banned')} className={`text-rose-400 ${iconBtn}`}><Ban className="w-4 h-4" /></button>
                <button title="Reset password" onClick={() => resetPw(usr.id, usr.email)} className={`text-zinc-300 ${iconBtn}`}><KeyRound className="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        ))}
        {users.length === 0 && !loading && <Empty cols={5} text="No users found" />}
      </Table>
      <UserDrawer userId={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
};

// ── Content (generations) ───────────────────────────────────────────────────
const ContentTab = () => {
  const [kind, setKind] = useState('video');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const KINDS = [['video', 'Videos'], ['script', 'Scripts'], ['poster', 'Posters'], ['logo', 'Logos']];

  const load = useCallback(() => {
    setLoading(true);
    axios.get(api('/generations'), { params: { kind, limit: 50 } })
      .then(r => setItems(r.data.items)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [kind]);
  useEffect(() => { load(); }, [kind]); // eslint-disable-line

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/40 p-1">
        {KINDS.map(([k, label]) => (
          <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${kind === k ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>{label}</button>
        ))}
      </div>
      <Table head={[{ label: 'Owner' }, { label: 'Detail' }, { label: 'Created' }, { label: '', right: true }]}>
        {items.map((i, idx) => (
          <tr key={i.id || idx} className="hover:bg-zinc-900/40 transition-colors">
            <td className="px-4 py-3 text-zinc-200">{i.owner_email}</td>
            <td className="px-4 py-3 text-zinc-400 text-xs">{i.format || i.type || i.doc_type || i.framework || '—'}</td>
            <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(i.created_at)}</td>
            <td className="px-4 py-3 text-right">
              {i.url && <a href={`${BACKEND_URL}${i.url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs">open <ExternalLink className="w-3 h-3" /></a>}
            </td>
          </tr>
        ))}
        {items.length === 0 && !loading && <Empty cols={4} text="Nothing here yet" />}
      </Table>
    </div>
  );
};

// ── Moderation (talking head / deepfake) ────────────────────────────────────
const ModerationTab = () => {
  const [data, setData] = useState(null);
  useEffect(() => { axios.get(api('/moderation/talking-head')).then(r => setData(r.data)).catch(() => toast.error('Failed to load')); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" /> Talking-head generations require ID verification + consent. Review for misuse.
      </div>
      <Table head={[{ label: `Owner · ${data.log_count}` }, { label: 'Status' }, { label: 'Created' }]}>
        {data.logs.map((l, i) => (
          <tr key={l.id || i} className="hover:bg-zinc-900/40 transition-colors">
            <td className="px-4 py-3 text-zinc-200">{l.owner_email}</td>
            <td className="px-4 py-3 text-zinc-400 text-xs">{l.status || l.result || '—'}</td>
            <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(l.created_at)}</td>
          </tr>
        ))}
        {data.logs.length === 0 && <Empty cols={3} text="No talking-head generations" />}
      </Table>
    </div>
  );
};

// ── Legal ───────────────────────────────────────────────────────────────────
const LegalTab = () => {
  const [data, setData] = useState(null);
  useEffect(() => { axios.get(api('/legal')).then(r => setData(r.data)).catch(() => toast.error('Failed to load')); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat icon={Scale} label="Documents" value={data.totals.documents} accent="indigo" />
        <Stat icon={Scale} label="Profiles" value={data.totals.profiles} accent="sky" />
        <Stat icon={Scale} label="Chats" value={data.totals.chats} accent="emerald" />
      </div>
      <Table head={[{ label: 'Owner' }, { label: 'Type' }, { label: 'Title' }, { label: 'Created' }]}>
        {data.recent.map((d, i) => (
          <tr key={d.id || i} className="hover:bg-zinc-900/40 transition-colors">
            <td className="px-4 py-3 text-zinc-200">{d.owner_email}</td>
            <td className="px-4 py-3 text-zinc-400 text-xs">{d.doc_type || '—'}</td>
            <td className="px-4 py-3 text-zinc-300">{d.title || '—'}</td>
            <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(d.created_at)}</td>
          </tr>
        ))}
        {data.recent.length === 0 && <Empty cols={4} text="No legal documents yet" />}
      </Table>
    </div>
  );
};

// ── Coupons ─────────────────────────────────────────────────────────────────
const CouponsTab = () => {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: '', tier: 'pro', duration_days: 30, max_uses: 5, note: '' });
  const load = () => axios.get(api('/coupons')).then(r => setCoupons(r.data.coupons)).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.code.trim()) return toast.error('Enter a code');
    try {
      await axios.post(api('/coupons'), { ...form, duration_days: Number(form.duration_days), max_uses: Number(form.max_uses) });
      toast.success('Coupon created'); setForm({ code: '', tier: 'pro', duration_days: 30, max_uses: 5, note: '' }); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Create failed'); }
  };
  const deactivate = async (code) => {
    try { await axios.delete(api(`/coupons/${code}`)); toast.success('Deactivated'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">New coupon</div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 items-end">
          <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CODE" className={`px-2.5 py-2 ${inputCls}`} />
          <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className={`px-2.5 py-2 ${inputCls}`}>
            {['starter', 'pro', 'agency'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} placeholder="days" className={`px-2.5 py-2 ${inputCls}`} />
          <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="max uses" className={`px-2.5 py-2 ${inputCls}`} />
          <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="note" className={`px-2.5 py-2 ${inputCls}`} />
          <button onClick={create} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> Create</button>
        </div>
      </div>
      <Table head={[{ label: 'Code' }, { label: 'Tier' }, { label: 'Days' }, { label: 'Uses' }, { label: 'Note' }, { label: '', right: true }]}>
        {coupons.map(c => (
          <tr key={c.code} className={`hover:bg-zinc-900/40 transition-colors ${!c.is_active ? 'opacity-40' : ''}`}>
            <td className="px-4 py-3 font-mono text-zinc-100">{c.code}</td>
            <td className="px-4 py-3"><Badge kind={c.tier} /></td>
            <td className="px-4 py-3 text-zinc-400 tabular-nums">{c.duration_days}</td>
            <td className="px-4 py-3 text-zinc-400 tabular-nums">{c.used_count}/{c.max_uses}</td>
            <td className="px-4 py-3 text-zinc-500">{c.note || '—'}</td>
            <td className="px-4 py-3 text-right">{c.is_active && <button onClick={() => deactivate(c.code)} className={`text-rose-400 ${iconBtn}`}><Trash2 className="w-4 h-4" /></button>}</td>
          </tr>
        ))}
        {coupons.length === 0 && <Empty cols={6} text="No coupons yet" />}
      </Table>
    </div>
  );
};

// ── Waitlist ────────────────────────────────────────────────────────────────
const WaitlistTab = () => {
  const [entries, setEntries] = useState([]);
  const load = () => axios.get(api('/waitlist')).then(r => setEntries(r.data.entries)).catch(() => {});
  useEffect(() => { load(); }, []);
  const approve = async (email) => {
    if (!window.confirm(`Approve ${email}? Creates an account + emails credentials.`)) return;
    try { const r = await axios.post(api('/waitlist/approve'), { email }); toast.success(`Approved. Temp password: ${r.data.temp_password}`); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Approve failed'); }
  };
  return (
    <Table head={[{ label: 'Email' }, { label: 'Name' }, { label: 'Status' }, { label: '', right: true }]}>
      {entries.map(e => (
        <tr key={e.email} className="hover:bg-zinc-900/40 transition-colors">
          <td className="px-4 py-3 text-zinc-100">{e.email}</td>
          <td className="px-4 py-3 text-zinc-400">{e.name || '—'}</td>
          <td className="px-4 py-3"><Badge kind={e.is_approved ? 'approved' : 'pending'} /></td>
          <td className="px-4 py-3 text-right">{!e.is_approved && <button onClick={() => approve(e.email)} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium">Approve</button>}</td>
        </tr>
      ))}
      {entries.length === 0 && <Empty cols={4} text="Waitlist empty" />}
    </Table>
  );
};

// ── System / config ─────────────────────────────────────────────────────────
const SystemTab = () => {
  const [data, setData] = useState(null);
  useEffect(() => { axios.get(api('/system')).then(r => setData(r.data)).catch(() => toast.error('Failed to load')); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Integrations</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(data.integrations).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-2.5 text-sm">
              <span className="text-zinc-300 capitalize">{k.replace(/_/g, ' ')}</span>
              {v
                ? <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs"><Check className="w-3.5 h-3.5" /> set</span>
                : <span className="inline-flex items-center gap-1.5 text-zinc-600 text-xs"><Circle className="w-3 h-3" /> missing</span>}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Database — {data.database.connected ? <span className="text-emerald-400">connected · {data.database.size_mb} MB</span> : <span className="text-rose-400">unreachable</span>}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {Object.entries(data.database.collections).map(([c, n]) => (
            <div key={c} className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
              <div className="text-lg font-semibold text-white tabular-nums">{n ?? '—'}</div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">{c}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Audit ───────────────────────────────────────────────────────────────────
const AuditTab = () => {
  const [entries, setEntries] = useState([]);
  useEffect(() => { axios.get(api('/audit')).then(r => setEntries(r.data.entries)).catch(() => {}); }, []);
  return (
    <Table head={[{ label: 'When' }, { label: 'Admin' }, { label: 'Action' }, { label: 'Target' }]}>
      {entries.map((e, i) => (
        <tr key={i} className="hover:bg-zinc-900/40 transition-colors">
          <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(e.at)}</td>
          <td className="px-4 py-3 text-zinc-400 text-xs">{e.admin_email}</td>
          <td className="px-4 py-3"><span className="font-mono text-xs text-indigo-300">{e.action}</span></td>
          <td className="px-4 py-3 text-zinc-300">{e.target || '—'}</td>
        </tr>
      ))}
      {entries.length === 0 && <Empty cols={4} text="No admin actions recorded yet" />}
    </Table>
  );
};

// ── Navigation model ────────────────────────────────────────────────────────
const NAV = [
  { group: 'Overview', items: [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, el: Overview, title: 'Dashboard', desc: 'Key metrics at a glance' },
  ]},
  { group: 'People', items: [
    { id: 'users', label: 'Users', icon: Users, el: UsersTab, title: 'Users', desc: 'Search, manage plans, roles and access' },
    { id: 'waitlist', label: 'Waitlist', icon: Inbox, el: WaitlistTab, title: 'Beta waitlist', desc: 'Approve access requests' },
  ]},
  { group: 'Content', items: [
    { id: 'content', label: 'Generations', icon: Film, el: ContentTab, title: 'Generations', desc: 'Videos, scripts, posters and logos' },
    { id: 'moderation', label: 'Moderation', icon: ShieldAlert, el: ModerationTab, title: 'Moderation', desc: 'Talking-head / deepfake review' },
    { id: 'legal', label: 'Legal', icon: Scale, el: LegalTab, title: 'Legal documents', desc: 'Documents, profiles and chats' },
  ]},
  { group: 'Billing', items: [
    { id: 'coupons', label: 'Coupons', icon: Tag, el: CouponsTab, title: 'Coupons', desc: 'Promo and gift codes' },
  ]},
  { group: 'System', items: [
    { id: 'system', label: 'System', icon: Server, el: SystemTab, title: 'System', desc: 'Integrations and database health' },
    { id: 'audit', label: 'Audit log', icon: ScrollText, el: AuditTab, title: 'Audit log', desc: 'Every admin action, logged' },
  ]},
];
const ALL_ITEMS = NAV.flatMap(g => g.items);

// ── Console shell (sidebar + header + content) ──────────────────────────────
const Console = () => {
  const { user, logout } = useAuth();
  const [active, setActive] = useState('overview');
  const current = ALL_ITEMS.find(i => i.id === active) || ALL_ITEMS[0];
  const Active = current.el;
  const initial = (user.name || user.email || 'A')[0].toUpperCase();

  const NavButton = ({ item }) => {
    const Icon = item.icon;
    const on = active === item.id;
    return (
      <button onClick={() => setActive(item.id)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          on ? 'bg-indigo-500/10 text-indigo-300' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
        }`}>
        <Icon className="w-4 h-4 shrink-0" /> {item.label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/30">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-5">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold">Admin Console</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV.map(g => (
            <div key={g.group}>
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{g.group}</div>
              <div className="space-y-0.5">{g.items.map(item => <NavButton key={item.id} item={item} />)}</div>
            </div>
          ))}
        </nav>
        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">{initial}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-zinc-200">{user.name || 'Admin'}</div>
              <div className="truncate text-xs text-zinc-500">{user.email}</div>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <Link to="/" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50"><ArrowLeft className="w-3.5 h-3.5" /> App</Link>
            <button onClick={logout} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar + horizontal nav */}
      <div className="lg:hidden border-b border-zinc-800 bg-zinc-900/40">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-400" /><span className="font-semibold">Admin</span></div>
          <div className="flex items-center gap-1">
            <Link to="/" className="p-2 text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4" /></Link>
            <button onClick={logout} className="p-2 text-zinc-400 hover:text-white"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 pb-2">
          {ALL_ITEMS.map(item => {
            const Icon = item.icon;
            const on = active === item.id;
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${on ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}>
                <Icon className="w-4 h-4" /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="border-b border-zinc-800 px-6 py-5 lg:px-8">
          <h1 className="text-xl font-semibold tracking-tight text-white">{current.title}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{current.desc}</p>
        </div>
        <div className="px-6 py-6 lg:px-8">
          <Active />
        </div>
      </main>
    </div>
  );
};

// ── Standalone admin area (separate from the public site) ───────────────────
// /admin renders its OWN sign-in + not-authorized screens — it never falls back
// to the marketing landing page or the main app shell.

const AdminLogin = () => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await login(email, password); }
    catch (err) { toast.error(err.response?.data?.detail || 'Sign in failed'); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-4 shadow-2xl">
        <div className="flex items-center gap-2 text-indigo-400"><Lock className="w-5 h-5" /><span className="text-lg font-semibold text-white">Admin Console</span></div>
        <p className="text-sm text-zinc-500">Sign in with your admin account.</p>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={`w-full px-3 py-2.5 ${inputCls}`} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={`w-full px-3 py-2.5 ${inputCls}`} />
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="flex items-center gap-3 text-xs text-zinc-600"><span className="flex-1 h-px bg-zinc-800" />or<span className="flex-1 h-px bg-zinc-800" /></div>
        <button type="button" onClick={loginWithGoogle}
          className="w-full py-2.5 rounded-lg bg-white text-zinc-800 text-sm font-medium hover:bg-zinc-100 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
          Sign in with Google
        </button>
        <Link to="/" className="block text-center text-xs text-zinc-500 hover:text-zinc-300">← Back to site</Link>
      </form>
    </div>
  );
};

const AdminDenied = () => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center space-y-4 shadow-2xl">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <div className="text-lg font-semibold text-white">Not authorized</div>
        <p className="text-sm text-zinc-500">You're signed in as {user.email}, but this account doesn't have admin access.</p>
        <div className="flex gap-2 justify-center pt-1">
          <Link to="/" className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm">Back to app</Link>
          <button onClick={logout} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm">Sign out</button>
        </div>
      </div>
    </div>
  );
};

export const AdminRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!user) return <AdminLogin />;
  if (!user.is_admin) return <AdminDenied />;
  return <Console />;
};

export const Admin = Console;
export default Console;
