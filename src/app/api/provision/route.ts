
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
    console.log('[PROVISION_API] Received POST request.');
    try {
        const body = await request.json();
        const { component, document } = body;
        console.log('[PROVISION_API] Parsed request body:', { component, document: { ...document, imageData: '...omitted...' }});

        if (!component || !document || !document.imageData || !document.perceptualHash) {
            console.error('[PROVISION_API] Validation failed: Component or document data is missing.', { hasComponent: !!component, hasDocument: !!document });
            return NextResponse.json({ error: 'Données invalides : composant ou document manquant.' }, { status: 400 });
        }
        
        // --- Handle optional fields ---
        const finalExternalId = component.externalId?.trim() || `PROV-${Date.now()}`;
        const finalName = component.name?.trim() || `Équipement non spécifié - ${finalExternalId}`;
        const finalType = component.type?.trim() || `INCONNU`;

        console.log('[PROVISION_API] Processed input data:', {
            originalId: component.externalId,
            finalId: finalExternalId,
            originalName: component.name,
            finalName: finalName,
            originalType: component.type,
            finalType: finalType,
        });

        const newEquipmentData = {
            externalId: finalExternalId,
            name: finalName,
            type: finalType,
            version: 1,
            isImmutable: false,
        };

        const newDocumentData = {
            equipmentId: finalExternalId, // Use the final ID
            imageData: document.imageData,
            ocrText: document.ocrText,
            description: document.description,
            perceptualHash: document.perceptualHash,
            createdAt: new Date(),
        };
        
        console.log('[PROVISION_API] Starting database transaction.');
        const result = await prisma.$transaction(async (tx) => {
            // 1. Check if equipment already exists
            console.log(`[PROVISION_API_TX] Checking for existing equipment with ID: ${finalExternalId}`);
            const existing = await tx.equipment.findUnique({
                where: { externalId: finalExternalId },
            });
            if (existing) {
                console.error(`[PROVISION_API_TX] Conflict: Equipment with ID '${finalExternalId}' already exists.`);
                // We throw an error to rollback the transaction
                throw new Error(`L'équipement avec l'ID '${finalExternalId}' existe déjà.`);
            }

            // 2. Create the new equipment
            console.log(`[PROVISION_API_TX] Creating equipment:`, newEquipmentData);
            const newEquipment = await tx.equipment.create({ data: newEquipmentData });

            // 3. Create the associated document
            console.log(`[PROVISION_API_TX] Creating document for equipment: ${finalExternalId}`);
            const newDocument = await tx.document.create({ data: newDocumentData });

            // 4. Create a secure log entry
            console.log(`[PROVISION_API_TX] Creating log entry for provisioning.`);
            const logMessage = `Nouvel équipement '${finalExternalId}' ajouté via provisionnement web.`;
            const logEntryData: LogEntryData = {
                timestamp: new Date(),
                type: 'DOCUMENT_ADDED',
                source: 'Provisioning Web', // Or get user from session
                message: logMessage,
                equipmentId: finalExternalId,
            };

            // Get the last signature for chaining
            const lastLog = await tx.logEntry.findFirst({
                orderBy: { timestamp: 'desc' },
            });
            const previousSignature = lastLog?.signature ?? 'GENESIS';
            console.log(`[PROVISION_API_TX] Previous log signature found: ${previousSignature.substring(0, 10)}...`);

            const signature = await createEntrySignature(logEntryData, previousSignature);
            console.log(`[PROVISION_API_TX] New log signature calculated: ${signature.substring(0, 10)}...`);
            
            const newLogEntry = await tx.logEntry.create({
                data: {
                    ...logEntryData,
                    signature,
                },
            });
            console.log(`[PROVISION_API_TX] Log entry created.`);

            console.log('[PROVISION_API] Transaction successful.');
            return { newEquipment, newDocument, newLogEntry };
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error('[PROVISION_API] Error during provisioning:', error);
        // Check for our custom transaction error
        if (error.message.includes('existe déjà')) {
             return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict
        }
        return NextResponse.json({ error: 'Erreur interne du serveur lors de la sauvegarde.' }, { status: 500 });
    }
}
