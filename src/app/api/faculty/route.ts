// app/api/faculty/route.ts
// GET /api/faculty — returns all faculty with their profiles (for ingest + chatbot)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const faculty = await prisma.user.findMany({
      where: {
        role: 'FACULTY',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        facultyProfile: {
          select: {
            department: true,
            designation: true,
            expertise: true,
          },
        },
      },
    });

    const data = faculty.map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      department: f.facultyProfile?.department ?? null,
      designation: f.facultyProfile?.designation ?? null,
      expertise: f.facultyProfile?.expertise ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Faculty fetch error:', err);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}