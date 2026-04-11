import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status'); // 'success' | 'invalid' — set by backend redirect
  const token = searchParams.get('token');   // set when user clicks link from email
  const [resending, setResending] = useState(false);
  const { user, refreshUser } = useAuth();

  // If backend hasn't redirected yet (token in URL = fresh click from email)
  // The backend handles the actual verification and redirects back with ?status=
  useEffect(() => {
    if (status === 'success') {
      refreshUser?.().catch(() => {});
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const resend = async () => {
    setResending(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/resend-verification`);
      toast.success('Verification email sent — check your inbox');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  const renderContent = () => {
    if (token && !status) {
      // User just clicked the email link — backend is processing (redirect in progress)
      return (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-indigo-400 animate-spin" />
          <p className="text-zinc-300">Verifying your email...</p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 mx-auto text-emerald-400" />
          <h2 className="text-xl font-semibold">Email verified!</h2>
          <p className="text-zinc-400 text-sm">Your account is now fully activated.</p>
          <Link
            to="/"
            className="inline-block mt-2 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      );
    }

    if (status === 'invalid') {
      return (
        <div className="text-center space-y-4">
          <XCircle className="w-16 h-16 mx-auto text-red-400" />
          <h2 className="text-xl font-semibold">Link invalid or expired</h2>
          <p className="text-zinc-400 text-sm">Verification links expire after 24 hours.</p>
          {user && (
            <button
              onClick={resend}
              disabled={resending}
              className="inline-flex items-center gap-2 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {resending && <Loader2 className="w-4 h-4 animate-spin" />}
              Resend verification email
            </button>
          )}
          {!user && (
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 text-sm">Sign in to resend</Link>
          )}
        </div>
      );
    }

    // No token, no status — user navigated here directly
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Verify your email</h2>
        <p className="text-zinc-400 text-sm">
          Check your inbox for a verification link. If you didn't receive it, click below.
        </p>
        {user && !user.email_verified && (
          <button
            onClick={resend}
            disabled={resending}
            className="inline-flex items-center gap-2 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {resending && <Loader2 className="w-4 h-4 animate-spin" />}
            Resend verification email
          </button>
        )}
        {user?.email_verified && (
          <div>
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
            <p className="text-emerald-400 text-sm">Your email is already verified.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gradient">SwiftPack AI</h1>
        </div>
        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
