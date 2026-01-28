#!/usr/bin/env tsx
/**
 * Script unifié pour l'injection des données Master Data.
 * Nettoie et remplit toutes les tables de référence.
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

// Importer les données JSON
import componentsData from '../src/assets/master-data/components.json';
import parametersData from '../src/assets/master-data/parameters.json';
import alarmsData from '../src/assets/master-data/alarms.json';
import pidAssetsData from '../src/assets/master-data/pid-assets.json';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 [SEED] Démarrage de l\'injection des données de référence (Master Data)...');

  try {
    // Nettoyage des tables existantes pour une réinitialisation propre
    console.log('🗑️  Nettoyage des tables existantes...');
    // L'ordre est important à cause des clés étrangères
    await prisma.annotation.deleteMany();
    await prisma.logEntry.deleteMany();
    await prisma.document.deleteMany();
    await prisma.alarm.deleteMany();
    await prisma.parameter.deleteMany();
    await prisma.functionalNode.deleteMany();
    await prisma.component.deleteMany();
    console.log('✅ Tables nettoyées.');

    // 1. Injection des Composants (Component)
    console.log('🌱 1/4: Injection des Composants...');
    for (const comp of componentsData as any[]) {
      await prisma.component.create({
        data: {
          tag: comp.tag,
          name: comp.name,
          type: comp.type,
          subtype: comp.subtype,
          manufacturer: comp.manufacturer,
          serialNumber: comp.serialNumber,
          location: comp.location,
        },
      });
    }
    console.log(`✅ ${componentsData.length} composants injectés.`);

    // 2. Injection des Paramètres (Parameter)
    console.log('🌱 2/4: Injection des Paramètres...');
    for (const param of parametersData as any[]) {
      await prisma.parameter.create({
        data: {
          component_tag: param.componentTag,
          key: param.key,
          name: param.name,
          unit: param.unit,
          nominal_value: param.nominalValue,
          min_safe: param.minSafe,
          max_safe: param.maxSafe,
          alarm_high: param.alarmHigh,
          alarm_low: param.alarmLow,
          standard_ref: param.standardRef,
        },
      });
    }
    console.log(`✅ ${parametersData.length} paramètres injectés.`);
    
    // 3. Injection des Alarmes (Alarm)
    console.log('🌱 3/4: Injection des Alarmes...');
    for (const alarm of alarmsData as any[]) {
      await prisma.alarm.create({
        data: {
          code: alarm.code,
          component_tag: alarm.componentTag,
          severity: alarm.severity,
          description: alarm.message,
          parameter: alarm.parameter,
          reset_procedure: alarm.reset_procedure,
          standard_ref: alarm.standardRef,
        },
      });
    }
    console.log(`✅ ${alarmsData.length} alarmes injectées.`);

    // 4. Injection des Nœuds Fonctionnels P&ID (FunctionalNode)
    console.log('🌱 4/4: Injection des Nœuds Fonctionnels P&ID...');
    const nodesArray = Array.isArray((pidAssetsData as any).nodes) ? (pidAssetsData as any).nodes : [];
    for (const node of nodesArray) {
        const nodeToHash = {
            external_id: node.external_id, system: node.system, subsystem: node.subsystem,
            document: node.document, tag: node.tag, type: node.type, name: node.name,
            description: node.description, location: node.location, coordinates: node.coordinates,
            linked_parameters: node.linked_parameters, svg_layer: node.svg_layer,
            fire_zone: node.fire_zone, status: node.status,
        };
        const checksum = createHash('sha256').update(JSON.stringify(nodeToHash)).digest('hex');
        const now = new Date();

        await prisma.functionalNode.create({
            data: {
                external_id: node.external_id,
                system: node.system,
                subsystem: node.subsystem,
                document: node.document,
                tag: node.tag,
                type: node.type,
                name: node.name,
                description: node.description,
                location: node.location,
                coordinates: JSON.stringify(node.coordinates),
                linked_parameters: JSON.stringify(node.linked_parameters),
                svg_layer: node.svg_layer,
                fire_zone: node.fire_zone,
                status: node.status,
                checksum: checksum,
                created_at: now,
                updated_at: now,
                approved_by: (pidAssetsData as any).approved_by,
                approved_at: (pidAssetsData as any).approved_at ? new Date((pidAssetsData as any).approved_at) : null,
            }
        });
    }
    console.log(`✅ ${nodesArray.length} nœuds fonctionnels injectés.`);


    console.log('🎉 Seeding terminé avec succès !');

  } catch (error) {
    console.error('❌ [ERREUR FATALE LORS DU SEEDING]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
