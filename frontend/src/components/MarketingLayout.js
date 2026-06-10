import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Wand2, Upload, FolderOpen } from 'lucide-react';

// Sub-navigation for the Marketing section — keeps the manual tools
// (Quick Create, Scripts, Assets, Gallery) under one top-level nav item.
const TABS = [
  { name: 'Quick Create', href: '/create',  icon: Sparkles },
  { name: 'Scripts',      href: '/scripts', icon: Wand2 },
  { name: 'Assets',       href: '/assets',  icon: Upload },
  { name: 'Gallery',      href: '/gallery', icon: FolderOpen },
];

export const MarketingLayout = ({ children }) => {
  const location = useLocation();

  return (
    <div>
      <div className="border-b border-zinc-800/70 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  data-testid={`marketing-tab-${tab.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};
