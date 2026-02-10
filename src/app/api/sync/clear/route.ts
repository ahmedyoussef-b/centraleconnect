
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  console.log("Received request to clear remote database...");
  try {
    // The order of deletion is crucial to respect foreign key constraints.
    // Delete from "child" tables before "parent" tables.
    await prisma.$transaction([
      prisma.logEntry.deleteMany({}),
      prisma.annotation.deleteMany({}),
      prisma.document.deleteMany({}),
      prisma.alarmEvent.deleteMany({}),
      prisma.scadaData.deleteMany({}),
      prisma.parameter.deleteMany({}),
      prisma.alarm.deleteMany({}),
      prisma.synopticItem.deleteMany({}),
      prisma.procedure.deleteMany({}),
      // Equipment must be deleted after all tables that reference it.
      prisma.equipment.deleteMany({}),
    ]);
    
    console.log("Remote database cleared successfully.");
    return NextResponse.json({ message: 'La base de données distante a été nettoyée avec succès.' }, { status: 200 });

  } catch (error) {
    console.error("Failed to clear remote database:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: `Erreur lors du nettoyage de la base de données : ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Une erreur inconnue est survenue.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
