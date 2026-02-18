
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createHash } from 'crypto';

interface ProvisionPayload {
    component: {
        externalId: string;
        name: string;
        type: string;
    };
    document: {
        imageData: string;
        ocrText: string;
        description: string;
        perceptualHash: string;
    };
}

// Helper to create checksum for equipment
const createChecksum = (data: any): string => {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

export async function POST(req: NextRequest) {
    try {
        const payload: ProvisionPayload = await req.json();
        const { component, document } = payload;
        
        if (!component || !document) {
            return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
        }
        
        const checksum = createChecksum(component);

        // Use a transaction to ensure both operations succeed or fail together
        const result = await prisma.$transaction(async (tx) => {
            const upsertedEquipment = await tx.equipment.upsert({
                where: { externalId: component.externalId },
                update: {
                    name: component.name,
                    type: component.type,
                    checksum: checksum,
                },
                create: {
                    externalId: component.externalId,
                    name: component.name,
                    type: component.type,
                    checksum: checksum,
                    version: 1,
                    isImmutable: false,
                }
            });

            const createdDocument = await tx.document.create({
                data: {
                    equipmentId: upsertedEquipment.externalId,
                    imageData: document.imageData,
                    ocrText: document.ocrText,
                    description: document.description,
                    perceptualHash: document.perceptualHash,
                }
            });

            return { upsertedEquipment, createdDocument };
        });
        
        // Ensure date fields are serialized to strings
        const serializableResult = {
            ...result,
            createdDocument: {
                ...result.createdDocument,
                createdAt: result.createdDocument.createdAt.toISOString(),
            },
            upsertedEquipment: {
                ...result.upsertedEquipment,
                approvedAt: result.upsertedEquipment.approvedAt?.toISOString(),
                commissioningDate: result.upsertedEquipment.commissioningDate?.toISOString(),
            }
        };

        return NextResponse.json({ success: true, ...serializableResult }, { status: 201 });

    } catch (error) {
        console.error('[API Provision] Error during provisioning:', error);
        return NextResponse.json(
          { error: 'Failed to provision new equipment and document.' },
          { status: 500 }
        );
    }
}
