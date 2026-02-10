// src/app/api/components/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Récupérer tous les composants (ou depuis une table dédiée si vous en avez une)
    const components = await prisma.$queryRaw`
      SELECT * FROM components
    `;
    return NextResponse.json(components);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}