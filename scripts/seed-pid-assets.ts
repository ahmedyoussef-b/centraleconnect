/**
 * Script d'injection complet des données de référence (Master Data) dans la base de données.
 * A utiliser pour un environnement de développement Node.js.
 * 
 * Exécution : `npm run db:seed`
 * 
 * Ce script va :
 * 1. Supprimer toutes les données des tables concernées pour garantir un état propre.
 * 2. Injecter les composants depuis `components.json`.
 * 3. Injecter les paramètres depuis `parameters.json`.
 * 4. Injecter les alarmes depuis `alarms.json`.
 * 5. Injecter les noeuds fonctionnels P&ID depuis `pid-assets.json` avec un checksum.
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper function to read JSON master data
function readMasterData(filename: string): any {
    const filePath = path.join(__dirname, '../src/assets/master-data/', filename);
    const rawData = readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
}


async function main() {
  console.log('🚀 [SEED] Démarrage de l\'injection des données de référence (Master Data)...');

  // Charger toutes les données
  const componentsData = readMasterData('components.json');
  const parameterData = readMasterData('parameters.json');
  const alarmData = readMasterData('alarms.json');
  const pidAssetsData = readMasterData('pid-assets.json');

  // 1. Nettoyage des tables
  console.log('🗑️  Nettoyage des tables existantes (ordre respectant les contraintes)...');
  await prisma.annotation.deleteMany({});
  await prisma.logEntry.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.alarm.deleteMany({});
  await prisma.parameter.deleteMany({});
  await prisma.component.deleteMany({});
  await prisma.functionalNode.deleteMany({});
  console.log('✅ Tables nettoyées.');

  // 2. Injection des composants
  console.log('🌱 Injection des Composants...');
  await prisma.component.createMany({
    data: componentsData.map((c: any) => ({
        tag: c.tag,
        name: c.name,
        type: c.type,
        subtype: c.subtype,
        manufacturer: c.manufacturer,
        serialNumber: c.serialNumber,
        location: c.location,
    })),
  });
  console.log(`   ✅ ${componentsData.length} composants injectés.`);
  
  // 3. Injection des paramètres
  console.log('🌱 Injection des Paramètres...');
  await prisma.parameter.createMany({
    data: parameterData.map((p: any) => ({
        component_tag: p.componentTag,
        key: p.key,
        name: p.name,
        unit: p.unit,
        nominal_value: p.nominalValue,
        min_safe: p.minSafe,
        max_safe: p.maxSafe,
        alarm_high: p.alarmHigh,
        alarm_low: p.alarmLow,
        standard_ref: p.standardRef,
    })),
  });
  console.log(`   ✅ ${parameterData.length} paramètres injectés.`);

  // 4. Injection des alarmes
  console.log('🌱 Injection des Alarmes...');
  await prisma.alarm.createMany({
    data: alarmData.map((a: any) => ({
        code: a.code,
        component_tag: a.componentTag,
        severity: a.severity,
        description: a.message,
        parameter: a.parameter,
        reset_procedure: a.reset_procedure,
        standard_ref: a.standardRef,
    })),
  });
  console.log(`   ✅ ${alarmData.length} alarmes injectées.`);


  // 5. Injection des noeuds fonctionnels P&ID
  console.log('🌱 Injection des Nœuds Fonctionnels (P&ID)...');
  const nodesArray = Array.isArray(pidAssetsData.nodes) ? pidAssetsData.nodes : [];
  let successCount = 0;
  
  for (const node of nodesArray) {
    const nodeToHash = {
        external_id: node.external_id, system: node.system, subsystem: node.subsystem,
        document: node.document, tag: node.tag, type: node.type, name: node.name,
        description: node.description, location: node.location, coordinates: node.coordinates,
        linked_parameters: node.linked_parameters, svg_layer: node.svg_layer,
        fire_zone: node.fire_zone, status: node.status,
    };
    const checksum = createHash('sha256').update(JSON.stringify(nodeToHash)).digest('hex');

    await prisma.functionalNode.create({
      data: {
          ...nodeToHash,
          coordinates: JSON.stringify(node.coordinates),
          linked_parameters: JSON.stringify(node.linked_parameters),
          checksum: checksum,
      },
    });
    successCount++;
  }
  console.log(`   ✅ ${successCount} nœuds fonctionnels injectés.`);


  console.log('\n🎉 [SEED] Injection terminée avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ [ERREUR FATALE LORS DU SEEDING]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
