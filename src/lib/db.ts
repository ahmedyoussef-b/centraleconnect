import Database from 'tauri-plugin-sql-api';

let db: Database | null = null;

export async function getDb() {
  if (db) {
    return db;
  }
  // This will load the database from the app's data directory.
  // The extension is important, otherwise it will be created as a directory.
  db = await Database.load('sqlite:ccpp.db');
  return db;
}
