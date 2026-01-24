
import type { Database as DbInstance } from '@tauri-apps/api/sql';

let db: DbInstance | null = null;

export async function getDb(): Promise<DbInstance> {
  if (db) {
    return db;
  }

  // This check ensures we are in a Tauri environment before trying to import
  // and use the Tauri-specific API.
  if (typeof window === 'undefined' || !window.__TAURI__) {
    throw new Error("Database can only be accessed in a Tauri environment.");
  }

  // This is a workaround to prevent the Next.js bundler from trying to resolve
  // this module at build time. By constructing the module name dynamically,
  // we ensure it's only imported at runtime within the Tauri environment.
  const moduleName = 'tauri-plugin-sql';
  const { default: Database } = await import(moduleName);
  
  // This will load the database from the app's data directory.
  // The extension is important, otherwise it will be created as a directory.
  db = await Database.load('sqlite:ccpp.db');
  return db;
}
