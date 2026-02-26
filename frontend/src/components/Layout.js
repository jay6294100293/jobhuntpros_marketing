import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Home, Upload, Wand2, Image, FolderOpen } from 'lucide-react';

export const Layout = ({ children }) => {
  const location = useLocation();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Assets', href: '/assets', icon: Upload },
    { name: 'Scripts', href: '/scripts', icon: Wand2 },
    { name: 'Create', href: '/create', icon: Image },
    { name: 'Gallery', href: '/gallery', icon: FolderOpen },
  ];
  
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
            
            <div className="flex gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
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
          </div>
        </div>
      </nav>
      
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
};
