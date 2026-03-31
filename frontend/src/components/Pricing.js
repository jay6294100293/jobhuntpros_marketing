import React, { useState } from 'react';
import { Check, Zap, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['10 AI scripts/month', '5 videos/month', '10 posters/month', 'FFmpeg video rendering', 'gTTS voiceover'],
    cta: 'Current Plan',
    tier: 'free',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    features: ['Unlimited AI scripts', 'Unlimited videos', 'Unlimited posters', 'Priority rendering', 'All formats (16:9, 9:16, 1:1)', 'Email support'],
    cta: 'Upgrade to Pro',
    tier: 'pro',
    highlight: true,
  },
];

export const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) { navigate('/register'); return; }
    if (user.tier === 'pro') { toast.info('You are already on Pro!'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/billing/checkout`);
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Checkout failed. Stripe may not be configured yet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-heading font-bold text-gradient mb-4">Simple Pricing</h1>
        <p className="text-zinc-400">Start free. Upgrade when you need more.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map(plan => (
          <div
            key={plan.name}
            className={`relative rounded-xl border p-8 flex flex-col ${
              plan.highlight
                ? 'bg-indigo-950/40 border-indigo-500/50'
                : 'bg-zinc-900/40 border-zinc-800'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Most Popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">{plan.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-50">{plan.price}</span>
                <span className="text-zinc-400 text-sm">{plan.period}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {plan.tier === 'free' ? (
              <button
                disabled
                className="w-full py-3 bg-zinc-800 text-zinc-400 rounded-lg font-medium cursor-not-allowed"
              >
                {user?.tier === 'free' ? 'Current Plan' : plan.cta}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading || user?.tier === 'pro'}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {user?.tier === 'pro' ? 'Current Plan' : plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
