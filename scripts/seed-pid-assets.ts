#!/usr/bin/env tsx
/**
 * Script corrigé pour l'injection des données Master Data
 * Compatible avec le modèle Prisma Equipment
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Données corrigées - structure adaptée au modèle Prisma
const COMPONENTS_DATA = [
  {
    externalId: "TG1",
    name: "Turbine à gaz 1",
    type: "GAS_TURBINE",
    subtype: "Heavy-duty",
    manufacturer: "Siemens",
    serialNumber: "SGT5-4000F-001",
    location: "Bloc A - Niveau 2"
  },
  {
    externalId: "TG2",
    name: "Turbine à gaz 2",
    type: "GAS_TURBINE",
    subtype: "Heavy-duty",
    manufacturer: "Siemens",
    serialNumber: "SGT5-4000F-002",
    location: "Bloc A - Niveau 2"
  },
  {
    externalId: "HRSG1",
    name: "Chaudière récupératrice TG1",
    type: "HRSG",
    subtype: "Triple-pressure",
    manufacturer: "NEM",
    serialNumber: "HRSG-TG1-2020",
    location: "Bloc A - Niveau 1"
  },
  {
    externalId: "HRSG2",
    name: "Chaudière récupératrice TG2",
    type: "HRSG",
    subtype: "Triple-pressure",
    manufacturer: "NEM",
    serialNumber: "HRSG-TG2-2020",
    location: "Bloc A - Niveau 1"
  },
  {
    externalId: "TV",
    name: "Turbine à vapeur",
    type: "STEAM_TURBINE",
    subtype: "Condensing-reheat",
    manufacturer: "Siemens",
    serialNumber: "SST-900-001",
    location: "Bloc A - Niveau 1"
  },
  {
    externalId: "CR1",
    name: "Condenseur 1",
    type: "CONDENSER",
    subtype: "Surface",
    manufacturer: "Alstom",
    serialNumber: null,
    location: "Bloc A - Sous-sol"
  },
  {
    externalId: "CR2",
    name: "Condenseur 2",
    type: "CONDENSER",
    subtype: "Surface",
    manufacturer: "Alstom",
    serialNumber: null,
    location: "Bloc A - Sous-sol"
  },
  {
    externalId: "PUMP-FEEDWATER-01",
    name: "Pompe d'alimentation chaudière 1",
    type: "PUMP",
    subtype: "Centrifugal-multistage",
    manufacturer: "KSB",
    serialNumber: null,
    location: "Bloc A - Niveau 0"
  },
  {
    externalId: "VALVE-BYPASS-HRSG1",
    name: "Vanne de bypass HRSG1",
    type: "VALVE",
    subtype: "Butterfly-control",
    manufacturer: "Flowserve",
    serialNumber: null,
    location: "HRSG1 - Sortie vapeur"
  },
  {
    externalId: "B3PE11",
    name: "Point d'eau 11 - Pression entrée",
    type: "SENSOR",
    subtype: "Pressure",
    manufacturer: "Endress+Hauser",
    serialNumber: null,
    location: "Poste d'eau - Entrée circuit principal"
  },
  {
    externalId: "B3PE20",
    name: "Point d'eau 20 - Température sortie",
    type: "SENSOR",
    subtype: "Temperature",
    manufacturer: "Rosemount",
    serialNumber: null,
    location: "Poste d'eau - Sortie circuit secondaire"
  },
  {
    externalId: "CEX3-001",
    name: "Condenseur basse pression",
    type: "CONDENSER",
    subtype: "P&ID Mapped",
    manufacturer: "",
    serialNumber: "",
    location: "B3"
  },
  {
    externalId: "BACHE-ALIMENTAIRE",
    name: "Réservoir eau alimentaire",
    type: "TANK",
    subtype: "P&ID Mapped",
    manufacturer: "",
    serialNumber: "",
    location: "B3"
  },
  {
    externalId: "POMPES-DEXTRACTION",
    name: "Pompes extraction condensat",
    type: "PUMP",
    subtype: "P&ID Mapped",
    manufacturer: "",
    serialNumber: "",
    location: "B3"
  },
  {
    externalId: "POMPES-DE-REFRIGERATION",
    name: "Pompes refroidissement auxiliaire",
    type: "PUMP",
    subtype: "P&ID Mapped",
    manufacturer: "",
    serialNumber: "",
    location: "B3"
  }
];

async function main() {
  console.log('🚀 [SEED] Démarrage de l\'injection des données de référence (Master Data)...');
  
  try {
    // Le script de seed principal (seed.ts) est responsable du nettoyage complet.
    // L'instruction deleteMany est commentée pour éviter toute suppression accidentelle.
    // await prisma.equipment.deleteMany();

    // Injection des composants
    console.log('🌱 Injection des Composants...');
    
    for (const component of COMPONENTS_DATA) {
      // Génération du checksum
      const checksum = createHash('sha256')
        .update(JSON.stringify(component))
        .digest('hex');
      
      await prisma.equipment.upsert({
        where: { externalId: component.externalId },
        update: {
          name: component.name,
          type: component.type,
          subtype: component.subtype,
          manufacturer: component.manufacturer || null,
          serialNumber: component.serialNumber || null,
          location: component.location || null,
          checksum: checksum,
        },
        create: {
          externalId: component.externalId,
          name: component.name,
          type: component.type,
          subtype: component.subtype,
          systemCode: "LEGACY", // Système par défaut
          manufacturer: component.manufacturer || null,
          serialNumber: component.serialNumber || null,
          location: component.location || null,
          version: 1,
          isImmutable: false,
          checksum: checksum,
        }
      });
    }
    
    console.log(`✅ ${COMPONENTS_DATA.length} composants injectés/mis à jour avec succès.`);
    console.log('🎉 Seeding terminé avec succès !');

  } catch (error) {
    console.error('❌ [ERREUR FATALE LORS DU SEEDING]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
