// src/app/api/procedures/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const procedures = await prisma.procedure.findMany();
    return NextResponse.json(procedures);
  } catch (error) {
    console.error("Failed to fetch procedures", error);
    // ⚠️ CRITIQUE: Retourner un tableau vide avec status 200
    return NextResponse.json([], { status: 200 });
  } finally {
    await prisma.$disconnect();
  }
}