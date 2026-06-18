// src/app/api/page-map/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // adjust to your prisma client path

export async function GET() {
  const [problems, hackathons, programs, events, news, grants, announcements] =
    await Promise.all([
      prisma.problem.findMany({
        where: { approvalStatus: 'APPROVED' },
        select: {
          id: true,
          title: true,
          description: true,
          tags: true,
          problemType: true,
          status: true,
          mode: true,
          industryName: true,
          createdAt: true,
          industry: { select: { name: true } },
        },
      }),

      prisma.hackathonEvent.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          status: true,
          registrationOpen: true,
        },
      }),

      prisma.innovationProgram.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          programType: true,
          venue: true,
          eventDate: true,
        },
      }),

      prisma.event.findMany({
        where: { isVisible: true },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          mode: true,
          registrationLink: true,
        },
      }),

      prisma.newsPost.findMany({
        where: { isVisible: true },
        select: {
          id: true,
          title: true,
          caption: true,
          publishedAt: true,
        },
      }),

      prisma.grant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          issuingBody: true,
          category: true,
          description: true,
          deadline: true,
          referenceLink: true,
        },
      }),

      prisma.announcement.findMany({
        where: { expiresAt: { gt: new Date() } },
        select: {
          id: true,
          text: true,
          link: true,
          expiresAt: true,
        },
      }),
    ]);

  return NextResponse.json({
    problems: problems.map((p) => ({
      type: 'problem',
      id: p.id,
      title: p.title,
      content: p.description,
      tags: p.tags,
      problemType: p.problemType,
      status: p.status,
      mode: p.mode,
      industry: p.industry?.name ?? p.industryName ?? null,
      createdAt: p.createdAt,
    })),

    hackathons: hackathons.map((h) => ({
      type: 'hackathon',
      id: h.id,
      title: h.title,
      content: h.description,
      startTime: h.startTime,
      endTime: h.endTime,
      status: h.status,
      registrationOpen: h.registrationOpen,
    })),

    programs: programs.map((p) => ({
      type: 'innovation_program',
      id: p.id,
      title: p.title,
      content: p.description,
      programType: p.programType,
      venue: p.venue,
      eventDate: p.eventDate,
    })),

    events: events.map((e) => ({
      type: 'event',
      id: e.id,
      title: e.title,
      content: e.description,
      date: e.date,
      mode: e.mode,
      registrationLink: e.registrationLink,
    })),

    news: news.map((n) => ({
      type: 'news',
      id: n.id,
      title: n.title,
      content: n.caption,
      publishedAt: n.publishedAt,
    })),

    grants: grants.map((g) => ({
      type: 'grant',
      id: g.id,
      title: g.title,
      issuingBody: g.issuingBody,
      category: g.category,
      content: g.description,
      deadline: g.deadline,
      referenceLink: g.referenceLink,
    })),

    announcements: announcements.map((a) => ({
      type: 'announcement',
      id: a.id,
      content: a.text,
      link: a.link,
      expiresAt: a.expiresAt,
    })),
  });
}
console.log({
  problems: await prisma.problem.count(),
  hackathons: await prisma.hackathonEvent.count(),
  programs: await prisma.innovationProgram.count(),
  events: await prisma.event.count(),
  news: await prisma.newsPost.count(),
  grants: await prisma.grant.count(),
  announcements: await prisma.announcement.count(),
});