import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LogOut, Zap, Tag, Palette, Scale, Briefcase, Video, Megaphone, ChevronDown, Check, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { toast } from 'sonner';

// Persistent "active brand" switcher — keeps Marketing, Logo, and Legal
// all working on the same brand without re-selecting it per page.
const BrandSwitcher = () => {
  const { profiles, activeBrand, selectBrand, canUseBrands } = useBrand();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!canUseBrands) return null;

  if (profiles.length === 0) {
    return (
      <Link
        to="/brands"
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add a brand
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 transition-colors max-w-[180px]"
      >
        {activeBrand ? (
          <>
            <span className="flex gap-0.5 flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: activeBrand.primary_color }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: activeBrand.secondary_color }} />
            </span>
            <span className="text-sm text-zinc-200 truncate">{activeBrand.brand_name}</span>
          </>
        ) : (
          <span className="text-sm text-zinc-500">Select brand</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => { selectBrand(p); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  activeBrand?.id === p.id ? 'bg-indigo-600/20 text-indigo-300' : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="flex gap-0.5 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.primary_color }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.secondary_color }} />
                </span>
                <span className="truncate flex-1">{p.brand_name}</span>
                {activeBrand?.id === p.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <Link
            to="/brands"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 border-t border-zinc-800 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5" /> Manage brands
          </Link>
        </div>
      )}
    </div>
  );
};

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const MARKETING_PATHS = ['/create', '/scripts', '/assets', '/gallery'];

  const navigation = [
    { name: 'Hub',       href: '/',         icon: Home },
    { name: 'Logo',      href: '/logo',      icon: Palette },
    { name: 'Marketing', href: '/create',    icon: Megaphone, match: MARKETING_PATHS },
    { name: 'Legal',     href: '/legal',     icon: Scale },
    { name: 'Tutorial',  href: '/tutorial',  icon: Video },
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
            <div className="flex items-center gap-3" data-testid="app-title">
              <img
                src="/logo_white.png"
                alt="LaunchBusiness AI — Logo, Marketing, Legal. All AI"
                style={{ height: 48, width: 'auto', display: 'block', flexShrink: 0 }}
              />
              <BrandSwitcher />
            </div>

            <div className="flex gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = item.match
                  ? item.match.includes(location.pathname)
                  : location.pathname === item.href;
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
                  <Link to="/login" className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors">Sign in</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Beta banner — shown to all authenticated users */}
      {user && (
        <div className="relative z-20 bg-amber-950/60 border-b border-amber-800/40 px-4 py-2 text-center">
          <p className="text-xs text-amber-300">
            <span className="font-semibold">LaunchBusiness AI Beta</span> — This software is provided for testing purposes only. Features may change without notice.
          </p>
        </div>
      )}

      <main className="relative z-10">
        {children}
      </main>

      <footer className="relative z-10 border-t border-zinc-800/50 py-3 text-center">
        <p className="text-xs text-zinc-600">Beta Version — Not for commercial use · NovaJay Tech (FM1032559)</p>
      </footer>
    </div>
  );
};
