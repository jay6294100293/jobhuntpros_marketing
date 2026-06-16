import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Users, DollarSign, Activity, Tag, Inbox, ShieldCheck, Search,
  Ban, Crown, KeyRound, RefreshCw, Trash2, Plus, Loader2,
  Film, Scale, Server, ScrollText, ShieldAlert, X, Check, Circle,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const api = (path) => `${BACKEND_URL}/api/admin${path}`;

const TIERS = ['free', 'starter', 'pro', 'agency'];
const fmtDate = (s) => (s ? new Date(s).toLocaleString() : '—');

const Stat = ({ icon: Icon, label, value, sub }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
      <Icon className="w-4 h-4" /> {label}
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
  </div>
);

const Table = ({ head, children, cols }) => (
  <div className="overflow-x-auto rounded-xl border border-zinc-800">
    <table className="w-full text-sm">
      <thead className="bg-zinc-900/80 text-zinc-400 text-xs">
        <tr>{head.map((h, i) => <th key={i} className={`px-3 py-2 ${h.right ? 'text-right' : 'text-left'}`}>{h.label}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Loading = () => <div className="flex items-center gap-2 text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
const Empty = ({ cols, text }) => <tr><td colSpan={cols} className="px-3 py-6 text-center text-zinc-500">{text}</td></tr>;

// ── Overview ───────────────────────────────────────────────────────────────
const Overview = () => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    axios.get(api('/overview')).then(r => setData(r.data)).catch(e => setErr(e.response?.data?.detail || 'Failed to load'));
  }, []);
  if (err) return <div className="text-red-400 text-sm">{err}</div>;
  if (!data) return <Loading />;
  const u = data.users, r = data.revenue, g = data.usage;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="Total users" value={u.total} sub={`${u.new_today} today · ${u.new_week} this week`} />
        <Stat icon={DollarSign} label="MRR" value={`$${r.mrr_usd.toLocaleString()}`} sub={`$${r.arr_usd.toLocaleString()}/yr · ARPU $${r.arpu_usd}`} />
        <Stat icon={Crown} label="Paid users" value={u.paid} sub={`${u.conversion_pct}% conversion`} />
        <Stat icon={Activity} label="Videos (30d)" value={g.videos_month} sub={`${g.videos_today} today`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TIERS.map(t => <Stat key={t} icon={Tag} label={`${t[0].toUpperCase()}${t.slice(1)} tier`} value={u.by_tier[t]} />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Inbox} label="Waitlist pending" value={data.waitlist.pending} sub={`${data.waitlist.total} total`} />
        <Stat icon={Ban} label="Banned" value={u.banned} />
        <Stat icon={ShieldCheck} label="Admins" value={u.admins} />
        <Stat icon={Server} label="Database" value={data.system.db_connected ? 'OK' : 'Down'} sub={data.system.db_connected ? 'connected' : 'unreachable'} />
      </div>
    </div>
  );
};

// ── User detail drawer ─────────────────────────────────────────────────────
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
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded hover:bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
        {!data ? <Loading /> : (
          <div className="space-y-5">
            <div>
              <div className="text-lg font-bold text-white">{data.user.name || '—'}</div>
              <div className="text-sm text-zinc-500">{data.user.email}</div>
              <div className="flex gap-1 mt-2">
                {data.user.is_admin && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">admin</span>}
                {data.user.is_banned && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">banned</span>}
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs">{data.subscription.tier}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {Object.entries(data.counts).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-900/60 py-2">
                  <div className="text-lg font-bold text-white">{v}</div>
                  <div className="text-[10px] text-zinc-500">{k.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm">
              <Row label="User ID" value={data.user.id} mono />
              <Row label="Stripe customer" value={data.subscription.stripe_customer_id || '—'} mono />
              <Row label="Tier expires" value={fmtDate(data.subscription.tier_expires_at)} />
              <Row label="Identity verified" value={data.identity_verified ? 'Yes' : 'No'} />
              <Row label="Accepted agreement" value={data.has_agreed ? 'Yes' : 'No'} />
              <Row label="Joined" value={fmtDate(data.user.created_at)} />
            </div>
            {data.brands.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-1">Brand profiles</div>
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
const Row = ({ label, value, mono }) => (
  <div className="flex justify-between gap-3"><span className="text-zinc-500">{label}</span><span className={`text-zinc-300 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</span></div>
);

// ── Users ──────────────────────────────────────────────────────────────────
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search email or name…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:border-indigo-500 outline-none" />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)} className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200">
          <option value="">All tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Apply
        </button>
      </div>
      <div className="text-xs text-zinc-500">{total} users</div>
      <Table head={[{ label: 'User' }, { label: 'Tier' }, { label: 'Usage (v/s/p)' }, { label: 'Flags' }, { label: '', right: true }]}>
        {users.map(usr => (
          <tr key={usr.id} className="border-t border-zinc-800/70 hover:bg-zinc-900/40">
            <td className="px-3 py-2 cursor-pointer" onClick={() => setDrawer(usr.id)}>
              <div className="text-zinc-200 hover:text-indigo-300">{usr.name || '—'}</div>
              <div className="text-zinc-500 text-xs">{usr.email}</div>
            </td>
            <td className="px-3 py-2">
              <select value={usr.tier || 'free'} onChange={e => patch(usr.id, { tier: e.target.value }, `Tier → ${e.target.value}`)}
                className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-200">
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </td>
            <td className="px-3 py-2 text-zinc-400 text-xs">{usr.usage ? `${usr.usage.videos}/${usr.usage.scripts}/${usr.usage.posters}` : '—'}</td>
            <td className="px-3 py-2">
              <div className="flex gap-1">
                {usr.is_admin && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">admin</span>}
                {usr.is_banned && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">banned</span>}
              </div>
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center justify-end gap-1">
                <button title={usr.is_admin ? 'Revoke admin' : 'Make admin'} onClick={() => patch(usr.id, { is_admin: !usr.is_admin }, usr.is_admin ? 'Admin revoked' : 'Now admin')} className="p-1.5 rounded hover:bg-zinc-800 text-amber-400"><Crown className="w-4 h-4" /></button>
                <button title={usr.is_banned ? 'Unban' : 'Ban'} onClick={() => patch(usr.id, { is_banned: !usr.is_banned }, usr.is_banned ? 'Unbanned' : 'Banned')} className="p-1.5 rounded hover:bg-zinc-800 text-red-400"><Ban className="w-4 h-4" /></button>
                <button title="Reset password" onClick={() => resetPw(usr.id, usr.email)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300"><KeyRound className="w-4 h-4" /></button>
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

// ── Content (generations) ──────────────────────────────────────────────────
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
      <div className="flex gap-1">
        {KINDS.map(([k, label]) => (
          <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-lg text-sm ${kind === k ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'}`}>{label}</button>
        ))}
      </div>
      <Table head={[{ label: 'Owner' }, { label: 'Detail' }, { label: 'Created' }, { label: '', right: true }]}>
        {items.map((i, idx) => (
          <tr key={i.id || idx} className="border-t border-zinc-800/70">
            <td className="px-3 py-2 text-zinc-300">{i.owner_email}</td>
            <td className="px-3 py-2 text-zinc-400 text-xs">{i.format || i.type || i.doc_type || i.framework || '—'}</td>
            <td className="px-3 py-2 text-zinc-500 text-xs">{fmtDate(i.created_at)}</td>
            <td className="px-3 py-2 text-right">
              {i.url && <a href={`${BACKEND_URL}${i.url}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs">open</a>}
            </td>
          </tr>
        ))}
        {items.length === 0 && !loading && <Empty cols={4} text="Nothing here yet" />}
      </Table>
    </div>
  );
};

// ── Moderation (talking head / deepfake) ───────────────────────────────────
const ModerationTab = () => {
  const [data, setData] = useState(null);
  useEffect(() => { axios.get(api('/moderation/talking-head')).then(r => setData(r.data)).catch(() => toast.error('Failed to load')); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-amber-400 text-sm">
        <ShieldAlert className="w-4 h-4" /> Talking-head generations require ID verification + consent. Review for misuse.
      </div>
      <div>
        <div className="text-xs text-zinc-500 mb-1">Generations ({data.log_count})</div>
        <Table head={[{ label: 'Owner' }, { label: 'Status' }, { label: 'Created' }]}>
          {data.logs.map((l, i) => (
            <tr key={l.id || i} className="border-t border-zinc-800/70">
              <td className="px-3 py-2 text-zinc-300">{l.owner_email}</td>
              <td className="px-3 py-2 text-zinc-400 text-xs">{l.status || l.result || '—'}</td>
              <td className="px-3 py-2 text-zinc-500 text-xs">{fmtDate(l.created_at)}</td>
            </tr>
          ))}
          {data.logs.length === 0 && <Empty cols={3} text="No talking-head generations" />}
        </Table>
      </div>
    </div>
  );
};

// ── Legal ──────────────────────────────────────────────────────────────────
const LegalTab = () => {
  const [data, setData] = useState(null);
  useEffect(() => { axios.get(api('/legal')).then(r => setData(r.data)).catch(() => toast.error('Failed to load')); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Scale} label="Documents" value={data.totals.documents} />
        <Stat icon={Scale} label="Profiles" value={data.totals.profiles} />
        <Stat icon={Scale} label="Chats" value={data.totals.chats} />
      </div>
      <Table head={[{ label: 'Owner' }, { label: 'Type' }, { label: 'Title' }, { label: 'Created' }]}>
        {data.recent.map((d, i) => (
          <tr key={d.id || i} className="border-t border-zinc-800/70">
            <td className="px-3 py-2 text-zinc-300">{d.owner_email}</td>
            <td className="px-3 py-2 text-zinc-400 text-xs">{d.doc_type || '—'}</td>
            <td className="px-3 py-2 text-zinc-400">{d.title || '—'}</td>
            <td className="px-3 py-2 text-zinc-500 text-xs">{fmtDate(d.created_at)}</td>
          </tr>
        ))}
        {data.recent.length === 0 && <Empty cols={4} text="No legal documents yet" />}
      </Table>
    </div>
  );
};

// ── Coupons ────────────────────────────────────────────────────────────────
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 grid grid-cols-2 lg:grid-cols-6 gap-2 items-end">
        <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CODE" className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-200" />
        <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-200">
          {['starter', 'pro', 'agency'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="number" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} placeholder="days" className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-200" />
        <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="max uses" className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-200" />
        <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="note" className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-200" />
        <button onClick={create} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> Create</button>
      </div>
      <Table head={[{ label: 'Code' }, { label: 'Tier' }, { label: 'Days' }, { label: 'Uses' }, { label: 'Note' }, { label: '', right: true }]}>
        {coupons.map(c => (
          <tr key={c.code} className={`border-t border-zinc-800/70 ${!c.is_active ? 'opacity-40' : ''}`}>
            <td className="px-3 py-2 font-mono text-zinc-200">{c.code}</td>
            <td className="px-3 py-2">{c.tier}</td>
            <td className="px-3 py-2">{c.duration_days}</td>
            <td className="px-3 py-2">{c.used_count}/{c.max_uses}</td>
            <td className="px-3 py-2 text-zinc-500">{c.note || '—'}</td>
            <td className="px-3 py-2 text-right">{c.is_active && <button onClick={() => deactivate(c.code)} className="p-1.5 rounded hover:bg-zinc-800 text-red-400"><Trash2 className="w-4 h-4" /></button>}</td>
          </tr>
        ))}
        {coupons.length === 0 && <Empty cols={6} text="No coupons yet" />}
      </Table>
    </div>
  );
};

// ── Waitlist ───────────────────────────────────────────────────────────────
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
        <tr key={e.email} className="border-t border-zinc-800/70">
          <td className="px-3 py-2 text-zinc-200">{e.email}</td>
          <td className="px-3 py-2 text-zinc-400">{e.name || '—'}</td>
          <td className="px-3 py-2">{e.is_approved ? <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">approved</span> : <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">pending</span>}</td>
          <td className="px-3 py-2 text-right">{!e.is_approved && <button onClick={() => approve(e.email)} className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs">Approve</button>}</td>
        </tr>
      ))}
      {entries.length === 0 && <Empty cols={4} text="Waitlist empty" />}
    </Table>
  );
};

// ── System / config ────────────────────────────────────────────────────────
const SystemTab = () => {
  const [data, setData] = useState(null);
  useEffect(() => { axios.get(api('/system')).then(r => setData(r.data)).catch(() => toast.error('Failed to load')); }, []);
  if (!data) return <Loading />;
  const Dot = ({ ok }) => ok
    ? <Check className="w-4 h-4 text-green-400" />
    : <Circle className="w-3.5 h-3.5 text-zinc-600" />;
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-zinc-300 mb-2">Integrations</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(data.integrations).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
              <span className="text-zinc-400">{k.replace(/_/g, ' ')}</span>
              <span className="flex items-center gap-1.5">{v ? 'set' : 'missing'} <Dot ok={v} /></span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-zinc-300 mb-2">Database — {data.database.connected ? `connected · ${data.database.size_mb} MB` : 'unreachable'}</div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {Object.entries(data.database.collections).map(([c, n]) => (
            <div key={c} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
              <div className="text-lg font-bold text-white">{n ?? '—'}</div>
              <div className="text-[10px] text-zinc-500">{c}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Audit ──────────────────────────────────────────────────────────────────
const AuditTab = () => {
  const [entries, setEntries] = useState([]);
  useEffect(() => { axios.get(api('/audit')).then(r => setEntries(r.data.entries)).catch(() => {}); }, []);
  return (
    <Table head={[{ label: 'When' }, { label: 'Admin' }, { label: 'Action' }, { label: 'Target' }]}>
      {entries.map((e, i) => (
        <tr key={i} className="border-t border-zinc-800/70">
          <td className="px-3 py-2 text-zinc-500 text-xs">{fmtDate(e.at)}</td>
          <td className="px-3 py-2 text-zinc-400 text-xs">{e.admin_email}</td>
          <td className="px-3 py-2 text-zinc-300">{e.action}</td>
          <td className="px-3 py-2 text-zinc-400">{e.target || '—'}</td>
        </tr>
      ))}
      {entries.length === 0 && <Empty cols={4} text="No admin actions recorded yet" />}
    </Table>
  );
};

// ── Shell ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity, el: Overview },
  { id: 'users', label: 'Users', icon: Users, el: UsersTab },
  { id: 'content', label: 'Content', icon: Film, el: ContentTab },
  { id: 'moderation', label: 'Moderation', icon: ShieldAlert, el: ModerationTab },
  { id: 'legal', label: 'Legal', icon: Scale, el: LegalTab },
  { id: 'coupons', label: 'Coupons', icon: Tag, el: CouponsTab },
  { id: 'waitlist', label: 'Waitlist', icon: Inbox, el: WaitlistTab },
  { id: 'system', label: 'System', icon: Server, el: SystemTab },
  { id: 'audit', label: 'Audit', icon: ScrollText, el: AuditTab },
];

export const Admin = () => {
  const [tab, setTab] = useState('overview');
  const Active = TABS.find(t => t.id === tab).el;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">Admin</h1>
      </div>
      <div className="flex gap-1 mb-6 border-b border-zinc-800 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>
      <Active />
    </div>
  );
};

export default Admin;
