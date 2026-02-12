import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function createEntrySignature(
    entryData: { timestamp: Date; type: string; source: string; message: string; equipmentId: string | null; },
    previousSignature: string
): Promise<string> {
    const dataString = `${previousSignature}|${entryData.timestamp.toISOString()}|${entryData.type}|${entryData.source}|${entryData.message}|${entryData.equipmentId ?? ''}`;
    const hash = createHash('sha256').update(dataString).digest('hex');
    return hash;
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const equipmentId = searchParams.get('equipmentId');

  try {
    const logEntries = await prisma.logEntry.findMany({
      where: equipmentId ? { equipmentId } : {},
      orderBy: {
        timestamp: 'desc',
      },
    });
    return NextResponse.json(logEntries);
  } catch (error) {
    console.error("Failed to fetch log entries", error);
    return NextResponse.json(
      { error: 'Failed to fetch log entries' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, source, message, equipmentId } = body;

    if (!type || !source || !message) {
        return NextResponse.json({ error: 'Missing required fields for log entry.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
        const lastLog = await tx.logEntry.findFirst({
            orderBy: { timestamp: 'desc' },
        });
        const previousSignature = lastLog?.signature ?? 'GENESIS';

        const newEntryData = {
            timestamp: new Date(),
            type,
            source,
            message,
            equipmentId: equipmentId || null,
        };

        const signature = await createEntrySignature(newEntryData, previousSignature);

        const newLogEntry = await tx.logEntry.create({
            data: {
                ...newEntryData,
                signature,
            },
        });
        return newLogEntry;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create log entry", error);
    return NextResponse.json(
      { error: 'Failed to create log entry' },
      { status: 500 }
    );
  }
}
