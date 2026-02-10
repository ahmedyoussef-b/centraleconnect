// src/app/api/equipments/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const equipments = await prisma.equipment.findMany();
    return NextResponse.json(equipments);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch equipments' },
      { status: 500 }
    );
  }
}