
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const logEntriesFromDb = await prisma.logEntry.findMany({
      orderBy: { timestamp: 'desc' },
    });
    // Ensure date fields are serialized to strings
    const logEntries = logEntriesFromDb.map(l => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
    }));
    return NextResponse.json(logEntries);
  } catch (error) {
    console.error('[API Logbook] Error fetching log entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch log entries.' },
      { status: 500 }
    );
  }
}

export async function POST() {
    return NextResponse.json(
      { message: 'Adding log entries via web is not supported. Please use the desktop application.' },
      { status: 405 } // Method Not Allowed
    );
}
