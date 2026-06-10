import React, { useState, useEffect } from 'react';
import { X, Zap, Loader2, Star, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function TopupModal({ onClose }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(null); // pkg id being purchased
  const token = localStorage.getItem('jhp_token');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/legal/topup/packages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPackages(res.data.packages);
      } catch {
        toast.error('Could not load topup packages');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleBuy = async (pkg) => {
    setRedirecting(pkg.id);
    try {
      const res = await axios.post(
        `${API}/api/legal/topup/checkout`,
        { credits: pkg.credits },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Redirect to Stripe Checkout
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not start checkout');
      setRedirecting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-white">Buy Legal Credits</h2>
              <p className="text-xs text-zinc-500">One-time purchase · credits never expire</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Packages */}
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : (
            packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handleBuy(pkg)}
                disabled={!!redirecting}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-800/40 hover:border-indigo-500/50 hover:bg-indigo-500/5 p-4 text-left transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-400">{pkg.credits}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">{pkg.label}</span>
                        {pkg.tag && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5" />{pkg.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {pkg.value}¢ per credit
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">${pkg.price_usd}</span>
                    {redirecting === pkg.id ? (
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6">
          <p className="text-xs text-zinc-600 text-center">
            Secure payment via Stripe · Credits added instantly after payment · No subscription
          </p>
        </div>
      </div>
    </div>
  );
}
