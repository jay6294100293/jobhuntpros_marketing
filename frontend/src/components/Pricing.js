import React, { useState } from 'react';
import { Check, Zap, Loader2, Gift, Tag, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Mark a feature as "coming soon" by wrapping it in this helper
const soon = (label) => ({ label, soon: true });

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
      soon('Background music bed'),
      soon('Tutorial Studio (Chrome extension)'),
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
      soon('GPU-accelerated cinematic AI video'),
      soon('Tutorial Studio (Chrome extension)'),
      soon('Talking head feature'),
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
      soon('All AI video features'),
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
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(null);
  const [couponCode, setCouponCode]   = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult]   = useState(null);

  const handleRedeemCoupon = async () => {
    if (!user) { navigate('/login'); return; }
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/billing/redeem-coupon`,
        { code: couponCode.trim() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('jhp_token')}` } }
      );
      setCouponResult({ type: 'success', message: res.data.message });
      toast.success(res.data.message);
      await refreshUser();
      setCouponCode('');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid coupon code';
      setCouponResult({ type: 'error', message: msg });
      toast.error(msg);
    } finally {
      setCouponLoading(false);
    }
  };

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
                {plan.features.map((f, i) => {
                  const isSoon = typeof f === 'object' && f.soon;
                  const label  = isSoon ? f.label : f;
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {isSoon
                        ? <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        : <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      }
                      <span className={isSoon ? 'text-zinc-500' : 'text-zinc-300'}>
                        {label}
                        {isSoon && (
                          <span className="ml-1.5 text-[10px] font-semibold tracking-wide text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full align-middle">
                            SOON
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
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

      {/* Coupon / gift code redemption */}
      <div className="mt-10 max-w-md mx-auto">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Have a gift or promo code?</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleRedeemCoupon()}
              placeholder="Enter code (e.g. TESTER01)"
              className="w-full sm:flex-1 min-w-0 bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-zinc-500 placeholder:tracking-normal placeholder:font-sans"
            />
            <button
              onClick={handleRedeemCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              Apply
            </button>
          </div>
          {couponResult && (
            <div className={`mt-3 p-3 rounded-lg border text-sm ${
              couponResult.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                : 'bg-red-950/40 border-red-800/40 text-red-300'
            }`}>
              {couponResult.message}
            </div>
          )}
          {user?.tier_expires_at && (
            <p className="text-xs text-amber-400 mt-3">
              Your current plan expires on {new Date(user.tier_expires_at).toLocaleDateString()}.
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-zinc-600 mt-8">
        All plans include Stripe-secured payments. Cancel anytime.
        Prices in USD.
      </p>
    </div>
  );
};
