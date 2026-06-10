import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, CheckCircle2, ArrowRight, Bot, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
        isUser
          ? 'bg-indigo-600'
          : 'bg-gradient-to-br from-violet-500 to-indigo-500'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700'
      }`}>
        {/* Parse basic markdown bold */}
        {msg.content.split('\n').map((line, i) => {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {parts.map((part, j) =>
                j % 2 === 1
                  ? <strong key={j} className="font-semibold">{part}</strong>
                  : <span key={j}>{part}</span>
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default function ChatIntake({ profile, onIntakeComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem('jhp_token');
  const headers = { Authorization: `Bearer ${token}` };

  // Load existing history or start fresh
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/legal/chat/${profile.id}`, { headers });
        if (res.data.messages.length === 0) {
          // Start fresh — trigger greeting
          const startRes = await axios.post(`${API}/api/legal/chat/${profile.id}/start`, {}, { headers });
          setMessages([startRes.data.message]);
        } else {
          setMessages(res.data.messages);
          if (res.data.intake_complete) setComplete(true);
        }
      } catch (err) {
        toast.error('Could not load chat');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [profile.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    // Optimistic user message
    const userMsg = { id: 'tmp', role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await axios.post(
        `${API}/api/legal/chat/${profile.id}`,
        { message: text },
        { headers }
      );
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'tmp'),
        { id: Date.now(), role: 'user', content: text },
        res.data.message,
      ]);
      if (res.data.intake_complete) {
        setComplete(true);
        onIntakeComplete?.(res.data.intake_data);
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== 'tmp'));
      toast.error(err?.response?.data?.detail || 'Message failed');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        <p className="text-zinc-500 text-sm">Loading intake chat…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[680px]">
      {/* Profile header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-lg font-heading font-bold text-white">{profile.name}</h2>
          <p className="text-xs text-zinc-500">Business intake — answer the questions to generate documents</p>
        </div>
        {complete && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Intake complete
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {sending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input or completion CTA */}
      {complete ? (
        <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 shrink-0">
          <p className="text-emerald-300 text-sm font-medium mb-3">
            ✅ Intake complete — your business profile is ready.
          </p>
          <button
            onClick={() => onIntakeComplete?.()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Select documents to generate <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mt-4 shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your answer… (Enter to send)"
              rows={2}
              disabled={sending}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm resize-none focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0 flex items-center justify-center"
            >
              {sending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-2 text-center">
            Shift+Enter for new line · Enter to send
          </p>
        </div>
      )}
    </div>
  );
}
