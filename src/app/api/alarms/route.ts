
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const alarms = await prisma.alarm.findMany();
    return NextResponse.json(alarms);
  } catch (error) {
    console.error('[API Alarms] Error fetching alarms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alarms from remote database.' },
      { status: 500 }
    );
  }
}
