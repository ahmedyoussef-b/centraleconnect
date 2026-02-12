import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const equipmentId = searchParams.get('equipmentId');

  try {
    let where: Prisma.DocumentWhereInput = {};
    const andConditions: Prisma.DocumentWhereInput[] = [];

    if (text) {
        andConditions.push({
            OR: [
              { ocrText: { contains: text, mode: 'insensitive' } },
              { description: { contains: text, mode: 'insensitive' } },
            ]
        });
    }

    if (equipmentId) {
        andConditions.push({ equipmentId: { equals: equipmentId } });
    }

    if(andConditions.length > 0) {
        where = { AND: andConditions };
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("Failed to search documents", error);
    return NextResponse.json(
      { error: 'Failed to search documents' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
