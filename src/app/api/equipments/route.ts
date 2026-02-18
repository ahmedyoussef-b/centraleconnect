
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const equipmentsFromDb = await prisma.equipment.findMany({
      orderBy: { name: 'asc' },
    });
    // Ensure date fields are serialized to strings
    const equipments = equipmentsFromDb.map(e => ({
      ...e,
      approvedAt: e.approvedAt?.toISOString(),
      commissioningDate: e.commissioningDate?.toISOString(),
    }));
    return NextResponse.json(equipments);
  } catch (error) {
    console.error('[API Equipments] Error fetching equipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipments from remote database.' },
      { status: 500 }
    );
  }
}
