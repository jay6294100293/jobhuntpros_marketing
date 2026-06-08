import React, { useState } from 'react';
import { Check, Zap, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Matches backend server.py TIER_CONFIG exactly
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    tier: 'free',
    features: [
      '3 lifetime videos',
      '5 scripts lifetime',
      '5 posters lifetime',
      '9:16 format only',
      'LaunchBusiness AI watermark',
      'Basic slideshow video',
    ],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$19',
    period: '/month',
    tier: 'starter',
    features: [
      '15 videos per month',
      '50 scripts per month',
      '50 posters per month',
      'All formats (9:16, 16:9, 1:1)',
      'No watermark',
      'Background music bed',
      'Tutorial Studio (Chrome extension)',
    ],
    cta: 'Upgrade to Starter',
    highlight: true,
    stripeKey: 'STRIPE_STARTER_PRICE_ID',
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    tier: 'pro',
    features: [
      '50 videos per month',
      '200 scripts per month',
      '200 posters per month',
      'GPU-accelerated cinematic AI video',
      'Tutorial Studio (Chrome extension)',
      'Talking head feature',
      'Priority rendering queue',
    ],
    cta: 'Upgrade to Pro',
    highlight: false,
    stripeKey: 'STRIPE_PRO_PRICE_ID',
  },
  {
    name: 'Agency',
    price: '$149',
    period: '/month',
    tier: 'agency',
    features: [
      '200 videos per month',
      'Unlimited scripts + posters',
      'All AI video features',
      'Team seats',
      'White label option',
      'Priority support',
    ],
    cta: 'Upgrade to Agency',
    highlight: false,
    stripeKey: 'STRIPE_AGENCY_PRICE_ID',
  },
];

export const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleUpgrade = async (plan) => {
    if (!user) { navigate('/register'); return; }
    if (user.tier === plan.tier) { toast.info(`You are already on ${plan.name}!`); return; }
    setLoading(plan.tier);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/billing/checkout`, { tier: plan.tier });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Checkout failed. Stripe may not be configured yet.');
    } finally {
      setLoading(null);
    }
  };

  const tierOrder = ['free', 'starter', 'pro', 'agency'];
  const userTierIdx = tierOrder.indexOf(user?.tier || 'free');

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-heading font-bold text-gradient mb-4">Simple Pricing</h1>
        <p className="text-zinc-400">Start free. Upgrade when you need more.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const planIdx = tierOrder.indexOf(plan.tier);
          const isCurrent = user?.tier === plan.tier;
          const isDowngrade = planIdx < userTierIdx;

          return (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.highlight
                  ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                  : 'bg-zinc-900/40 border-zinc-800'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-semibold text-zinc-100">{plan.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-50">{plan.price}</span>
                  <span className="text-zinc-400 text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.tier === 'free' ? (
                <button
                  disabled
                  className="w-full py-2.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium cursor-not-allowed"
                >
                  {isCurrent ? 'Current Plan' : plan.cta}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={loading === plan.tier || isCurrent || isDowngrade}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                      : isDowngrade
                      ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      : plan.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                  }`}
                >
                  {loading === plan.tier && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCurrent ? 'Current Plan' : isDowngrade ? 'Downgrade' : plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-zinc-600 mt-8">
        All plans include Stripe-secured payments. Cancel anytime.
        Prices in USD.
      </p>
    </div>
  );
};
