/**
 * intents.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all chatbot intent definitions.
 *
 * Any time a new intent is added:
 *  1. Add it to the `Intent` union type.
 *  2. Add a record to `INTENT_REGISTRY` with its metadata.
 *  3. The `VALID_INTENTS` array is auto-derived — no manual update needed.
 *
 * Used by:
 *  - src/lib/intentRouter.ts  (routing + LLM classification)
 *  - src/app/api/chat/route.ts (handler dispatch)
 *  - src/app/chat/page.tsx     (UI badge labels)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── INTENT UNION TYPE ──────────────────────────────────────────────────────

export type Intent =
  | 'GREETING'
  | 'SQL'
  | 'RAG'
  | 'KAG'
  | 'TOOL'
  | 'FACULTY_ANALYSIS'
  | 'FACULTY_STATS'
  | 'UNKNOWN';

// ── INTENT REGISTRY ────────────────────────────────────────────────────────

export interface IntentMeta {
  /** Human-readable label for the chat UI badge */
  label: string;
  /** Short description of what this intent handles */
  description: string;
  /** Which roles can trigger this intent. Empty = any role. */
  allowedRoles: string[];
  /** Backend handler or pipeline used */
  handler: 'greeting' | 'sql' | 'rag' | 'kag' | 'tool' | 'faculty' | 'none';
  /** Color code for the intent badge in the UI (hex) */
  color: string;
}

export const INTENT_REGISTRY: Record<Intent, IntentMeta> = {
  GREETING: {
    label: 'Greeting',
    description: 'Casual greetings, hi, hello, thanks.',
    allowedRoles: [],
    handler: 'greeting',
    color: '#6b7280',
  },
  SQL: {
    label: 'Live Data',
    description: 'Structured database queries: events, bookings, hackathons, announcements.',
    allowedRoles: [],
    handler: 'sql',
    color: '#0284c7',
  },
  RAG: {
    label: 'Knowledge Base',
    description: 'Semantic document search via ChromaDB + Ollama for policies, FAQs, COE info.',
    allowedRoles: [],
    handler: 'rag',
    color: '#7c3aed',
  },
  KAG: {
    label: 'Graph Query',
    description: 'Relationship/graph queries via Neo4j: faculty, labs, departments, grants.',
    allowedRoles: [],
    handler: 'kag',
    color: '#d97706',
  },
  TOOL: {
    label: 'Action',
    description: 'Agentic tool use: booking labs, reservations, scheduling.',
    allowedRoles: ['STUDENT', 'FACULTY', 'ADMIN'],
    handler: 'tool',
    color: '#16a34a',
  },
  FACULTY_ANALYSIS: {
    label: 'Candidate Analysis',
    description: 'Faculty-only: AI-powered evaluation of internship/hackathon applicants.',
    allowedRoles: ['FACULTY', 'ADMIN'],
    handler: 'faculty',
    color: '#db2777',
  },
  FACULTY_STATS: {
    label: 'Student Stats',
    description: 'Faculty-only: Live stats on students enrolled in internships (name, branch, role).',
    allowedRoles: ['FACULTY', 'ADMIN'],
    handler: 'faculty',
    color: '#ea580c',
  },
  UNKNOWN: {
    label: 'Unknown',
    description: 'Could not classify intent. Defaults to RAG pipeline.',
    allowedRoles: [],
    handler: 'rag',
    color: '#9ca3af',
  },
};

// ── DERIVED HELPERS ────────────────────────────────────────────────────────

/** Auto-derived list of all valid intents from the registry. */
export const VALID_INTENTS: Intent[] = Object.keys(INTENT_REGISTRY) as Intent[];

/**
 * Returns true if the given string is a known intent.
 */
export function isValidIntent(value: string): value is Intent {
  return VALID_INTENTS.includes(value as Intent);
}

/**
 * Returns the badge color for an intent (for UI rendering).
 */
export function getIntentColor(intent: Intent): string {
  return INTENT_REGISTRY[intent]?.color ?? '#9ca3af';
}

/**
 * Returns the human-readable label for an intent.
 */
export function getIntentLabel(intent: Intent): string {
  return INTENT_REGISTRY[intent]?.label ?? intent;
}

/**
 * Checks if a given role is allowed to trigger an intent.
 * Returns true if no role restriction is defined (open to all).
 */
export function canRoleUseIntent(intent: Intent, role: string): boolean {
  const allowed = INTENT_REGISTRY[intent]?.allowedRoles ?? [];
  if (allowed.length === 0) return true;
  return allowed.includes(role);
}
