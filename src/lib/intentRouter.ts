// lib/intentRouter.ts
// LLM-based intent classifier using Ollama (qwen3:8b)
// Falls back to keyword scoring if Ollama is unavailable
// Intent types are managed centrally in src/lib/intents.ts

import { Intent, VALID_INTENTS, isValidIntent } from '@/lib/intents';

export type { Intent };

interface RouteResult {
  intent: Intent;
  reason: string;
}

// ── KEYWORD FALLBACK (kept as safety net) ──
const SQL_KEYWORDS = [
  'upcoming', 'latest', 'list', 'show', 'all', 'current',
  'events', 'hackathon', 'grant', 'grants', 'news', 'announcement',
  'announcements', 'programs', 'internship', 'when is', 'when are',
  'how many', 'deadline', 'schedule',
];

const RAG_KEYWORDS = [
  'what is', 'explain', 'describe', 'how does', 'tell me about',
  'policy', 'procedure', 'guideline', 'lab', 'facility', 'research',
  'documentation', 'about the', 'details', 'information about',
];

const KAG_KEYWORDS = [
  'associated with', 'belongs to', 'works in', 'member of',
  'leads', 'specializes in', 'funds', 'research area', 'department of',
  'relationship', 'connection between', 'who leads', 'which lab',
  'who works', 'who is in',
];

const TOOL_KEYWORDS = [
  'book', 'reserve', 'apply', 'submit', 'register',
  'cancel', 'schedule a', 'request a',
];

const GREETING_KEYWORDS = ['hi', 'hello', 'hey', 'good morning', 'good evening', 'greetings'];

function keywordScore(query: string, keywords: string[]): number {
  const q = query.toLowerCase();
  return keywords.filter(k => q.includes(k)).length;
}

function keywordFallback(query: string): RouteResult {
  const q = query.toLowerCase().trim();

  if (GREETING_KEYWORDS.some(g => q === g)) return { intent: 'GREETING', reason: 'Greeting detected' };

  if (q.includes('analyze') || q.includes('best candidate') || q.includes('scan student') || q.includes('evaluate candidate')) {
    return { intent: 'FACULTY_ANALYSIS', reason: 'Candidate analysis requested' };
  }

  if (q.includes('how many student') || (q.includes('student') && q.includes('internship') && (q.includes('working') || q.includes('role') || q.includes('branch')))) {
    return { intent: 'FACULTY_STATS', reason: 'Student internship stats requested' };
  }

  if (q.includes('my booking') || q.includes('booking list') || q.includes('my reservation') || q.includes('my bookings')) {
    return { intent: 'SQL', reason: 'User requested their bookings list' };
  }

  // Use a regex to check for whole word matches for tool keywords
  const toolScore = TOOL_KEYWORDS.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(q)).length;
  if (toolScore > 0) return { intent: 'TOOL', reason: 'Action keyword detected' };

  if (keywordScore(query, KAG_KEYWORDS) > 0) {
    return { intent: 'KAG', reason: 'Relationship query detected' };
  }
  // Explicit relationship patterns not caught by keywords
  if (q.includes('who works') || q.includes('who is in') || q.includes('who leads') ||
      q.includes('who heads') || q.includes('specializes in') || q.includes('which faculty') ||
      q.includes('faculty in') || q.includes('faculty at') || q.includes('faculty for')) {
    return { intent: 'KAG', reason: 'Relationship pattern detected' };
  }

  const sqlScore = keywordScore(query, SQL_KEYWORDS);
  const ragScore = keywordScore(query, RAG_KEYWORDS);

  if (sqlScore > ragScore) return { intent: 'SQL', reason: 'Structured data keyword detected' };
  if (ragScore > 0) return { intent: 'RAG', reason: 'Semantic query detected' };
  return { intent: 'RAG', reason: 'Default to RAG' };
}

// ── LLM CLASSIFIER ──
const SYSTEM_PROMPT = `You are an intent classifier for a university COE (Centre of Excellence) chatbot.

Classify the user query into exactly ONE of these intents:

GREETING         — casual greetings: hi, hello, hey, good morning, etc.
TOOL             — action requests: book a lab, reserve a room, submit, apply, cancel booking
SQL              — requests for structured/live data: upcoming events, latest news, list of grants, announcements, hackathon schedules, deadlines, my bookings, booking list
KAG              — relationship/graph queries: which faculty specializes in AI, who works in AI Lab, which grants fund robotics, faculty-lab-department connections
FACULTY_ANALYSIS — explicitly evaluate, analyze, scan, or compare candidates/students for an internship, hackathon, or role
FACULTY_STATS    — how many students are working in internships, or listing students, branches, and roles
RAG              — descriptive/explanatory queries: what is the AI lab, explain the booking policy, tell me about internships, how does the hackathon work, details about facilities

Rules:
- If the query is about LISTING or UPCOMING items (e.g. my bookings) → SQL
- If the query is about RELATIONSHIPS between entities (faculty↔lab, grant↔project) → KAG  
- If the query is about DESCRIPTIONS, POLICIES, or EXPLANATIONS → RAG
- If the query involves CREATING a BOOKING or SUBMITTING → TOOL
- If evaluating/scanning student profiles → FACULTY_ANALYSIS
- If counting/listing students in internships with branch/role → FACULTY_STATS
- Respond with ONLY a JSON object, nothing else. No markdown, no explanation.

Format: {"intent": "SQL", "reason": "brief reason"}`;

let ollamaAvailable: boolean | null = null; // cached after first check

async function classifyWithLLM(query: string): Promise<RouteResult | null> {
  try {
    const ollama = await import('ollama').then(m => m.default);

    // Quick availability check (cached)
    if (ollamaAvailable === false) return null;

    const response = await ollama.chat({
      model: process.env.LLM_MODEL ?? 'qwen3:8b',
      options: { temperature: 0, num_predict: 60, num_ctx: 512 },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
    });

    ollamaAvailable = true;

    const raw = response.message?.content?.trim() ?? '';

    // Strip thinking tags if model outputs them (qwen3 sometimes does)
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Extract JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const intent = parsed.intent as string;

    // Use the registry's VALID_INTENTS — no hardcoded list needed here
    if (!isValidIntent(intent)) return null;

    return { intent, reason: parsed.reason ?? 'LLM classified' };
  } catch (err: any) {
    if (ollamaAvailable === null) ollamaAvailable = false;
    console.warn('[intentRouter] LLM classification failed, using keyword fallback:', err.message);
    return null;
  }
}

export async function routeIntentAsync(query: string): Promise<RouteResult> {
  const llmResult = await classifyWithLLM(query);
  if (llmResult) {
    console.log(`[intentRouter] LLM → ${llmResult.intent} (${llmResult.reason})`);
    return llmResult;
  }
  const fallback = keywordFallback(query);
  console.log(`[intentRouter] Keyword fallback → ${fallback.intent} (${fallback.reason})`);
  return fallback;
}

// Sync version kept for backward compatibility (uses keyword only)
export function routeIntent(query: string): RouteResult {
  return keywordFallback(query);
}