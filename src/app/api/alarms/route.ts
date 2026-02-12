// src/app/api/alarms/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const alarms = await prisma.alarm.findMany();
    // Prisma returns snake_case fields, but our frontend type expects camelCase for some fields.
    // We must map them here.
    const mappedAlarms = alarms.map(alarm => ({
      ...alarm,
      resetProcedure: alarm.reset_procedure,
      standardRef: alarm.standard_ref,
      equipmentId: alarm.equipment_id,
    }));
    return NextResponse.json(mappedAlarms);
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
