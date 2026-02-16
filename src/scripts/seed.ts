#!/usr/bin/env tsx

// --- Load environment variables from .env.local ---
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
// --- End of environment variable loading ---

import { createHash } from 'crypto';

// Import JSON data
import componentsData from '../assets/master-data/components.json' assert { type: 'json' };
import parameterData from '../assets/master-data/parameters.json' assert { type: 'json' };
import alarmData from '../assets/master-data/alarms.json' assert { type: 'json' };
import pidAssetsData from '../assets/master-data/pid-assets.json' assert { type: 'json' };
import groupsData from '../assets/master-data/groups.json' assert { type: 'json' };
import b0Data from '../assets/master-data/B0.json' assert { type: 'json' };
import b1Data from '../assets/master-data/B1.json' assert { type: 'json' };
import b2Data from '../assets/master-data/B2.json' assert { type: 'json' };
import b3Data from '../assets/master-data/B3.json' assert { type: 'json' };
import c0Data from '../assets/master-data/C0.json' assert { type: 'json' };
import proceduresData from '../assets/master-data/procedures.json' assert { type: 'json' };
import tg1Data from '../assets/master-data/TG1.json' assert { type: 'json' };
import tg2Data from '../assets/master-data/TG2.json' assert { type: 'json' };

async function main() {
  // Dynamically import PrismaClient AFTER dotenv has loaded the environment variables
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Démarrage de l\'initialisation de la base de données...');

    // 1. Nettoyer la base de données
    console.log('🗑️  Nettoyage des données existantes...');
    await prisma.logEntry.deleteMany({});
    await prisma.annotation.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.alarmEvent.deleteMany({});
    await prisma.scadaData.deleteMany({});
    await prisma.parameter.deleteMany({});
    await prisma.alarm.deleteMany({});
    await prisma.equipment.deleteMany({});
    await prisma.synopticItem.deleteMany({});
    await prisma.procedure.deleteMany({});
    console.log('✅ Base de données nettoyée.');

    // 2. Initialiser les équipements
    console.log('🌱 Initialisation des équipements...');
    const allEquipments = new Map<string, any>();

    const createChecksum = (data: any): string => {
      return createHash('sha256').update(JSON.stringify(data)).digest('hex');
    };

    const detailedData = [...c0Data, ...b0Data, ...b1Data, ...b2Data, ...b3Data, ...pidAssetsData.nodes, ...componentsData, ...tg1Data, ...tg2Data];

    for (const item of detailedData as any[]) {
      const id = item.externalId || item.tag;
      if (!id) continue;
      
      const existing = allEquipments.get(id) || { externalId: id };
      
      const mergedItem = {
        ...existing,
        name: item.name || item.label_fr || existing.name || 'N/A',
        description: item.description || existing.description,
        type: item.type || existing.type,
        subtype: item.subtype || existing.subtype,
        parentId: item.parentId || item.parent_id || existing.parentId,
        systemCode: item.systemCode || item.system || existing.systemCode,
        subSystem: item.subsystem || existing.subSystem,
        location: item.location || existing.location,
        manufacturer: item.manufacturer || existing.manufacturer,
        serialNumber: item.serialNumber || existing.serialNumber,
        documentRef: item.document || existing.documentRef,
        coordinates: JSON.stringify(item.coordinates) || existing.coordinates,
        svgLayer: item.svg_layer || existing.svgLayer,
        fireZone: item.fire_zone || existing.fireZone,
        linkedParameters: JSON.stringify(item.linked_parameters) || existing.linkedParameters,
        status: item.status || existing.status || 'UNKNOWN',
        approvedBy: item.approved_by || item.approvedBy || existing.approvedBy,
        approvedAt: item.approved_at || item.approval_date || existing.approvedAt ? new Date(item.approved_at || item.approval_date || existing.approvedAt) : null,
        parameters: item.parameters || existing.parameters, // Store temporarily
      };
      allEquipments.set(id, mergedItem);
    }

    for (const equip of Array.from(allEquipments.values())) {
        const { parameters, ...equipData } = equip;
        const checksum = createChecksum(equipData);
        
        await prisma.equipment.create({
            data: {
                ...equipData,
                checksum: checksum,
                approvedAt: equipData.approvedAt,
            }
        });
    }
    console.log(`✅ ${allEquipments.size} équipements initialisés.`);

    // 3. Initialiser les paramètres
    console.log('🌱 Initialisation des paramètres...');
    const allParams = new Set<string>();

    for (const equip of Array.from(allEquipments.values())) {
      if(equip.parameters && Array.isArray(equip.parameters)) {
        for(const param of equip.parameters as any[]) {
          const paramKey = `${equip.externalId}::${param.name}`;
          if (allParams.has(paramKey)) continue;

          await prisma.parameter.create({
              data: {
                equipmentId: equip.externalId,
                name: param.name,
                unit: param.unit,
                nominalValue: typeof param.value === 'number' ? param.value : null,
                minSafe: typeof param.min === 'number' ? param.min : null,
                maxSafe: typeof param.max === 'number' ? param.max : null,
              }
          });
          allParams.add(paramKey);
        }
      }
    }

    for (const param of parameterData as any[]) {
        const paramKey = `${param.componentTag}::${param.name}`;
        if (allParams.has(paramKey)) continue;
        
        await prisma.parameter.create({
            data: {
              equipmentId: param.componentTag,
              name: param.name,
              unit: param.unit,
              nominalValue: param.nominalValue,
              minSafe: param.minSafe,
              maxSafe: param.maxSafe,
              alarmHigh: param.alarmHigh,
              alarmLow: param.alarmLow,
              standardRef: param.standardRef,
            }
        });
        allParams.add(paramKey);
    }
    console.log(`✅ ${allParams.size} paramètres initialisés.`);

    // 4. Initialiser les alarmes
    console.log('🌱 Initialisation des alarmes...');
    for (const alarm of alarmData as any[]) {
        await prisma.alarm.create({
            data: {
                code: alarm.code,
                equipmentId: alarm.componentTag,
                severity: alarm.severity,
                description: alarm.message,
                parameter: alarm.parameter,
                resetProcedure: alarm.reset_procedure,
                standardRef: alarm.standardRef,
            }
        });
    }
    console.log(`✅ ${alarmData.length} alarmes initialisées.`);

    // 5. Initialiser les vues synoptiques
    console.log('🌱 Initialisation des vues synoptiques...');
    for (const item of groupsData as any[]) {
        await prisma.synopticItem.create({
            data: {
              externalId: item.external_id,
              name: item.name,
              type: item.type,
              parentId: item.parent_id,
              groupPath: item.group_path,
              elementId: item.element_id,
              level: item.level,
              approvedBy: item.approved_by,
              approvalDate: item.approval_date,
            }
        });
    }
    console.log(`✅ ${groupsData.length} vues synoptiques initialisées.`);

    // 6. Initialiser les procédures
    console.log('🌱 Initialisation des procédures...');
    for (const proc of proceduresData as any[]) {
      await prisma.procedure.create({
        data: {
          id: proc.id,
          name: proc.name,
          description: proc.description,
          version: proc.version,
          category: proc.category,
          steps: proc.steps, // Pass the JSON object directly
        }
      });
    }
    console.log(`✅ ${proceduresData.length} procédures initialisées.`);
    
  } catch (e) {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🎉 Initialisation terminée !');
  }
}

main();
