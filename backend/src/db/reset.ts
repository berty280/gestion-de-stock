import { existsSync, rmSync } from 'node:fs';
import { config } from '../config.js';
import { closeDb } from './connection.js';
import { runMigrations } from './migrate.js';
import { seed } from './seed.js';

// Dangerous convenience for local dev: delete the DB file, re-migrate, re-seed.
for (const suffix of ['', '-wal', '-shm']) {
  const file = config.databasePath + suffix;
  if (existsSync(file)) rmSync(file);
}
console.log(`Removed database at ${config.databasePath}`);

runMigrations();
seed();
closeDb();
