// src/lib/prisma/seedPidNodes.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_PID_NODES = [
  {
    external_id: "B3.CEX3",
    name: "CEX3-001",
    type: "equipment",
    parent_id: "B3",
    path: "B3/CEX3-001",
    level: 1,
    description: "Condenseur basse pression",
    standard_refs: ["IEC 61511-3", "ISO 55001"],
    approved_by: "INGENIEUR-PID-SOUSSE",
    approval_date: new Date("2026-01-27"),
  },
  {
    external_id: "B3.BA",
    name: "BACHE ALIMENTAIRE",
    type: "equipment",
    parent_id: "B3",
    path: "B3/BACHE ALIMENTAIRE",
    level: 1,
    description: "Réservoir eau alimentaire",
    standard_refs: ["IEC 61511-3", "ISO 55001"],
    approved_by: "INGENIEUR-PID-SOUSSE",
    approval_date: new Date("2026-01-27"),
  },
  {
    external_id: "B3.PEX",
    name: "POMPES D'EXTRACTION",
    type: "equipment",
    parent_id: "B3",
    path: "B3/POMPES D'EXTRACTION",
    level: 1,
    description: "Pompes extraction condensat",
    standard_refs: ["IEC 61511-3", "ISO 55001"],
    approved_by: "INGENIEUR-PID-SOUSSE",
    approval_date: new Date("2026-01-27"),
  },
  {
    external_id: "B3.PR",
    name: "POMPES DE REFRIGERATION",
    type: "equipment",
    parent_id: "B3",
    path: "B3/POMPES DE REFRIGERATION",
    level: 1,
    description: "Pompes refroidissement auxiliaire",
    standard_refs: ["IEC 61511-3", "ISO 55001"],
    approved_by: "INGENIEUR-PID-SOUSSE",
    approval_date: new Date("2026-01-27"),
  },
];

export async function seedPidNodes() {
  for (const node of NEW_PID_NODES) {
    await prisma.functionalNode.upsert({
      where: { external_id: node.external_id },
      update: {},
      create: node,
    });
  }
  console.log("✅ 4 nouveaux nœuds P&ID ajoutés à la base.");
}