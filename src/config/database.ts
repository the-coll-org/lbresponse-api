import Database from 'better-sqlite3';
import path from 'path';

const defaultPath = path.resolve(
  process.cwd(),
  '../lbresponse-scrapper/lbresponse.db'
);
const DB_PATH = process.env.DATABASE_PATH || defaultPath;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
