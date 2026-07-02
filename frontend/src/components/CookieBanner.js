import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import posthog from 'posthog-js';

const STORAGE_KEY = 'cookie_consent';

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't already chosen
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    // PostHog may have been deferred — opt in now
    try { posthog.opt_in_capturing(); } catch {}
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    // Stop PostHog from capturing this session
    try { posthog.opt_out_capturing(); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div className="max-w-3xl mx-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-zinc-300 flex-1 leading-relaxed">
          We use cookies and analytics (PostHog, Sentry) to keep the service stable and
          improve it. No advertising tracking.{' '}
          <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300 underline transition-colors">
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-600 text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
