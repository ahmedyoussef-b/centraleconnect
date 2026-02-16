
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const procedures = await prisma.procedure.findMany({
      orderBy: { name: 'asc' },
    });
    // Prisma returns JSON fields as JSON objects, so no string parsing is needed here.
    return NextResponse.json(procedures);
  } catch (error) {
    console.error('[API Procedures] Error fetching procedures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch procedures from remote database.' },
      { status: 500 }
    );
  }
}
