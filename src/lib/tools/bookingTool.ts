import { TokenPayload } from '@/lib/jwt';

interface BookingParams {
  lab: string;
  date: string;       // YYYY-MM-DD
  timeSlot: string;   // e.g. "3:00 PM - 4:00 PM"
  purpose: string;
  facilities: string[];
}

// ── EXTRACT BOOKING PARAMS FROM NATURAL LANGUAGE ──
export function extractBookingParams(question: string): Partial<BookingParams> | null {
  const q = question.toLowerCase();
  const result: Partial<BookingParams> = {};

  // extract lab — named labs first, then numbered labs (Lab 2, Lab A)
  const namedLabMatch = q.match(/(ai lab|robotics lab|computer lab|seminar hall|iot lab|hardware lab|facility|hall)/i);
  const numberedLabMatch = q.match(/\blab\s*(\d+|[a-zA-Z])\b/i);
  if (namedLabMatch) result.lab = namedLabMatch[0].trim();
  else if (numberedLabMatch) result.lab = numberedLabMatch[0].trim();

  // extract date
  const today = new Date();
  if (q.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    result.date = tomorrow.toISOString().split('T')[0];
  } else if (q.includes('today')) {
    result.date = today.toISOString().split('T')[0];
  } else {
    const dateMatch = q.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) result.date = dateMatch[1];
  }

  // extract time slot — normalize to "3:00 PM - 4:00 PM" format
  const timeMatch = question.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:to|-)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))?/i);
  if (timeMatch) {
    const normalizeTime = (t: string) => {
      const m = t.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (!m) return t;
      const h = m[1];
      const min = m[2] ?? '00';
      const period = m[3].toUpperCase();
      return `${h}:${min} ${period}`;
    };
    const start = normalizeTime(timeMatch[1]);
    const end = timeMatch[2] ? normalizeTime(timeMatch[2]) : normalizeTime(bumpHour(timeMatch[1]));
    result.timeSlot = `${start} - ${end}`;
  }

  // extract purpose (everything after "for")
  const purposeMatch = question.match(/for\s+(.+?)(?:\s+at|\s+on|\s+tomorrow|$)/i);
  result.purpose = purposeMatch ? purposeMatch[1].trim() : 'General use';
  result.facilities = [];

  return Object.keys(result).length > 0 ? result : null;
}

function bumpHour(time: string): string {
  const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return time;
  let hour = parseInt(match[1]);
  const min = match[2] ?? '00';
  const period = match[3].toLowerCase();
  hour = hour === 12 ? 1 : hour + 1;
  return `${hour}:${min} ${period}`;
}

// ── VALIDATE EXTRACTED PARAMS ──
export function validateBookingParams(params: Partial<BookingParams>): string | null {
  if (!params.lab) return 'Please specify which lab you want to book (e.g. "Lab 2" or "AI Lab").';
  if (!params.date) return 'Please specify a date (e.g. "tomorrow" or "2025-08-15").';
  if (!params.timeSlot) return 'Please specify a time slot (e.g. "3 PM" or "10 AM to 11 AM").';
  return null;
}

// ── CALL BOOKING API INTERNALLY ──
export async function createBooking(
  params: BookingParams,
  user: TokenPayload,
  req: Request
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.get('cookie') ? { 'Cookie': req.headers.get('cookie')! } : {}),
        ...(req.headers.get('authorization') ? { 'Authorization': req.headers.get('authorization')! } : {}),
      },
      body: JSON.stringify({
        purpose: params.purpose,
        date: params.date,
        timeSlot: params.timeSlot,
        facilities: params.facilities,
        lab: params.lab,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      const roleNotice = user.role === 'FACULTY' 
        ? '\n\nBooking submitted as Faculty. Awaiting final confirmation.' 
        : '\n\nYour request is pending admin approval.';

      return {
        success: true,
        message: `✅ Booking request submitted!\n• Lab: ${params.lab}\n• Date: ${params.date}\n• Time: ${params.timeSlot}\n• Purpose: ${params.purpose}${roleNotice}`,
      };
    }

    return { success: false, message: `Booking failed: ${data.message ?? 'Unknown error'}` };
  } catch (err) {
    return { success: false, message: 'Could not connect to booking service. Please try again.' };
  }
}