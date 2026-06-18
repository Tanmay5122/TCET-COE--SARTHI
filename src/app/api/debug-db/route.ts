// src/app/api/debug-db/route.ts

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    problems: await prisma.problem.count(),
    hackathons: await prisma.hackathonEvent.count(),
    programs: await prisma.innovationProgram.count(),
    events: await prisma.event.count(),
    news: await prisma.newsPost.count(),
    grants: await prisma.grant.count(),
    announcements: await prisma.announcement.count(),
  });
}