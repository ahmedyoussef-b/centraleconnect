
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const procedures = await prisma.procedure.findMany();
    // The `steps` field is of type JSON in Prisma, which will be an object.
    // NextResponse.json will handle serializing it correctly.
    return NextResponse.json(procedures);
  } catch (error) {
    console.error("Failed to fetch procedures", error);
    return NextResponse.json(
      { error: 'Failed to fetch procedures' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
