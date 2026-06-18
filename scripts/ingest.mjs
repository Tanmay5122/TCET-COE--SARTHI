// scripts/ingest.mjs
import { ChromaClient } from 'chromadb';
import ollama from 'ollama';

const BASE_URL = 'http://localhost:3000';

// ── FETCH REAL DATA from your API ──
async function fetchSiteData() {
  const res = await fetch(`${BASE_URL}/api/page-map`);
  const data = await res.json();
  const all = [
    ...data.problems,
    ...data.hackathons,
    ...data.programs,
    ...data.events,
    ...data.news,
    ...data.grants,
    ...data.announcements,
  ];
  console.log(`✅ Fetched ${all.length} records from DB`);
  return all;
}

// ── FETCH FACULTY directly from DB via Prisma ──
async function fetchFaculty() {
  try {
    const { default: prisma } = await import('../lib/prisma.js');
    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY', status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        facultyProfile: {
          select: { department: true, designation: true, expertise: true },
        },
      },
    });
    console.log(`✅ Fetched ${faculty.length} faculty from DB`);
    return faculty.map((f) => ({
      type: 'faculty',
      id: `faculty-${f.id}`,
      title: f.name,
      content: [
        f.name,
        f.facultyProfile?.designation ? `Designation: ${f.facultyProfile.designation}` : '',
        f.facultyProfile?.department ? `Department: ${f.facultyProfile.department}` : '',
        f.facultyProfile?.expertise ? `Expertise: ${f.facultyProfile.expertise}` : '',
        `Email: ${f.email}`,
      ].filter(Boolean).join('. '),
      department: f.facultyProfile?.department ?? '',
      designation: f.facultyProfile?.designation ?? '',
    }));
  } catch (err) {
    console.warn(`⚠️  Prisma faculty fetch failed (${err.message}), using static fallback`);
    return getStaticFaculty();
  }
}

// ── STATIC FACULTY FALLBACK (edit with real names if Prisma fails) ──
function getStaticFaculty() {
  return [
    {
      type: 'faculty',
      id: 'faculty-static-1',
      title: 'Dr. Sample Faculty',
      content: 'Dr. Sample Faculty. Designation: Associate Professor. Department: Computer Engineering. Expertise: Artificial Intelligence, Machine Learning, Computer Vision.',
      department: 'Computer Engineering',
      designation: 'Associate Professor',
    },
  ];
}

// ── STATIC LABS ──
function getLabsData() {
  return [
    {
      type: 'lab', id: 'lab-ai', title: 'AI Lab',
      content: 'AI Lab at TCET COE. Equipped with high-performance GPU servers, AI workstations, IoT development kits, and deep learning infrastructure. Used for AI/ML research, computer vision projects, and student innovation projects. Open to students and faculty with approved bookings.',
    },
    {
      type: 'lab', id: 'lab-robotics', title: 'Robotics Lab',
      content: 'Robotics Lab at TCET COE. Equipped with robotic arms, embedded systems boards, Arduino and Raspberry Pi kits, sensors, and actuators. Used for robotics projects, automation research, and hands-on engineering workshops.',
    },
    {
      type: 'lab', id: 'lab-iot', title: 'IoT Lab',
      content: 'IoT Lab at TCET COE. Equipped with IoT sensors, microcontrollers, wireless communication modules, and edge computing devices. Used for Internet of Things projects, smart systems development, and prototype building.',
    },
    {
      type: 'lab', id: 'lab-hardware', title: 'Hardware Lab',
      content: 'Hardware Lab at TCET COE. Equipped with oscilloscopes, signal generators, soldering stations, PCB design tools, and electronic components. Used for circuit design, electronics prototyping, and hardware development.',
    },
    {
      type: 'lab', id: 'lab-computer', title: 'Computer Lab',
      content: 'Computer Lab at TCET COE. Equipped with high-performance desktop computers with software development tools, IDEs, and design applications. Used for software projects, coding workshops, and technical training.',
    },
  ];
}

// ── STATIC FACILITIES ──
function getFacilitiesData() {
  return [
    {
      type: 'facility', id: 'facility-seminar-hall', title: 'Seminar Hall',
      content: 'Seminar Hall at TCET COE. Large venue with projector, audio system, and seating for up to 150 participants. Used for seminars, guest lectures, hackathon presentations, workshops, and events. Bookable through the COE portal.',
    },
    {
      type: 'facility', id: 'facility-conference-room', title: 'Conference Room',
      content: 'Conference Room at TCET COE. Meeting space with video conferencing setup, whiteboard, and seating for up to 20 participants. Used for faculty meetings, project reviews, industry interactions, and team discussions.',
    },
    {
      type: 'facility', id: 'facility-innovation-hub', title: 'Innovation Hub',
      content: 'Innovation Hub at TCET COE. Open collaborative workspace for student teams to work on projects, prototypes, and startup ideas. Equipped with workbenches, tools, and maker equipment. Open to all COE students.',
    },
  ];
}

// ── STATIC POLICIES ──
function getPoliciesData() {
  return [
    {
      type: 'policy', id: 'policy-booking', title: 'Lab Booking Policy',
      content: 'Lab Booking Policy at TCET COE. Students and faculty can book labs through the COE portal. Bookings must be made at least 24 hours in advance. Maximum booking duration is 3 hours per session. Bookings require admin approval. Cancellations must be made at least 12 hours before the booking time. Repeated no-shows may result in booking privileges being suspended.',
    },
    {
      type: 'policy', id: 'policy-internship', title: 'Internship Policy',
      content: 'Internship Policy at TCET COE. Minimum internship duration is 4 to 6 weeks. Internships must be approved by the Department Head before starting. Students must submit weekly progress reports. Final internship report and completion certificate required for credit. Apply via the COE portal under the Internship section.',
    },
    {
      type: 'policy', id: 'policy-hackathon', title: 'Hackathon Participation Policy',
      content: 'Hackathon Participation Policy at TCET COE. Teams of 2 to 5 students can participate. Each team must have a team lead with a valid TCET UID. Problem statements are released at the start of the event. Submissions must be made before the deadline. Judging is based on innovation, technical complexity, impact, user experience, execution, presentation, and feasibility.',
    },
    {
      type: 'policy', id: 'policy-grant', title: 'Grant Application Policy',
      content: 'Grant Application Policy at TCET COE. Faculty and students can apply for research grants listed on the portal. Applications must include a project proposal, budget breakdown, and faculty supervisor approval. Grant deadlines are strictly enforced. Awarded grants require quarterly progress reports and a final project report upon completion.',
    },
  ];
}

// ── CHUNKER ──
function chunkText(text, size = 100, overlap = 20) {
  const words = text.split(' ');
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(' ');
    if (chunk.trim()) chunks.push(chunk);
  }
  return chunks;
}

function buildDocuments(data) {
  const docs = [];
  for (const item of data) {
    const fullText = [
      item.title,
      item.content,
      item.tags,
      item.industry,
      item.issuingBody,
      item.status,
      item.programType,
      item.venue,
      item.department,
      item.designation,
    ].filter(Boolean).join('. ');

    const chunks = chunkText(fullText);
    const safeId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    chunks.forEach((chunk, i) => {
      docs.push({
        id: `${item.type}-${safeId}-chunk-${i}`,
        text: chunk,
        metadata: { type: item.type, title: item.title ?? '', sourceId: String(item.id) },
      });
    });
  }
  return docs;
}

// ── INGEST ──
async function ingest() {
  console.log('🚀 Starting ingestion...');

  const [siteData, facultyData] = await Promise.all([fetchSiteData(), fetchFaculty()]);
  const allData = [
    ...siteData,
    ...facultyData,
    ...getLabsData(),
    ...getFacilitiesData(),
    ...getPoliciesData(),
  ];

  console.log(`📦 Total records to ingest: ${allData.length}`);

  const chroma = new ChromaClient({ path: 'http://localhost:8000' });
  try { await chroma.deleteCollection({ name: 'coe-site' }); } catch (_) {}

  const collection = await chroma.createCollection({
    name: 'coe-site',
    metadata: { 'hnsw:space': 'cosine' },
    embeddingFunction: null,
  });

  const docs = buildDocuments(allData);
  console.log(`Embedding ${docs.length} chunks with Ollama...`);

  for (const doc of docs) {
    const res = await ollama.embeddings({ model: 'nomic-embed-text', prompt: doc.text });
    await collection.add({
      ids: [doc.id],
      embeddings: [res.embedding],
      documents: [doc.text],
      metadatas: [doc.metadata],
    });
    console.log(`✓ ${doc.id}`);
  }

  const count = await collection.count();
  console.log(`✅ Ingestion complete! Total chunks in Chroma: ${count}`);
}

ingest().catch((err) => {
  console.error('❌ Error:', err.message);
  console.error(err);
});
