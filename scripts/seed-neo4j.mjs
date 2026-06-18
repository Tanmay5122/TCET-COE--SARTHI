
import neo4j from 'neo4j-driver';

const URI      = process.env.NEO4J_URI      || 'bolt://localhost:7687';
const USER     = process.env.NEO4J_USERNAME || 'neo4j';
const PASSWORD = process.env.NEO4J_PASSWORD || 'password123'; //hLqAMup_Hpf8kL6QLec9uIaTAiRG0b2r9ZOTU0YXWZ

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

async function run(query, params = {}) {
  const session = driver.session();
  try {
    await session.run(query, params);
  } finally {
    await session.close();
  }
}

// ── SEED DATA ──
// Edit this section when real faculty/data becomes available

const departments = [
  { name: 'Computer Engineering' },
  { name: 'Information Technology' },
  { name: 'Electronics Engineering' },
  { name: 'Mechanical Engineering' },
];

const labs = [
  { name: 'AI Lab',         department: 'Computer Engineering', equipment: 'GPU servers, AI workstations, IoT kits, deep learning infrastructure' },
  { name: 'Robotics Lab',   department: 'Mechanical Engineering', equipment: 'Robotic arms, Arduino, Raspberry Pi, sensors, actuators' },
  { name: 'IoT Lab',        department: 'Electronics Engineering', equipment: 'IoT sensors, microcontrollers, wireless modules, edge devices' },
  { name: 'Hardware Lab',   department: 'Electronics Engineering', equipment: 'Oscilloscopes, signal generators, soldering stations, PCB tools' },
  { name: 'Computer Lab',   department: 'Computer Engineering', equipment: 'High-performance desktops, IDEs, software development tools' },
];

const researchAreas = [
  { name: 'Artificial Intelligence' },
  { name: 'Machine Learning' },
  { name: 'Computer Vision' },
  { name: 'Natural Language Processing' },
  { name: 'Robotics' },
  { name: 'Internet of Things' },
  { name: 'Cybersecurity' },
  { name: 'Data Science' },
  { name: 'Embedded Systems' },
  { name: 'Cloud Computing' },
];

// ── Edit with real faculty when profiles are filled ──
const faculty = [
  {
    name: 'Dr. Sample Faculty A',
    email: 'faculty.a@tcetmumbai.in',
    designation: 'Associate Professor',
    department: 'Computer Engineering',
    researchAreas: ['Artificial Intelligence', 'Machine Learning', 'Computer Vision'],
    labs: ['AI Lab'],
  },
  {
    name: 'Prof. Sample Faculty B',
    email: 'faculty.b@tcetmumbai.in',
    designation: 'Assistant Professor',
    department: 'Computer Engineering',
    researchAreas: ['Natural Language Processing', 'Data Science'],
    labs: ['AI Lab', 'Computer Lab'],
  },
  {
    name: 'Dr. Sample Faculty C',
    email: 'faculty.c@tcetmumbai.in',
    designation: 'Professor',
    department: 'Electronics Engineering',
    researchAreas: ['Internet of Things', 'Embedded Systems'],
    labs: ['IoT Lab', 'Hardware Lab'],
  },
  {
    name: 'Prof. Sample Faculty D',
    email: 'faculty.d@tcetmumbai.in',
    designation: 'Assistant Professor',
    department: 'Mechanical Engineering',
    researchAreas: ['Robotics'],
    labs: ['Robotics Lab'],
  },
];

const grants = [
  {
    title: 'DST Research Grant 2025',
    issuingBody: 'Department of Science and Technology',
    category: 'GOVT_GRANT',
    researchAreas: ['Artificial Intelligence', 'Machine Learning'],
    labs: ['AI Lab'],
  },
  {
    title: 'Indo-French Joint AI Research Grant',
    issuingBody: 'DST & ANR France',
    category: 'RESEARCH_FUND',
    researchAreas: ['Artificial Intelligence', 'Data Science'],
    labs: ['AI Lab'],
  },
  {
    title: 'Industry-Academia Collaboration Fund',
    issuingBody: 'TCET Industry Partners',
    category: 'INDUSTRY_GRANT',
    researchAreas: ['Internet of Things', 'Embedded Systems'],
    labs: ['IoT Lab', 'Hardware Lab'],
  },
  {
    title: 'Robotics Innovation Grant',
    issuingBody: 'Ministry of Education',
    category: 'GOVT_GRANT',
    researchAreas: ['Robotics'],
    labs: ['Robotics Lab'],
  },
];

async function seed() {
  console.log('🚀 Seeding Neo4j...');

  // Clear existing
  console.log('Clearing existing graph...');
  await run('MATCH (n) DETACH DELETE n');

  // Departments
  console.log('Creating departments...');
  for (const d of departments) {
    await run('MERGE (d:Department {name: $name})', d);
  }

  // Labs + LOCATED_IN department
  console.log('Creating labs...');
  for (const l of labs) {
    await run('MERGE (l:Lab {name: $name}) SET l.equipment = $equipment', l);
    await run(`
      MATCH (l:Lab {name: $lab}), (d:Department {name: $dept})
      MERGE (l)-[:LOCATED_IN]->(d)
    `, { lab: l.name, dept: l.department });
  }

  // Research areas
  console.log('Creating research areas...');
  for (const r of researchAreas) {
    await run('MERGE (r:ResearchArea {name: $name})', r);
  }

  // Faculty + relationships
  console.log('Creating faculty...');
  for (const f of faculty) {
    await run(`
      MERGE (f:Faculty {email: $email})
      SET f.name = $name, f.designation = $designation
    `, { email: f.email, name: f.name, designation: f.designation });

    await run(`
      MATCH (f:Faculty {email: $email}), (d:Department {name: $dept})
      MERGE (f)-[:BELONGS_TO]->(d)
    `, { email: f.email, dept: f.department });

    for (const ra of f.researchAreas) {
      await run(`
        MATCH (f:Faculty {email: $email}), (r:ResearchArea {name: $ra})
        MERGE (f)-[:SPECIALIZES_IN]->(r)
      `, { email: f.email, ra });
    }

    for (const lab of f.labs) {
      await run(`
        MATCH (f:Faculty {email: $email}), (l:Lab {name: $lab})
        MERGE (f)-[:MEMBER_OF]->(l)
      `, { email: f.email, lab });
    }
  }

  // Grants + relationships
  console.log('Creating grants...');
  for (const g of grants) {
    await run(`
      MERGE (g:Grant {title: $title})
      SET g.issuingBody = $issuingBody, g.category = $category
    `, { title: g.title, issuingBody: g.issuingBody, category: g.category });

    for (const ra of g.researchAreas) {
      await run(`
        MATCH (g:Grant {title: $title}), (r:ResearchArea {name: $ra})
        MERGE (g)-[:FUNDS_RESEARCH_IN]->(r)
      `, { title: g.title, ra });
    }

    for (const lab of g.labs) {
      await run(`
        MATCH (g:Grant {title: $title}), (l:Lab {name: $lab})
        MERGE (g)-[:SUPPORTS]->(l)
      `, { title: g.title, lab });
    }
  }

  // Verify
  const session = driver.session();
  const result = await session.run('MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY label');
  console.log('\n✅ Graph seeded! Node counts:');
  result.records.forEach(r => console.log(`  ${r.get('label')}: ${r.get('count')}`));
  await session.close();

  await driver.close();
  console.log('\nDone.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  driver.close();
});
