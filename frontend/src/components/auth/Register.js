import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, User, Loader2, CheckCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/request-beta-access`, { email, name });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gradient">SwiftPack AI</h1>
          <p className="text-zinc-400 mt-2">Private Beta</p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 space-y-6">
          {submitted ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-emerald-400" />
              <h2 className="text-xl font-semibold text-zinc-100">Request received!</h2>
              <p className="text-zinc-400 text-sm">
                We'll notify <span className="text-zinc-200">{email}</span> when your account is ready.
              </p>
              <Link
                to="/login"
                className="block w-full py-3 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors text-sm"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-lg">
                <Lock className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-sm text-zinc-300">
                  SwiftPack AI is currently in <span className="text-indigo-400 font-medium">private beta</span>.
                  Enter your email to request access. You will receive your login credentials by email once approved.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name <span className="text-zinc-600">(optional)</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Request Beta Access
                </button>
              </form>

              <p className="text-center text-sm text-zinc-500">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">Beta Version — Not for commercial use</p>
      </div>
    </div>
  );
};
