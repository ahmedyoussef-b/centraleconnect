// src/app/api/alarms/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Prisma client returns data with camelCase fields as defined in the schema.
    // No manual mapping is needed.
    const alarms = await prisma.alarm.findMany();
    return NextResponse.json(alarms);
  } catch (error) {
    console.error("Failed to fetch alarms", error);
    return NextResponse.json(
      { error: 'Failed to fetch alarms' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
