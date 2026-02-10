import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

type LogEntryData = {
    timestamp: Date;
    type: string;
    source: string;
    message: string;
    equipmentId: string | null;
}

// This function creates the chained signature for a new log entry
async function createEntrySignature(
    entryData: LogEntryData,
    previousSignature: string
): Promise<string> {
    const dataString = `${previousSignature}|${entryData.timestamp.toISOString()}|${entryData.type}|${entryData.source}|${entryData.message}|${entryData.equipmentId ?? ''}`;
    const hash = createHash('sha256').update(dataString).digest('hex');
    return hash;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { component, document } = body;

        if (!component || !document || !component.id || !document.imageData) {
            return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
        }

        const newEquipmentData = {
            externalId: component.id,
            name: component.name,
            type: component.type,
        };

        const newDocumentData = {
            equipmentId: component.id,
            imageData: document.imageData,
            ocrText: document.ocrText,
            description: document.description,
        };
        
        // Use a transaction to ensure all or nothing is written
        const result = await prisma.$transaction(async (tx) => {
            // 1. Check if equipment already exists
            const existing = await tx.equipment.findUnique({
                where: { externalId: component.id },
            });
            if (existing) {
                // We throw an error to rollback the transaction
                throw new Error(`L'équipement avec l'ID '${component.id}' existe déjà.`);
            }

            // 2. Create the new equipment
            const newEquipment = await tx.equipment.create({ data: newEquipmentData });

            // 3. Create the associated document
            const newDocument = await tx.document.create({ data: newDocumentData });

            // 4. Create a secure log entry
            const logMessage = `Nouvel équipement '${component.id}' ajouté via provisionnement web.`;
            const logEntryData: LogEntryData = {
                timestamp: new Date(),
                type: 'DOCUMENT_ADDED',
                source: 'Provisioning Web', // Or get user from session
                message: logMessage,
                equipmentId: component.id,
            };

            // Get the last signature for chaining
            const lastLog = await tx.logEntry.findFirst({
                orderBy: { timestamp: 'desc' },
            });
            const previousSignature = lastLog?.signature ?? 'GENESIS';

            const signature = await createEntrySignature(logEntryData, previousSignature);
            
            const newLogEntry = await tx.logEntry.create({
                data: {
                    ...logEntryData,
                    signature,
                },
            });

            return { newEquipment, newDocument, newLogEntry };
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error('API Provisioning Error:', error);
        // Check for our custom transaction error
        if (error.message.includes('existe déjà')) {
             return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict
        }
        return NextResponse.json({ error: 'Erreur interne du serveur lors de la sauvegarde.' }, { status: 500 });
    }
}
