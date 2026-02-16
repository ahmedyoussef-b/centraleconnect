// prisma.config.ts - Version compatible avec Prisma 5/6
import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Chargement des variables d'environnement
function loadEnvFiles() {
  const envFiles = [
    '.env.local',
    '.env',
  ];

  for (const envFile of envFiles) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      console.log(`📁 Chargement: ${envFile}`);
      dotenv.config({ path: envPath });
      break;
    }
  }

  if (!process.env.DATABASE_URL_REMOTE) {
    console.error('❌DATABASE_URL_REMOTE non définie!');
    process.exit(1);
  }
}

loadEnvFiles();

// La configuration correcte pour Prisma 5/6
export default defineConfig({
  // Seulement ces propriétés sont autorisées
  schema: "prisma/schema.prisma",
  
  // Optionnel: pour les migrations
  migrations: {
    path: "prisma/migrations",
  },
  
  // Pas de 'earlyAccess', pas de 'generator' ici
  // Tout se configure dans schema.prisma
});