import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

let db: Database.Database | null = null;

/**
 * Returns the shared SQLite connection, creating it (and the data directory)
 * on first use. SQLite is the source-of-truth store for the MVP (single shop);
 * migration to Postgres later is straightforward.
 */
export function getDb(): Database.Database {
  if (db) return db;

  mkdirSync(dirname(config.databasePath), { recursive: true });

  db = new Database(config.databasePath);
  // WAL improves concurrent read/write behaviour for a small multi-user shop.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
