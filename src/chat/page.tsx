'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'bot';
  text: string;
  intent?: string;
  sources?: string[];
  roleBadge?: string;
  loading?: boolean;
}

const INTENT_META: Record<string, { label: string; color: string; dot: string }> = {
  SQL:      { label: 'SQL',   color: '#16a34a', dot: '#bbf7d0' },
  RAG:      { label: 'RAG',   color: '#2563eb', dot: '#bfdbfe' },
  KAG:      { label: 'GRAPH', color: '#d97706', dot: '#fde68a' },
  TOOL:     { label: 'TOOL',  color: '#7c3aed', dot: '#ede9fe' },
  GREETING: { label: 'SYS',   color: '#6b7280', dot: '#e5e7eb' },
};

const SUGGESTIONS = [
  { label: 'Hackathons',     query: 'Show upcoming hackathons',          icon: '🏆' },
  { label: 'AI Lab',         query: 'Explain AI Lab facilities',          icon: '🔬' },
  { label: 'Faculty Graph',  query: 'Faculty CV specializations in AI?',  icon: '🧠' },
  { label: 'Book Lab',       query: 'Book AI Lab tomorrow at 3 PM',       icon: '📅' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Welcome to the COE TCET AI Portal. Ask about hackathons, grants, lab facilities, or make a booking.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  async function sendMessage(textToSend?: string) {
    const question = (textToSend ?? input).trim();
    if (!question || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'bot', text: '', loading: true }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        {
          role: 'bot',
          text: data.answer ?? data.error ?? 'Something went wrong.',
          intent: data.intent,
          sources: data.sources,
          roleBadge: data.role,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { role: 'bot', text: 'Network error. Ensure the local server is running.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

        * { box-sizing: border-box; }

        .chat-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          font-family: 'DM Sans', sans-serif;
        }

        /* FAB trigger (shown when panel closed) */
        .chat-fab {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1d4ed8, #0f172a);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(29,78,216,0.35);
          transition: transform 0.2s, box-shadow 0.2s;
          color: #fff;
          font-size: 22px;
        }
        .chat-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 12px 32px rgba(29,78,216,0.45);
        }

        /* Main panel */
        .chat-panel {
          width: 400px;
          height: 620px;
          background: #0f172a;
          border-radius: 20px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header */
        .chat-header {
          padding: 16px 18px;
          background: #0f172a;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .chat-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1d4ed8, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .chat-header-info { flex: 1; min-width: 0; }
        .chat-header-name { font-size: 13px; font-weight: 700; color: #f1f5f9; letter-spacing: 0.01em; }
        .chat-header-status { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .status-text { font-size: 10px; color: #64748b; font-weight: 500; }

        .close-btn {
          background: rgba(255,255,255,0.06);
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          cursor: pointer;
          color: #94a3b8;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .close-btn:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }

        /* Engine badges row */
        .engine-row {
          padding: 8px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          display: flex;
          gap: 6px;
          flex-shrink: 0;
          background: rgba(255,255,255,0.02);
        }
        .engine-badge {
          font-size: 9px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          padding: 3px 7px;
          border-radius: 4px;
          letter-spacing: 0.06em;
        }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        .msg-row { display: flex; flex-direction: column; }
        .msg-row.user { align-items: flex-end; }
        .msg-row.bot  { align-items: flex-start; }

        .msg-bubble {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .msg-bubble.user {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .msg-bubble.bot {
          background: rgba(255,255,255,0.06);
          color: #cbd5e1;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .msg-bubble.loading {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 12px;
        }

        .typing-dots { display: flex; gap: 3px; }
        .typing-dots span {
          width: 5px; height: 5px; border-radius: 50%;
          background: #475569;
          animation: blink 1.2s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }

        .msg-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 5px;
          flex-wrap: wrap;
        }
        .intent-tag {
          font-size: 9px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }
        .sources-tag {
          font-size: 10px;
          color: #475569;
        }
        .sources-tag span { color: #94a3b8; }

        /* Suggestions */
        .suggestions-wrap {
          padding: 0 16px 12px;
          flex-shrink: 0;
        }
        .suggestions-label {
          font-size: 9px;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .suggestions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .suggestion-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 9px 10px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .suggestion-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-1px);
        }
        .suggestion-btn .icon { font-size: 14px; flex-shrink: 0; }
        .suggestion-btn .text { font-size: 11px; color: #94a3b8; font-weight: 500; line-height: 1.3; }

        /* Input area */
        .chat-input-area {
          padding: 12px 16px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .chat-textarea {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          color: #e2e8f0;
          resize: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          line-height: 1.5;
          min-height: 40px;
          max-height: 120px;
          transition: border-color 0.15s;
        }
        .chat-textarea::placeholder { color: #334155; }
        .chat-textarea:focus { border-color: rgba(59,130,246,0.4); }

        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.15s, transform 0.15s;
          flex-shrink: 0;
        }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .send-btn:not(:disabled):hover { transform: scale(1.05); }
        .send-btn svg { width: 16px; height: 16px; }

        @media (max-width: 480px) {
          .chat-root { bottom: 0; right: 0; }
          .chat-panel { width: 100vw; height: 100dvh; border-radius: 0; }
        }
      `}</style>

      <div className="chat-root">
        {!panelOpen ? (
          <button className="chat-fab" onClick={() => setPanelOpen(true)} aria-label="Open chat">
            🤖
          </button>
        ) : (
          <div className="chat-panel">

            {/* Header */}
            <div className="chat-header">
              <div className="chat-avatar">🤖</div>
              <div className="chat-header-info">
                <div className="chat-header-name">COE TCET AI Copilot</div>
                <div className="chat-header-status">
                  <div className="status-dot" />
                  <span className="status-text">Hybrid · SQL · RAG · Graph · Tools</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setPanelOpen(false)} aria-label="Close chat">✕</button>
            </div>

            {/* Engine row */}
            <div className="engine-row">
              {[
                { label: 'SQL',   bg: '#052e16', color: '#22c55e' },
                { label: 'RAG',   bg: '#1e3a5f', color: '#60a5fa' },
                { label: 'GRAPH', bg: '#451a03', color: '#fb923c' },
                { label: 'TOOLS', bg: '#2e1065', color: '#c084fc' },
              ].map(e => (
                <span key={e.label} className="engine-badge" style={{ background: e.bg, color: e.color }}>
                  {e.label}
                </span>
              ))}
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const meta = msg.intent ? INTENT_META[msg.intent.toUpperCase()] : null;

                return (
                  <div key={i} className={`msg-row ${isUser ? 'user' : 'bot'}`}>
                    <div className={`msg-bubble ${isUser ? 'user' : 'bot'} ${msg.loading ? 'loading' : ''}`}>
                      {msg.loading ? (
                        <>
                          <div className="typing-dots">
                            <span /><span /><span />
                          </div>
                          <span style={{ fontSize: 11 }}>Routing pipeline…</span>
                        </>
                      ) : msg.text}
                    </div>

                    {!isUser && !msg.loading && (meta || msg.sources?.length) && (
                      <div className="msg-meta">
                        {meta && (
                          <span className="intent-tag" style={{
                            background: meta.dot + '18',
                            color: meta.color,
                            border: `1px solid ${meta.color}30`,
                          }}>
                            {meta.label}
                          </span>
                        )}
                        {msg.roleBadge && (
                          <span className="intent-tag" style={{
                            background: 'rgba(255,255,255,0.04)',
                            color: '#475569',
                            border: '1px solid rgba(255,255,255,0.07)',
                          }}>
                            {msg.roleBadge}
                          </span>
                        )}
                        {msg.sources && msg.sources.length > 0 && (
                          <span className="sources-tag">
                            via <span>{msg.sources.join(', ')}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Suggestion chips — shown only on first load */}
            {messages.length <= 1 && (
              <div className="suggestions-wrap">
                <div className="suggestions-label">Try asking</div>
                <div className="suggestions-grid">
                  {SUGGESTIONS.map(s => (
                    <button key={s.label} className="suggestion-btn" onClick={() => sendMessage(s.query)}>
                      <span className="icon">{s.icon}</span>
                      <span className="text">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="chat-input-area">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about events, labs, grants…"
                rows={1}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>

          </div>
        )}
      </div>
    </>
  );
}