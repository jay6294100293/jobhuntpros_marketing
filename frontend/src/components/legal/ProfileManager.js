import React, { useState } from 'react';
import { Building2, Plus, Trash2, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function ProfileManager({ profiles, onSelect, onCreated, onDeleted, user }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const tier = user?.tier || 'free';
  const maxProfiles = user?.legal?.max_profiles || 0;
  const canCreate = tier !== 'free' && profiles.length < maxProfiles;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('jhp_token');
      const res = await axios.post(
        `${API}/api/legal/profiles`,
        { name: newName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Profile "${newName}" created`);
      setNewName('');
      setCreating(false);
      onCreated(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not create profile');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (profileId, profileName) => {
    setBusy(true);
    try {
      const token = localStorage.getItem('jhp_token');
      await axios.delete(`${API}/api/legal/profiles/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`"${profileName}" deleted`);
      setConfirmDelete(null);
      onDeleted(profileId);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not delete profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-heading font-bold text-white">Business Profiles</h2>
        <p className="text-zinc-400 mt-1 text-sm">
          Each profile stores your business details and document history.
          {tier !== 'free' && (
            <span className="ml-1 text-zinc-500">
              {profiles.length}/{maxProfiles} profiles used.
            </span>
          )}
        </p>
      </div>

      {/* Free plan gate */}
      {tier === 'free' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-medium text-sm">Upgrade to generate legal documents</p>
              <p className="text-zinc-400 text-sm mt-1">
                Legal document generation is available on Starter ($19/mo) and above.
                You can browse the document catalog on any plan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Existing profiles */}
      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-indigo-500/50 transition-all cursor-pointer"
            onClick={() => onSelect(profile)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{profile.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Created {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {profile.intake_complete ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> Intake needed
                  </span>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(profile); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create profile */}
      {canCreate && (
        <div className="mt-4">
          {creating ? (
            <form onSubmit={handleCreate} className="rounded-xl border border-indigo-500/40 bg-zinc-900/60 p-5">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Business name</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Acme SaaS Inc."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                maxLength={100}
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  disabled={busy || !newName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {busy ? 'Creating…' : 'Create profile'}
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewName(''); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full rounded-xl border border-dashed border-zinc-700 hover:border-indigo-500/50 bg-transparent hover:bg-indigo-500/5 p-5 text-zinc-500 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> New business profile
            </button>
          )}
        </div>
      )}

      {/* Max profiles reached */}
      {!canCreate && tier !== 'free' && profiles.length >= maxProfiles && (
        <p className="text-center text-xs text-zinc-600 mt-4">
          Profile limit reached for {tier} plan. Upgrade to Agency for unlimited profiles.
        </p>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-heading font-bold text-white mb-2">Delete profile?</h3>
            <p className="text-zinc-400 text-sm mb-5">
              Deleting <span className="text-white font-medium">"{confirmDelete.name}"</span> will permanently
              remove all its chat history and generated documents.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(confirmDelete.id, confirmDelete.name)}
                disabled={busy}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
