import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (driver) return driver;
  const uri      = process.env.NEO4J_URI      || 'bolt://localhost:7687';
  const user     = process.env.NEO4J_USERNAME || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'hLqAMup_Hpf8kL6QLec9uIaTAiRG0b2r9ZOTU0YXWZM';
  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  } catch (err) {
    console.error('Failed to create Neo4j driver:', err);
  }
  return driver!;
}

export async function runCypher(query: string, params: Record<string, any> = {}) {
  const drv = getNeo4jDriver();
  if (!drv) throw new Error('Neo4j driver not initialized');
  const session = drv.session();
  try {
    const result = await session.run(query, params);
    return result.records;
  } finally {
    await session.close();
  }
}

// ── INTENT CLASSIFIER for KAG ──
function classifyKAG(q: string): string {
  if (q.includes('faculty') && (q.includes('ai') || q.includes('machine learning') || q.includes('computer vision') || q.includes('nlp') || q.includes('research'))) return 'FACULTY_BY_RESEARCH';
  if (q.includes('specializes in') || q.includes('specialize in') || q.includes('which faculty')) return 'FACULTY_BY_RESEARCH';
  if (q.includes('who works') || q.includes('who is in') || q.includes('who leads') ||
      q.includes('who heads') || q.includes('in charge') ||
      (q.includes('faculty') && q.includes('lab'))) return 'FACULTY_BY_LAB';
  if (q.includes('faculty') && (q.includes('department') || q.includes('which dept') || q.includes('belongs to'))) return 'FACULTY_BY_DEPT';
  if ((q.includes('grant') || q.includes('funding')) && (q.includes('ai') || q.includes('lab') || q.includes('research') || q.includes('fund'))) return 'GRANTS_BY_LAB';
  if (q.includes('lab') && (q.includes('department') || q.includes('which dept') || q.includes('belongs'))) return 'LAB_BY_DEPT';
  if (q.includes('research') && (q.includes('area') || q.includes('topic') || q.includes('field'))) return 'RESEARCH_AREAS';
  return 'GENERAL';
}

export async function queryKAG(question: string): Promise<{ answer: string; sources: string[] }> {
  const q = question.toLowerCase();
  const intent = classifyKAG(q);

  try {
    switch (intent) {

      case 'FACULTY_BY_RESEARCH': {
        // Extract research area from question
        const areaMap: Record<string, string> = {
          'ai': 'Artificial Intelligence',
          'artificial intelligence': 'Artificial Intelligence',
          'machine learning': 'Machine Learning',
          'ml': 'Machine Learning',
          'computer vision': 'Computer Vision',
          'nlp': 'Natural Language Processing',
          'natural language': 'Natural Language Processing',
          'iot': 'Internet of Things',
          'robotics': 'Robotics',
          'cybersecurity': 'Cybersecurity',
          'data science': 'Data Science',
          'embedded': 'Embedded Systems',
          'cloud': 'Cloud Computing',
        };
        const area = Object.entries(areaMap).find(([k]) => q.includes(k))?.[1] ?? null;

        if (area) {
          const records = await runCypher(`
            MATCH (f:Faculty)-[:SPECIALIZES_IN]->(r:ResearchArea {name: $area})
            OPTIONAL MATCH (f)-[:BELONGS_TO]->(d:Department)
            OPTIONAL MATCH (f)-[:MEMBER_OF]->(l:Lab)
            RETURN f.name AS name, f.designation AS designation,
                   d.name AS department, collect(DISTINCT l.name) AS labs
          `, { area });

          if (records.length > 0) {
            const list = records.map(r =>
              `• ${r.get('name')} (${r.get('designation') ?? 'Faculty'}, ${r.get('department') ?? 'COE'}) — Labs: ${(r.get('labs') as string[]).join(', ') || 'N/A'}`
            ).join('\n');
            return {
              answer: `Faculty specializing in ${area}:\n${list}`,
              sources: ['Neo4j Knowledge Graph (Faculty → ResearchArea)'],
            };
          }
        }

        if (!area) {
          if (q.includes('specialize') || q.includes('which faculty') || q.includes('who works in')) {
            return {
              answer: "I couldn't find any faculty specializing in that specific area in my knowledge base. You can ask me for a list of all research areas or all faculty.",
              sources: ['Neo4j Knowledge Graph (Not Found)']
            };
          }
        }

        // Broad faculty + research query
        const records = await runCypher(`
          MATCH (f:Faculty)-[:SPECIALIZES_IN]->(r:ResearchArea)
          OPTIONAL MATCH (f)-[:BELONGS_TO]->(d:Department)
          RETURN f.name AS name, f.designation AS designation,
                 d.name AS department, collect(DISTINCT r.name) AS areas
          ORDER BY f.name
        `);
        if (records.length > 0) {
          const list = records.map(r =>
            `• ${r.get('name')} (${r.get('department') ?? 'COE'}) — ${(r.get('areas') as string[]).join(', ')}`
          ).join('\n');
          return { answer: `Faculty and their research areas:\n${list}`, sources: ['Neo4j Knowledge Graph'] };
        }
        break;
      }

      case 'FACULTY_BY_LAB': {
        const labMap: Record<string, string> = {
          'ai lab': 'AI Lab', 'robotics lab': 'Robotics Lab',
          'iot lab': 'IoT Lab', 'hardware lab': 'Hardware Lab', 'computer lab': 'Computer Lab',
        };
        const lab = Object.entries(labMap).find(([k]) => q.includes(k))?.[1] ?? null;

        const cypher = lab
          ? `MATCH (f:Faculty)-[:MEMBER_OF]->(l:Lab {name: $lab})
             OPTIONAL MATCH (f)-[:SPECIALIZES_IN]->(r:ResearchArea)
             RETURN f.name AS name, f.designation AS designation, collect(DISTINCT r.name) AS areas`
          : `MATCH (f:Faculty)-[:MEMBER_OF]->(l:Lab)
             RETURN f.name AS name, f.designation AS designation, l.name AS lab`;

        const records = await runCypher(cypher, lab ? { lab } : {});
        if (records.length > 0) {
          const list = records.map(r =>
            lab
              ? `• ${r.get('name')} (${r.get('designation') ?? 'Faculty'}) — Expertise: ${(r.get('areas') as string[]).join(', ') || 'N/A'}`
              : `• ${r.get('name')} — ${r.get('lab')}`
          ).join('\n');
          return {
            answer: `Faculty associated with ${lab ?? 'labs'}:\n${list}`,
            sources: ['Neo4j Knowledge Graph (Faculty → Lab)'],
          };
        }
        break;
      }

      case 'FACULTY_BY_DEPT': {
        const records = await runCypher(`
          MATCH (f:Faculty)-[:BELONGS_TO]->(d:Department)
          OPTIONAL MATCH (f)-[:SPECIALIZES_IN]->(r:ResearchArea)
          RETURN d.name AS department, f.name AS name,
                 f.designation AS designation, collect(DISTINCT r.name) AS areas
          ORDER BY d.name, f.name
        `);
        if (records.length > 0) {
          const grouped: Record<string, string[]> = {};
          records.forEach(r => {
            const dept = r.get('department') as string;
            const entry = `  • ${r.get('name')} (${r.get('designation') ?? 'Faculty'})`;
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push(entry);
          });
          const list = Object.entries(grouped).map(([dept, members]) =>
            `${dept}:\n${members.join('\n')}`
          ).join('\n\n');
          return { answer: `Faculty by department:\n\n${list}`, sources: ['Neo4j Knowledge Graph (Faculty → Department)'] };
        }
        break;
      }

      case 'GRANTS_BY_LAB': {
        const records = await runCypher(`
          MATCH (g:Grant)-[:SUPPORTS]->(l:Lab)
          OPTIONAL MATCH (g)-[:FUNDS_RESEARCH_IN]->(r:ResearchArea)
          RETURN g.title AS grant, g.issuingBody AS body,
                 l.name AS lab, collect(DISTINCT r.name) AS areas
          ORDER BY l.name
        `);
        if (records.length > 0) {
          const list = records.map(r =>
            `• ${r.get('grant')} by ${r.get('body')} → ${r.get('lab')} [${(r.get('areas') as string[]).join(', ')}]`
          ).join('\n');
          return { answer: `Grants funding lab research:\n${list}`, sources: ['Neo4j Knowledge Graph (Grant → Lab)'] };
        }
        break;
      }

      case 'LAB_BY_DEPT': {
        const records = await runCypher(`
          MATCH (l:Lab)-[:LOCATED_IN]->(d:Department)
          RETURN d.name AS department, collect(l.name) AS labs
          ORDER BY d.name
        `);
        if (records.length > 0) {
          const list = records.map(r =>
            `• ${r.get('department')}: ${(r.get('labs') as string[]).join(', ')}`
          ).join('\n');
          return { answer: `Labs by department:\n${list}`, sources: ['Neo4j Knowledge Graph (Lab → Department)'] };
        }
        break;
      }

      case 'RESEARCH_AREAS': {
        const records = await runCypher(`
          MATCH (f:Faculty)-[:SPECIALIZES_IN]->(r:ResearchArea)
          RETURN r.name AS area, collect(f.name) AS faculty
          ORDER BY r.name
        `);
        if (records.length > 0) {
          const list = records.map(r =>
            `• ${r.get('area')}: ${(r.get('faculty') as string[]).join(', ')}`
          ).join('\n');
          return { answer: `Research areas at COE:\n${list}`, sources: ['Neo4j Knowledge Graph (ResearchArea → Faculty)'] };
        }
        break;
      }

      default: {
        // General — return overview
        const [facRecords, labRecords] = await Promise.all([
          runCypher('MATCH (f:Faculty) RETURN count(f) AS count'),
          runCypher('MATCH (l:Lab) RETURN l.name AS name'),
        ]);
        const facCount = facRecords[0]?.get('count') ?? 0;
        const labNames = labRecords.map(r => r.get('name') as string).join(', ');
        return {
          answer: `COE Knowledge Graph overview:\n• Faculty: ${facCount}\n• Labs: ${labNames}\n\nAsk about specific faculty, labs, research areas, or grants for detailed information.`,
          sources: ['Neo4j Knowledge Graph'],
        };
      }
    }

    // No records found for intent
    return {
      answer: 'No matching records found in the knowledge graph for that query. The graph may need more data.',
      sources: ['Neo4j Knowledge Graph'],
    };

  } catch (err: any) {
    console.warn('Neo4j query failed:', err.message);
    return {
      answer: 'Unable to query the knowledge graph. Please ensure Neo4j is running.',
      sources: ['Neo4j Error'],
    };
  }
}