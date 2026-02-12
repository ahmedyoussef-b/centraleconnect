
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  console.log("[SYNC_DATA_API] Received request to fetch remote data for synchronization.");
  try {
    const [equipments, documents, parameters, alarms, logEntries, procedures, synopticItems, annotations, alarmEvents, scadaData] = await Promise.all([
      prisma.equipment.findMany(),
      prisma.document.findMany(),
      prisma.parameter.findMany(),
      prisma.alarm.findMany(),
      prisma.logEntry.findMany({ orderBy: { timestamp: 'asc' } }), // Important to get them in order for signature chaining
      prisma.procedure.findMany(),
      prisma.synopticItem.findMany(),
      prisma.annotation.findMany(),
      prisma.alarmEvent.findMany(),
      prisma.scadaData.findMany(),
    ]);
    
    const dataPayload = {
      equipments,
      documents,
      parameters,
      alarms,
      logEntries,
      procedures,
      synopticItems,
      annotations,
      alarmEvents,
      scadaData,
    };
    
    console.log(`[SYNC_DATA_API] Sending data payload: ${equipments.length} equipments, ${documents.length} documents, ${logEntries.length} log entries.`);
    return NextResponse.json(dataPayload);

  } catch (error) {
    console.error("[SYNC_DATA_API] API Sync Error:", error);
    return NextResponse.json(
      { error: 'Failed to fetch data for synchronization' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
