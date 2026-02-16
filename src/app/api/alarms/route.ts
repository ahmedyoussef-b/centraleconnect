
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
