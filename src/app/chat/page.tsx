'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'bot';
  text: string;
  intent?: string;
  sources?: string[];
  loading?: boolean;
}

// Intent badge colors from intents.ts registry (mirrored for the client)
const INTENT_COLORS: Record<string, string> = {
  GREETING: '#6b7280',
  SQL: '#0284c7',
  RAG: '#7c3aed',
  KAG: '#d97706',
  TOOL: '#16a34a',
  FACULTY_ANALYSIS: '#db2777',
  FACULTY_STATS: '#ea580c',
  UNKNOWN: '#9ca3af',
};

const INTENT_LABELS: Record<string, string> = {
  GREETING: 'Greeting',
  SQL: 'Live Data',
  RAG: 'Knowledge Base',
  KAG: 'Graph Query',
  TOOL: 'Action',
  FACULTY_ANALYSIS: 'Candidate Analysis',
  FACULTY_STATS: 'Student Stats',
  UNKNOWN: 'Unknown',
};

// Render basic markdown: **bold**, bullet points, newlines
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function BotMessage({ msg }: { msg: Message }) {
  const lines = (msg.text || '').split('\n');
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #ebebee, #9d94b1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2,
        boxShadow: '0 0 0 2px rgba(99,102,241,0.25)',
      }}>✦</div>
      <div style={{ flex: 1 }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '4px 16px 16px 16px',
          padding: '12px 16px',
          fontSize: 14, lineHeight: 1.7, color: '#e2e8f0',
          whiteSpace: 'pre-wrap',
          opacity: msg.loading ? 0.6 : 1,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          wordBreak: 'break-word',
        }}>
          {msg.loading
            ? <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="dot-pulse" />
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Thinking…</span>
            </span>
            : lines.map((line, li) => (
              <div key={li}>
                {line.startsWith('•') || line.startsWith('-')
                  ? <div style={{ paddingLeft: 8, color: '#cbd5e1' }}>{renderMarkdown(line)}</div>
                  : renderMarkdown(line)}
              </div>
            ))
          }
        </div>
        {/* Intent badge + sources */}
        {msg.intent && !msg.loading && (
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 999,
              background: `${INTENT_COLORS[msg.intent] ?? '#6b7280'}22`,
              color: INTENT_COLORS[msg.intent] ?? '#6b7280',
              border: `1px solid ${INTENT_COLORS[msg.intent] ?? '#6b7280'}44`,
            }}>
              {INTENT_LABELS[msg.intent] ?? msg.intent}
            </span>
            {msg.sources && msg.sources.length > 0 && (
              <span style={{ fontSize: 10, color: '#475569' }}>
                {msg.sources.join(' · ')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ msg }: { msg: Message }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        maxWidth: '72%',
        padding: '11px 16px',
        borderRadius: '16px 4px 16px 16px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', fontSize: 14, lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
        wordBreak: 'break-word',
      }}>
        {msg.text}
      </div>
    </div>
  );
}

const STUDENT_SUGGESTIONS = [
  { label: '🗓 Upcoming hackathons', query: 'Show upcoming hackathons' },
  { label: '📋 Active grants', query: 'List active grants' },
  { label: '🏛 Book a lab', query: 'Book the AI Lab tomorrow at 3 PM for project work' },
  { label: '📰 Latest news', query: 'Show latest news' },
];

const FACULTY_SUGGESTIONS = [
  { label: '📊 Internship student list', query: 'How many students are working in internships right now?' },
  { label: '🔍 Analyze candidates', query: 'Analyze the best candidate for the latest internship' },
  { label: '🗓 Upcoming hackathons', query: 'Show upcoming hackathons' },
  { label: '🏛 Book a lab', query: 'Book the AI Lab tomorrow at 2 PM for research' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hi! I am the COE TCET assistant. Ask me about events, hackathons, grants, labs, or anything about the portal.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>('GUEST');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [input]);

  async function sendMessage(overrideText?: string) {
    const question = (overrideText ?? input).trim();
    if (!question || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'bot', text: '...', loading: true }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (data.role) setRole(data.role);
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { role: 'bot', text: data.answer ?? data.error ?? 'Something went wrong.', intent: data.intent, sources: data.sources },
      ]);
    } catch {
      setMessages(prev => [...prev.filter(m => !m.loading), { role: 'bot', text: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const suggestions = role === 'FACULTY' || role === 'ADMIN' ? FACULTY_SUGGESTIONS : STUDENT_SUGGESTIONS;
  const showSuggestions = messages.length <= 1;

  return (
    <>
      <style>{`
       @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root{
--navy:#0F2744;
--navy-light:#17375E;

--bg:#F4F6F8;
--surface:#FFFFFF;
--surface-2:#FAFBFC;

--text:#111827;
--text-secondary:#64748B;

--border:#E2E8F0;

--success:#22C55E;
}

/* ==========================================
GLOBAL
========================================== */

*{
box-sizing:border-box;
}

body{
overflow:hidden !important;
margin:0;
background:var(--bg);
}

#chat-root{
font-family:'Inter',sans-serif;
position:fixed;
inset:0;
z-index:9999;

display:flex;
flex-direction:column;

background:var(--bg);

background-image:
radial-gradient(circle at top right,
rgba(15,39,68,.05),
transparent 30%),
radial-gradient(circle at bottom left,
rgba(245,240,232,.8),
transparent 45%);
}

/* ==========================================
HEADER
========================================== */

#chat-header{
padding:16px 24px;

display:flex;
align-items:center;
gap:14px;

background:rgba(255,255,255,.95);

border-bottom:1px solid var(--border);

backdrop-filter:blur(20px);

position:relative;
z-index:10;
}

.header-avatar{
width:44px;
height:44px;

border-radius:14px;

background:linear-gradient(
135deg,
var(--navy),
var(--navy-light)
);

display:flex;
align-items:center;
justify-content:center;

color:#fff;
font-weight:700;
font-size:13px;

box-shadow:
0 10px 25px rgba(15,39,68,.18);
}

.header-title{
color:var(--text);
font-size:15px;
font-weight:700;
}

.header-status{
display:flex;
align-items:center;
gap:6px;

color:var(--text-secondary);
font-size:12px;
}

.status-dot{
width:7px;
height:7px;
border-radius:50%;

background:var(--success);

animation:blink 2s ease infinite;
}

@keyframes blink{
0%,100%{opacity:1;}
50%{opacity:.45;}
}

/* ==========================================
CHAT AREA
========================================== */

#chat-messages{
flex:1;

overflow-y:auto;

padding:28px 20px;

display:flex;
flex-direction:column;
gap:18px;

max-width:900px;
width:100%;
margin:0 auto;

scrollbar-width:thin;
scrollbar-color:#CBD5E1 transparent;
}

#chat-messages::-webkit-scrollbar{
width:6px;
}

#chat-messages::-webkit-scrollbar-thumb{
background:#CBD5E1;
border-radius:999px;
}

/* ==========================================
MESSAGE BUBBLES
========================================== */

.msg-user{
align-self:flex-end;

background:linear-gradient(
135deg,
var(--navy),
var(--navy-light)
);

color:white;

border-radius:18px 18px 6px 18px;

padding:14px 16px;

box-shadow:
0 10px 25px rgba(15,39,68,.15);

max-width:80%;
}

.msg-bot{
align-self:flex-start;

background:white;

color:var(--text);

border:1px solid var(--border);

border-radius:18px 18px 18px 6px;

padding:14px 16px;

box-shadow:
0 3px 10px rgba(0,0,0,.04);

max-width:80%;
}

.msg-user,
.msg-bot{
line-height:1.65;
font-size:14px;
transition:.2s ease;
}

.msg-user:hover,
.msg-bot:hover{
transform:translateY(-1px);
}

/* ==========================================
THINKING STATE
========================================== */

.dot-pulse{
display:inline-flex;
align-items:center;
gap:4px;
}

.dot-pulse::before,
.dot-pulse::after,
.dot-pulse span{
content:'';

width:6px;
height:6px;

border-radius:50%;

background:var(--navy);

animation:bounce-dot 1.2s infinite;
}

.dot-pulse::before{animation-delay:0s;}
.dot-pulse span{animation-delay:.2s;}
.dot-pulse::after{animation-delay:.4s;}

@keyframes bounce-dot{
0%,80%,100%{
transform:scale(.6);
opacity:.4;
}
40%{
transform:scale(1);
opacity:1;
}
}

/* ==========================================
ROLE CHIP
========================================== */

.role-chip{
margin-left:auto;

font-size:10px;
font-weight:600;

letter-spacing:.05em;
text-transform:uppercase;

padding:4px 10px;

border-radius:999px;

background:#EEF4FF;

border:1px solid #C7D2FE;

color:var(--navy);
}

/* ==========================================
SUGGESTIONS
========================================== */

#suggestions{
padding:0 20px 16px;

display:flex;
flex-wrap:wrap;
gap:10px;

max-width:900px;
width:100%;
margin:0 auto;
}

.suggestion-btn{
padding:9px 16px;

border-radius:999px;

background:white;

border:1px solid var(--border);

color:#334155;

font-size:13px;
font-weight:500;

cursor:pointer;

transition:.2s ease;
}

.suggestion-btn:hover{
background:var(--navy);

color:white;

border-color:var(--navy);

transform:translateY(-1px);

box-shadow:
0 10px 20px rgba(15,39,68,.15);
}

/* ==========================================
INPUT
========================================== */

#chat-input-bar{
padding:16px 20px 20px;

border-top:1px solid var(--border);

background:rgba(255,255,255,.96);

backdrop-filter:blur(20px);

max-width:900px;
width:100%;
margin:0 auto;
}

.input-wrapper{
display:flex;
align-items:flex-end;
gap:10px;

background:white;

border:1px solid #CBD5E1;

border-radius:18px;

padding:10px 12px 10px 16px;

transition:.2s ease;
}

.input-wrapper:focus-within{
border-color:var(--navy);

box-shadow:
0 0 0 4px rgba(15,39,68,.08);
}

.chat-textarea{
flex:1;

border:none;
outline:none;
resize:none;

background:transparent;

color:var(--text);

font-size:14px;
line-height:1.6;

font-family:inherit;

max-height:140px;
}

.chat-textarea::placeholder{
color:#94A3B8;
}

/* ==========================================
SEND BUTTON
========================================== */

.send-btn{
width:42px;
height:42px;

border:none;

border-radius:12px;

background:linear-gradient(
135deg,
var(--navy),
var(--navy-light)
);

color:white;

cursor:pointer;

display:flex;
align-items:center;
justify-content:center;

transition:.2s ease;

box-shadow:
0 8px 20px rgba(15,39,68,.2);
}

.send-btn:hover:not(:disabled){
transform:scale(1.05);
}

.send-btn:disabled{
opacity:.5;
cursor:not-allowed;
box-shadow:none;
}

.input-hint{
margin-top:8px;

text-align:center;

font-size:11px;

color:#94A3B8;
}


      `}</style>

      <div id="chat-root">
        {/* ── HEADER ── */}
        <div id="chat-header">
          <div className="header-avatar">✦</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#f1f5f9' }}>TCET Sarthi</div>
            <div className="header-status">
              <span className="status-dot" />
              <span>Powered by Qwen3 · Local AI</span>
            </div>
          </div>
          {role !== 'GUEST' && (
            <div className="role-chip">{role}</div>
          )}
        </div>

        {/* ── MESSAGES ── */}
        <div id="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className="msg-animate">
              {msg.role === 'user'
                ? <UserMessage msg={msg} />
                : <BotMessage msg={msg} />}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── SUGGESTIONS ── */}
        {showSuggestions && (
          <div id="suggestions">
            {suggestions.map(s => (
              <button
                key={s.query}
                className="suggestion-btn"
                onClick={() => sendMessage(s.query)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* ── INPUT ── */}
        <div id="chat-input-bar">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about events, grants, labs, or book a facility…"
              rows={1}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              title="Send (Enter)"
            >
              ↑
            </button>
          </div>
          <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </>
  );
}
