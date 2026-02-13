// Ce fichier de configuration assure la compatibilité entre Next.js et Prisma CLI.
import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
import * as path from "path";

// Prisma CLI ne charge pas automatiquement le fichier `.env.local` utilisé par Next.js.
// Ce script le charge manuellement pour s'assurer que les commandes comme `prisma db push`
// peuvent accéder à la bonne URL de base de données.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });


export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Nous ne redéfinissons pas la source de données ici. Prisma la lira depuis le schéma
  // une fois que ce fichier de configuration aura chargé les variables d'environnement.
});
