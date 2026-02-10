import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [equipments, documents, parameters, alarms, logEntries, procedures, synopticItems] = await Promise.all([
      prisma.equipment.findMany(),
      prisma.document.findMany(),
      prisma.parameter.findMany(),
      prisma.alarm.findMany(),
      prisma.logEntry.findMany({ orderBy: { timestamp: 'asc' } }), // Important to get them in order for signature chaining
      prisma.procedure.findMany(),
      prisma.synopticItem.findMany(),
    ]);
    
    return NextResponse.json({
      equipments,
      documents,
      parameters,
      alarms,
      logEntries,
      procedures,
      synopticItems
    });

  } catch (error) {
    console.error("API Sync Error:", error);
    return NextResponse.json(
      { error: 'Failed to fetch data for synchronization' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
