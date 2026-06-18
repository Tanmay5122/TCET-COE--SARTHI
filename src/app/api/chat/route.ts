import { NextRequest, NextResponse } from 'next/server';
import ollama from 'ollama';
import { authenticate } from '@/lib/api-helpers';
import { routeIntentAsync } from '@/lib/intentRouter';
import { queryKAG } from '@/lib/neo4j';
import { extractBookingParams, validateBookingParams, createBooking } from '@/lib/tools/bookingTool';
import prisma from '@/lib/prisma';

// ── AUTH ──
// Uses authenticate() from api-helpers (Bearer token OR accessToken cookie)
function getRole(user: ReturnType<typeof authenticate>): string {
  return user?.role ?? 'GUEST';
}

function canUseTool(role: string): boolean {
  return ['STUDENT', 'FACULTY', 'ADMIN'].includes(role);
}

// ── INTERNAL API CALLER ──
// Forwards auth cookie so protected routes (bookings) work correctly.
// Response shape from your APIs: { success: bool, message: string, data: T | null, errors?: string[] }
async function callAPI(
  path: string,
  req: NextRequest,
  options?: { method?: string; body?: object }
): Promise<{ ok: boolean; success: boolean; message: string; data: any }> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}${path}`, {
      method: options?.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.get('cookie') ? { 'Cookie': req.headers.get('cookie')! } : {}),
        ...(req.headers.get('authorization') ? { 'Authorization': req.headers.get('authorization')! } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json();
    return { ok: res.ok, success: json.success ?? false, message: json.message ?? '', data: json.data };
  } catch (err: any) {
    console.error(`[callAPI] ${path} failed:`, err.message);
    return { ok: false, success: false, message: err.message, data: null };
  }
}

// ── FORMAT LIST ──
function fmt(items: any[], fn: (item: any) => string, empty: string): string {
  return items?.length ? items.map(fn).join('\n') : empty;
}

// ── SQL HANDLER — calls your real API routes ──
// Response data shape: your successRes wraps data directly as the array or object.
// GET /api/news          → data: NewsPost[]   fields: id, title, caption, publishedAt, imageKey, postedBy
// GET /api/events        → data: Event[]      fields: id, title, description, date, mode, registrationLink, posterKey, postedBy
// GET /api/grants        → data: Grant[]      fields: id, title, issuingBody, deadline, category, description, referenceLink, attachmentKey
// GET /api/announcements → data: Announcement[] fields: id, text, link, expiresAt, createdAt
// GET /api/bookings/my   → data: Booking[]    fields: id, studentId, purpose, date, timeSlot, facilities, lab, status, createdAt
// No /api/facilities — your booking schema uses lab (string) + facilities (string[]) — no separate table

async function handleSQL(question: string, req: NextRequest): Promise<string | null> {
  const q = question.toLowerCase();

  // NEWS
  if (q.includes('news') || q.includes('latest update')) {
    const { ok, data, message } = await callAPI('/api/news', req);
    if (!ok || !data) return `Could not fetch news: ${message}`;
    return 'Latest news:\n' + fmt(data, (n: any) => `• ${n.title}: ${n.caption}`, 'No news found.');
  }

  // EVENTS
  if (q.includes('event') || q.includes('workshop') || q.includes('seminar')) {
    const { ok, data, message } = await callAPI('/api/events', req);
    if (!ok || !data) return `Could not fetch events: ${message}`;
    return 'Upcoming events:\n' + fmt(
      data,
      (e: any) => `• ${e.title} — ${new Date(e.date).toDateString()} (${e.mode})${e.registrationLink ? ` → ${e.registrationLink}` : ''}`,
      'No upcoming events found.'
    );
  }

  // HACKATHONS — your Event model has mode; hackathons are tracked via HackathonEvent (different model)
  // intentRouter routes "hackathon" → SQL, so handle it here pointing to events (adjust if you have /api/hackathons)
  if (q.includes('hackathon')) {
    const { ok, data, message } = await callAPI('/api/events', req);
    if (!ok || !data) return `Could not fetch hackathon info: ${message}`;
    const hackathons = data.filter((e: any) => e.title?.toLowerCase().includes('hackathon'));
    return hackathons.length
      ? 'Hackathons:\n' + hackathons.map((e: any) => `• ${e.title} — ${new Date(e.date).toDateString()} (${e.mode})`).join('\n')
      : 'No hackathon events found. Check /api/events for all events.';
  }

  // GRANTS
  if (q.includes('grant') || q.includes('funding') || q.includes('scholarship')) {
    const { ok, data, message } = await callAPI('/api/grants', req);
    if (!ok || !data) return `Could not fetch grants: ${message}`;
    return 'Active grants:\n' + fmt(
      data,
      (g: any) => `• ${g.title} by ${g.issuingBody} [${g.category}] — Deadline: ${new Date(g.deadline).toDateString()}`,
      'No active grants found.'
    );
  }

  // ANNOUNCEMENTS
  if (q.includes('announcement') || q.includes('notice')) {
    const { ok, data, message } = await callAPI('/api/announcements', req);
    if (!ok || !data) return `Could not fetch announcements: ${message}`;
    return 'Announcements:\n' + fmt(
      data,
      (a: any) => `• ${a.text}${a.link ? ` (${a.link})` : ''}`,
      'No active announcements.'
    );
  }

  // PROGRAMS — /api/programs if it exists in your app
  if (q.includes('program') || q.includes('innovation program')) {
    const { ok, data, message } = await callAPI('/api/programs', req);
    if (!ok || !data) return `Could not fetch programs: ${message}`;
    return 'Innovation programs:\n' + fmt(
      data,
      (p: any) => `• ${p.title} at ${p.venue} (${p.programType}) — ${new Date(p.eventDate).toDateString()}`,
      'No programs found.'
    );
  }

  // MY BOOKINGS — real endpoint is /api/bookings/my (GET /api/bookings returns 400)
  if (q.includes('my booking') || q.includes('my reservation') || q.includes('booked')) {
    const { ok, data, message } = await callAPI('/api/bookings/my', req);
    if (!ok || !data) return data === null ? 'Please log in to view your bookings.' : `Could not fetch bookings: ${message}`;
    return 'Your bookings:\n' + fmt(
      data,
      (b: any) => `• ${b.lab} on ${new Date(b.date).toDateString()} at ${b.timeSlot} [${b.status}]\n  Purpose: ${b.purpose}`,
      'You have no bookings yet.'
    );
  }

  return null;
}

// ── TOOL HANDLER — booking via /api/bookings POST ──
// bookingCreateSchema: { purpose, date (YYYY-MM-DD), timeSlot, facilities: string[], lab }
// bookingTool.ts extractBookingParams already builds this shape.
// createBooking() in bookingTool.ts calls /api/bookings directly — reuse it.
async function handleTool(
  question: string,
  user: ReturnType<typeof authenticate>,
  req: NextRequest
): Promise<{ answer: string; success?: boolean }> {
  const params = extractBookingParams(question);
  if (!params) {
    return {
      answer: 'Could not extract booking details. Please say something like:\n"Book AI Lab tomorrow at 3 PM for project work."',
      success: false,
    };
  }

  const validationErr = validateBookingParams(params);
  if (validationErr) return { answer: validationErr, success: false };

  // createBooking() already handles the fetch to /api/bookings with cookie forwarding
  // It returns { success, message } — use it directly
  const result = await createBooking(params as any, user!, req as any);
  return { answer: result.message, success: result.success };
}

// ── TYPE DETECTOR — maps question to Chroma metadata type ──
function detectType(question: string): string | null {
  const q = question.toLowerCase();
  if (q.includes('news') || q.includes('latest update')) return 'news';
  if (q.includes('grant') || q.includes('funding') || q.includes('scholarship')) return 'grant';
  if (q.includes('hackathon')) return 'hackathon';
  if (q.includes('announcement') || q.includes('notice')) return 'announcement';
  if (q.includes('innovation program')) return 'innovation_program';
  if (q.includes('problem') || q.includes('challenge')) return 'problem';
  if (q.includes('faculty') || q.includes('professor') || q.includes('teacher') || q.includes('staff')) return 'faculty';
  if (q.includes('ai lab') || q.includes('robotics lab') || q.includes('iot lab') ||
      q.includes('hardware lab') || q.includes('computer lab') || q.includes('the lab') ||
      q.includes('labs') || (q.includes('lab') && !q.includes('label'))) return 'lab';
  if (q.includes('facility') || q.includes('facilities') || q.includes('seminar hall') ||
      q.includes('conference room') || q.includes('innovation hub')) return 'facility';
  if (q.includes('policy') || q.includes('policies') || q.includes('procedure') ||
      q.includes('guideline') || q.includes('booking rule') || q.includes('internship rule')) return 'policy';
  if (q.includes('event') || q.includes('workshop') || q.includes('seminar')) return 'event';
  if (q.includes('program')) return 'innovation_program';
  return null;
}

// ── RAG HANDLER — Chroma + Ollama ──
// Fix: getCollection({ name }) only — no embeddingFunction param (Chroma v0.4+ rejects null there)
async function handleRAG(question: string): Promise<{ answer: string; sources: string[] }> {
  console.log("================================");
  console.log("ENTERED handleRAG");
  console.log("QUESTION:", question);
  console.log("================================");

  let embedding: number[];

  try {
    console.log("Generating embedding...");

    const embedRes = await ollama.embeddings({
      model: process.env.EMBED_MODEL ?? "nomic-embed-text",
      prompt: question,
    });

    embedding = embedRes.embedding;

    console.log("Embedding generated");
  } catch (err: any) {
    console.error("EMBEDDING ERROR:", err);
    return ragFallback(question);
  }

  try {
    console.log("Connecting to Chroma...");

    const { ChromaClient } = await import("chromadb");

    const chroma = new ChromaClient({
      path: process.env.CHROMA_URL ?? "http://localhost:8000",
    });

    console.log("Loading collection...");

    const collection = await chroma.getOrCreateCollection({
      name: "coe-site",
      metadata: { "hnsw:space": "cosine" }, // must match ingest — nomic-embed-text is cosine space
    });

    console.log("Collection loaded");

    const detectedType = detectType(question);
    console.log("Detected type filter:", detectedType ?? "none (broad search)");

    console.log("Querying Chroma...");

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 15,
      ...(detectedType ? { where: { type: detectedType } } : {}),
    });

    console.log("Chroma query completed");

    const docs = results.documents?.[0]?.filter(Boolean) ?? [];

    console.log("Retrieved docs:", docs.length);

    docs.forEach((doc, index) => {
      console.log(`\n========== DOC ${index + 1} ==========`);

      if (typeof doc === "string") {
        console.log(doc.substring(0, 300));
      } else {
        console.log(String(doc).substring(0, 300));
      }
    });

    const metas = results.metadatas?.[0] ?? [];

    const sources = (metas as any[])
      .map((m: any) => m?.title)
      .filter(Boolean);

    if (!docs.length) {
      console.log("NO DOCUMENTS FOUND");
      return {
        answer: "I don't have specific information about that in my knowledge base.",
        sources: [],
      };
    }

    console.log("Preparing reasoning prompt...");

    const reasoningPrompt = `
You are the official COE TCET Assistant.

Use ONLY the provided context.

Instructions:
1. Understand the user's goal.
2. Extract relevant facts.
3. Connect related information.
4. Explain your reasoning briefly.
5. Never invent facts or hallucinate.
6. CRITICAL: If the provided context does not contain the answer or is completely unrelated to the question, you MUST reply with exactly: "I'm sorry, but I don't have enough context in my knowledge base to answer that question." Do not attempt to guess.

Context:
${docs.join("\n\n")}
`;

    console.log(
      "MODEL ACTUALLY USED =",
      process.env.LLM_MODEL ?? "qwen3:8b"
    );

    console.log("Calling Ollama...");

    const response = await ollama.chat({
      model: process.env.LLM_MODEL ?? "qwen3:8b",

      options: {
        temperature: 0.3,
        num_predict: 500,
      },

      messages: [
        {
          role: "system",
          content: reasoningPrompt,
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    console.log("OLLAMA RESPONSE RECEIVED");

    console.log(
      response.message?.content?.substring(0, 500)
    );

    return {
      answer: response.message.content,
      sources: [...new Set(sources)] as string[],
    };
  } catch (err: any) {
    console.error("RAG ERROR:", err);
    return ragFallback(question);
  }
}

function ragFallback(question: string): { answer: string; sources: string[] } {
  const q = question.toLowerCase();
  if (q.includes('ai lab') || q.includes('lab') || q.includes('facility'))
    return { answer: 'The AI Lab and Research Facilities offer high-performance computing, robotics, and IoT kits. They are open to students and faculty for approved projects.', sources: ['Offline Fallback'] };
  if (q.includes('internship') || q.includes('policy'))
    return { answer: 'Internship policy: minimum 4–6 weeks, approved by Department Head. You must apply via the portal. Faculty approval is required for external projects.', sources: ['Offline Fallback'] };
  if (q.includes('event') || q.includes('hackathon') || q.includes('news'))
    return { answer: 'Upcoming events, hackathons, and news are updated regularly on the portal. Please log in to the main dashboard or ask to view the latest event list.', sources: ['Offline Fallback'] };
  if (q.includes('grant') || q.includes('funding'))
    return { answer: 'Information about active grants and research funding can be found on the portal. Faculty and students can apply based on eligibility.', sources: ['Offline Fallback'] };
  if (q.includes('program') || q.includes('innovation'))
    return { answer: 'The COE runs several innovation programs designed to foster research. Faculty mentorship is provided to active student participants.', sources: ['Offline Fallback'] };
  return {
    answer: 'The local AI server (Ollama) or vector store (Chroma) appears offline, so I cannot provide an extensive contextual answer right now. However, you can still ask me to view your bookings, check events, or reserve a lab!',
    sources: ['System Fallback'],
  };
}

// ── FACULTY HANDLERS ──

async function handleFacultyStats(question: string, user: any): Promise<string> {
  const members = await prisma.claimMember.findMany({
    where: {
      claim: {
        problem: {
          problemType: { in: ['INTERNSHIP', 'FACULTY_INTERNSHIP'] }
        }
      }
    },
    include: {
      user: true,
      claim: {
        include: {
          problem: true
        }
      }
    }
  });

  if (!members || members.length === 0) {
    return 'There are currently no students working in internships.';
  }

  const rows = members.map(m => {
    const name = m.user.name;
    const uid = m.user.uid || '';
    let branch = 'Unknown';
    if (uid) {
      const parts = uid.split('-');
      if (parts.length >= 2) {
        branch = parts[1].replace(/[0-9]/g, '').replace(/D/g, '') || parts[1];
      }
    }
    const internship = m.claim.problem.title;
    const role = m.role;
    return `• **${name}** (${branch}) — Role: ${role} in "${internship}"`;
  });

  return `Currently, there are **${members.length}** students working in internships:\n\n${rows.join('\n')}`;
}

async function handleFacultyAnalysis(question: string, user: any): Promise<string> {
  const problem = await prisma.problem.findFirst({
    where: {
      problemType: { in: ['INTERNSHIP', 'FACULTY_INTERNSHIP'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      applications: {
        include: {
          user: true,
          profile: true
        }
      }
    }
  });

  if (!problem) return 'I could not find any active internships in the system.';
  if (problem.applications.length === 0) return `There are no applications yet for the latest internship: "${problem.title}".`;

  let context = `Internship Title: ${problem.title}\nInternship Description: ${problem.description}\n\nApplicants:\n`;
  for (const app of problem.applications) {
    context += `\nCandidate: ${app.user.name}\nSkills: ${app.profile?.skills || 'None listed'}\nExperience: ${app.profile?.experience || 'None listed'}\nInterests: ${app.profile?.interests || 'None listed'}\n`;
  }

  try {
    const response = await ollama.chat({
      model: process.env.LLM_MODEL ?? 'qwen3:8b',
      options: { temperature: 0.1 },
      messages: [
        {
          role: 'system',
          content: 'You are an academic evaluator analyzing internship applications for a faculty member. Recommend the best candidates based strictly on their skills and experience. Do not invent facts. Compare the candidates and provide a brief rationale.'
        },
        {
          role: 'user',
          content: context
        }
      ]
    });
    return `**Analysis for Internship:** "${problem.title}"\n\n${response.message.content}`;
  } catch (err) {
    console.warn('[handleFacultyAnalysis] Ollama failed:', err);
    return 'The AI analysis engine is currently offline, so I cannot evaluate the candidates right now. However, you can view the raw application data on the portal.';
  }
}

// ── MAIN ROUTE ──
export async function POST(req: NextRequest) {
  console.log('🔥 POST /api/chat');

  try {
    const { question } = await req.json();
    if (!question) return NextResponse.json({ error: 'No question provided' }, { status: 400 });

    // authenticate() supports Bearer token AND accessToken cookie — matches your api-helpers.ts
    const user = authenticate(req);

    console.log("Authenticated user =", user);

    const role = getRole(user);

    console.log(`[Chat] role = ${role} | q="${question}"`);
    console.log(`[Chat] role = ${role} | q="${question}"`);

    const { intent, reason } = await routeIntentAsync(question);
    console.log(`[Chat] intent = ${intent}(${reason})`);

    // ── GREETING ──
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good evening', 'greetings'];
    if (greetings.some(g => question.toLowerCase().trim() === g)) {
      const name = user?.name ? `, ${user.name}` : '';
      return NextResponse.json({
        answer: `Hi${name}! I'm the COE TCET assistant. Ask me about events, hackathons, grants, announcements, programs, or make a lab booking.`,
        intent: 'GREETING',
      });
    }

    // ── TOOL — booking action ──
    if (intent === 'TOOL') {
      if (!canUseTool(role)) {
        return NextResponse.json({
          answer: 'You must be logged in to make a booking. Please [log in here](/login) as a student or faculty member.',
          intent: 'TOOL',
        });
      }
      const result = await handleTool(question, user, req);
      return NextResponse.json({ ...result, intent: 'TOOL', role });
    }

    // ── FACULTY HANDLERS ──
    if (intent === 'FACULTY_STATS' || intent === 'FACULTY_ANALYSIS') {
      if (role !== 'FACULTY' && role !== 'ADMIN') {
        return NextResponse.json({
          answer: 'Access Denied: Candidate analysis and student statistics are restricted to Faculty and Admin accounts.',
          intent,
          role
        });
      }
      
      let answer = '';
      if (intent === 'FACULTY_STATS') {
        answer = await handleFacultyStats(question, user);
      } else {
        answer = await handleFacultyAnalysis(question, user);
      }
      
      return NextResponse.json({ answer, intent, role });
    }

    // ── SQL — structured data via internal APIs ──
    if (intent === 'SQL') {
      const sqlData = await handleSQL(question, req);

      if (sqlData) {
        return NextResponse.json({
          answer: sqlData,
          intent: 'SQL',
          role
        });
      }
    }

    // ── KAG — Neo4j graph ──
    if (intent === 'KAG') {
      const kagResult = await queryKAG(question);
      // queryKAG returns { answer: string, sources: string[] }
      return NextResponse.json({ ...kagResult, intent: 'KAG', role });
    }

    // ── RAG — Chroma + Ollama (default) ──
    const ragResult = await handleRAG(question);
    return NextResponse.json({ ...ragResult, intent: intent === 'SQL' ? 'RAG' : intent, role });

  } catch (err: any) {
    console.error('[Chat] Unhandled error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}