import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Mail, User, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    if (!password) { toast.error('Please enter a password'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        email,
        name,
        password,
      });
      // Auto-login after successful registration
      if (res.data?.access_token) {
        login(res.data.access_token, res.data.user);
        toast.success('Account created! Welcome to LaunchBusiness AI 🎉');
        navigate('/');
      } else {
        toast.success('Account created! Please sign in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gradient">LaunchBusiness AI</h1>
          <p className="text-zinc-400 mt-2">Create your free account</p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Name <span className="text-zinc-600">(optional)</span>
              </label>
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

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          By creating an account you agree to our{' '}
          <a href="https://launchbusinessai.com/terms" className="underline hover:text-zinc-400" target="_blank" rel="noreferrer">
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  );
};
