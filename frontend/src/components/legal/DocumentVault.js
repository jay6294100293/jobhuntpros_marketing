import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Copy, RefreshCw, Loader2,
  AlertTriangle, Calendar, Zap, ChevronLeft, X, Check
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

function DocumentRow({ doc, isSelected, onClick }) {
  const ageWarning = doc.laws_may_have_changed || doc.age_days >= 90;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-indigo-500/60 bg-indigo-500/10'
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <FileText className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{doc.doc_name}</p>
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {new Date(doc.generated_at).toLocaleDateString('en-CA')}
            <span className="text-zinc-700">·</span>
            <Zap className="w-3 h-3" />{doc.credits_cost}cr
          </p>
        </div>
        {ageWarning && (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-1" title="Laws may have changed" />
        )}
      </div>
    </button>
  );
}

function DocumentViewer({ doc, onRegenerate, onClose }) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const token = localStorage.getItem('token');

  const handleCopy = () => {
    navigator.clipboard.writeText(doc.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.doc_name.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.jurisdiction.replace(/\s/g,'_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Document downloaded');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await axios.post(
        `${API}/api/legal/regenerate/${doc.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Regenerated! Used ${res.data.credits_used} credits (saved ${res.data.discount_applied} with 10% loyalty discount).`);
      onRegenerate?.(res.data.document);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-base font-semibold text-zinc-100 mt-5 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-semibold text-zinc-200 mt-4 mb-1.5">{line.slice(4)}</h3>;
      }
      if (line.startsWith('---')) {
        return <hr key={i} className="border-zinc-700 my-4" />;
      }
      if (line.startsWith('⚠️')) {
        return (
          <div key={i} className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 my-4">
            <p className="text-amber-300 text-xs font-medium leading-relaxed">{line.slice(3)}</p>
          </div>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const parts = line.slice(2).split(/\*\*(.*?)\*\*/g);
        return (
          <li key={i} className="text-sm text-zinc-300 ml-4 leading-relaxed list-disc mb-1">
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '');
        const parts = content.split(/\*\*(.*?)\*\*/g);
        return (
          <li key={i} className="text-sm text-zinc-300 ml-4 leading-relaxed list-decimal mb-1">
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      // Bold inline
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-sm text-zinc-300 leading-relaxed mb-1">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white font-medium">{p}</strong> : p)}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-800 shrink-0">
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-white truncate">{doc.doc_name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{doc.jurisdiction} · Generated {new Date(doc.generated_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download as Markdown"
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            title="Regenerate with latest 2026 laws (10% credit discount)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 rounded-lg transition-all disabled:opacity-50"
          >
            {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Regen (10% off)
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors md:hidden">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Laws changed warning */}
      {(doc.laws_may_have_changed || doc.age_days >= 90) && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 mt-4 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            This document is {doc.age_days}+ days old. Laws may have been updated since generation.
            Consider regenerating to apply the latest 2026 requirements.
          </p>
        </div>
      )}

      {/* Document content */}
      <div className="flex-1 overflow-y-auto mt-4 min-h-0">
        <div className="prose prose-invert prose-sm max-w-none">
          {renderContent(doc.content)}
        </div>
      </div>
    </div>
  );
}

export default function DocumentVault({ profile }) {
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [fullDoc, setFullDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/legal/history/${profile.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDocs(res.data);
        if (res.data.length > 0) selectDoc(res.data[0]);
      } catch {
        toast.error('Could not load documents');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile.id]);

  const selectDoc = async (doc) => {
    setSelectedDoc(doc);
    setLoadingDoc(true);
    setShowMobile(true);
    try {
      const res = await axios.get(`${API}/api/legal/document/${doc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFullDoc(res.data);
    } catch {
      toast.error('Could not load document');
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleRegenerate = (newDoc) => {
    setDocs(prev => [newDoc, ...prev]);
    setSelectedDoc(newDoc);
    selectDoc(newDoc);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-400 font-medium">No documents generated yet</p>
        <p className="text-zinc-600 text-sm mt-1">Select documents from the catalog to generate your first draft.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full min-h-[600px]">
      {/* Left: document list */}
      <div className={`w-64 shrink-0 space-y-2 ${showMobile ? 'hidden md:block' : 'block'}`}>
        <div className="mb-4">
          <h2 className="font-heading font-bold text-white">{profile.name}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} generated</p>
        </div>
        {docs.map(doc => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            isSelected={selectedDoc?.id === doc.id}
            onClick={() => selectDoc(doc)}
          />
        ))}
      </div>

      {/* Right: viewer */}
      <div className={`flex-1 min-w-0 ${!showMobile ? 'hidden md:flex' : 'flex'} flex-col`}>
        {/* Mobile back button */}
        {showMobile && (
          <button
            onClick={() => setShowMobile(false)}
            className="md:hidden flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to list
          </button>
        )}

        {loadingDoc ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : fullDoc ? (
          <DocumentViewer
            doc={fullDoc}
            onRegenerate={handleRegenerate}
            onClose={() => setShowMobile(false)}
          />
        ) : (
          <div className="flex items-center justify-center flex-1 text-zinc-600">
            <p className="text-sm">Select a document to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
