
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const equipments = await prisma.equipment.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(equipments);
  } catch (error) {
    console.error('[API Equipments] Error fetching equipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipments from remote database.' },
      { status: 500 }
    );
  }
}
