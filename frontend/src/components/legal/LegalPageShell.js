import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Shared dark-theme shell for the public Privacy Policy and Terms pages.
// These are reachable logged-out (linked from the landing footer + registration),
// so they intentionally live outside the authenticated Layout.
export const LegalPageShell = ({ title, lastUpdated, children }) => (
  <div className="min-h-screen bg-zinc-950 text-zinc-300">
    <div className="noise-texture" />
    <header className="relative border-b border-zinc-800/60 bg-zinc-900/40 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img
            src="/logo_white.png"
            alt="LaunchBusiness AI — Logo, Marketing, Legal. All AI"
            style={{ height: 32, width: 'auto', display: 'block' }}
          />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>
    </header>

    <main className="relative max-w-3xl mx-auto px-6 py-12">
      <h1
        style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: '-1px' }}
        className="text-4xl text-zinc-50 mb-2"
      >
        {title}
      </h1>
      <p className="text-sm text-zinc-500 mb-10">Last updated: {lastUpdated}</p>
      <div className="legal-prose space-y-6 leading-relaxed">{children}</div>

      <div className="mt-16 pt-6 border-t border-zinc-800/60 flex gap-6 text-sm">
        <Link to="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">Privacy Policy</Link>
        <Link to="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">Terms of Service</Link>
        <a href="https://novajaytech.com" className="text-zinc-500 hover:text-zinc-300 transition-colors">NovaJay Tech</a>
      </div>
    </main>
  </div>
);

// Small presentational helpers so the policy bodies stay readable.
export const Section = ({ heading, children }) => (
  <section>
    <h2 className="text-xl font-semibold text-zinc-100 mb-3">{heading}</h2>
    <div className="space-y-3 text-zinc-400">{children}</div>
  </section>
);

export const Bullets = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
);
