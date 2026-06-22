import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const hasPassword = user?.has_password !== false; // default to password flow if unknown
  const emailMatches = confirmEmail.trim().toLowerCase() === (user?.email || '').toLowerCase();
  const canDelete = hasPassword ? password.length > 0 : emailMatches;

  const handleDelete = async () => {
    setBusy(true);
    try {
      await axios.delete(`${BACKEND_URL}/api/auth/account`, {
        data: hasPassword ? { password } : { confirm_email: confirmEmail },
      });
      toast.success('Your account and data have been deleted.');
      logout();
      navigate('/login');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Could not delete account. Please try again.';
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1
        style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: '-1px' }}
        className="text-3xl text-zinc-50 mb-8"
      >
        Account settings
      </h1>

      {/* Account info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Name</dt>
            <dd className="text-zinc-200">{user?.name || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Email</dt>
            <dd className="text-zinc-200">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Plan</dt>
            <dd className="text-zinc-200">{user?.plan?.label || user?.tier}</dd>
          </div>
        </dl>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h2 className="text-sm font-semibold text-red-300 uppercase tracking-wide">Danger zone</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Permanently delete your account and all associated data — generated content, brand and
          legal profiles, and usage history. This cannot be undone. Active subscriptions are
          cancelled on a best-effort basis; records of completed payments are retained as required
          for financial record-keeping.
        </p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="px-4 py-2 text-sm font-medium rounded-md border border-red-800 text-red-300 hover:bg-red-900/30 transition-colors"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            {hasPassword ? (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Enter your password to confirm</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-red-700"
                  placeholder="Current password"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Type your email <span className="text-zinc-400">({user?.email})</span> to confirm
                </label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-red-700"
                  placeholder={user?.email}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={!canDelete || busy}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-red-700 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button
                onClick={() => { setConfirming(false); setPassword(''); setConfirmEmail(''); }}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
