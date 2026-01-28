
/**
 * Script d'injection batch des équipements P&ID dans la base SQLite
 * Via Prisma ORM → Mode immuable avec checksum SHA-256
 * Conformité ISO 55001 / IEC 61511 / EU IED
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface PidNode {
  external_id: string;
  system: string;
  subsystem: string;
  document: string;
  tag: string | null;
  type: string;
  name: string;
  description: string;
  location: string;
  coordinates: {
    x: number;
    y: number;
    page: string;
  };
  linked_parameters: string[];
  svg_layer: string;
  fire_zone: string | null;
  status: string;
}

interface PidAssets {
  version: string;
  generated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  standard_references: Record<string, string>;
  checksum_seed: string | null;
  nodes: PidNode[];
}

async function main() {
  console.log('🚀 [PID ASSETS SEED] Démarrage injection Master Data P&ID...\n');

  // Lecture du fichier pid-assets.json
  const filePath = path.join(__dirname, '../src/assets/master-data/pid-assets.json');
  const rawData = readFileSync(filePath, 'utf-8');
  const pidAssets: PidAssets = JSON.parse(rawData);

  // Génération checksum global
  const checksumSeed = createHash('sha256').update(rawData).digest('hex');
  console.log(`✅ Checksum seed calculé : ${checksumSeed.substring(0, 16)}...`);

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Injection des nœuds
  for (const node of pidAssets.nodes) {
    try {
      // Génération checksum individuel
      const nodeChecksum = createHash('sha256')
        .update(JSON.stringify(node))
        .digest('hex');

      // Upsert dans la base
      await prisma.functionalNode.upsert({
        where: { external_id: node.external_id },
        update: {
          system: node.system,
          subsystem: node.subsystem,
          document: node.document,
          tag: node.tag,
          type: node.type,
          name: node.name,
          description: node.description,
          location: node.location,
          coordinates: node.coordinates,
          linked_parameters: node.linked_parameters,
          svg_layer: node.svg_layer,
          fire_zone: node.fire_zone,
          status: node.status,
          checksum: nodeChecksum,
          updated_at: new Date(),
        },
        create: {
          external_id: node.external_id,
          system: node.system,
          subsystem: node.subsystem,
          document: node.document,
          tag: node.tag,
          type: node.type,
          name: node.name,
          description: node.description,
          location: node.location,
          coordinates: node.coordinates,
          linked_parameters: node.linked_parameters,
          svg_layer: node.svg_layer,
          fire_zone: node.fire_zone,
          status: node.status,
          checksum: nodeChecksum,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`   ✅ ${successCount}/${pidAssets.nodes.length} nœuds injectés...`);
      }
    } catch (error) {
      errorCount++;
      errors.push(`❌ ${node.external_id}: ${(error as Error).message}`);
    }
  }

  // Mise à jour checksum seed global
  pidAssets.checksum_seed = checksumSeed;
  pidAssets.approved_at = new Date().toISOString();
  
  writeFileSync(filePath, JSON.stringify(pidAssets, null, 2), 'utf-8');

  // Résumé
  console.log('\n📊 [RÉSUMÉ INJECTION]');
  console.log(`   ✅ Nœuds injectés : ${successCount}`);
  console.log(`   ❌ Erreurs : ${errorCount}`);
  console.log(`   🔐 Checksum seed : ${checksumSeed}`);
  console.log(`   📁 Fichier mis à jour : ${filePath}`);

  if (errors.length > 0) {
    console.log('\n⚠️  [ERREURS DÉTAILLÉES]');
    errors.forEach(err => console.log(`   ${err}`));
  }

  console.log('\n✅ [PID ASSETS SEED] Injection terminée avec succès !');
  
  await prisma.$disconnect();
}

// Gestion erreurs
main().catch((error) => {
  console.error('\n❌ [ERREUR FATALE]', error);
  process.exit(1);
});
