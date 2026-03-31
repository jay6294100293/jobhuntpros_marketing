import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Home, Upload, Wand2, Image, FolderOpen, LogOut, Zap, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Assets', href: '/assets', icon: Upload },
    { name: 'Scripts', href: '/scripts', icon: Wand2 },
    { name: 'Create', href: '/create', icon: Image },
    { name: 'Gallery', href: '/gallery', icon: FolderOpen },
  ];

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="noise-texture" />

      <nav className="relative border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-gradient" data-testid="app-title">JobHuntPro Studio</h1>
                <p className="text-xs text-zinc-500 font-mono">Content Creation Suite</p>
              </div>
            </div>

            <div className="flex gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:inline">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Link
                    to="/pricing"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      user.tier === 'pro'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                    }`}
                  >
                    {user.tier === 'pro' ? (
                      <><Zap className="w-3 h-3" /> Pro</>
                    ) : (
                      <><Tag className="w-3 h-3" /> Free</>
                    )}
                  </Link>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800/60 rounded-lg border border-zinc-700">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-zinc-300 max-w-[120px] truncate">{user.name || user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors">Sign in</Link>
                  <Link to="/register" className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors">Get started</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
};
