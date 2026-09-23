import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { getDb, closeDb } from './connection.js';
import { runMigrations } from './migrate.js';

type Role = 'OPERATOR' | 'ADMIN' | 'SUPERVISOR';

interface SeedUser {
  name: string;
  email: string;
  role: Role;
}

// One account per role (see docs/SPEC.md §5 "Rôles & permissions").
const seedUsers: SeedUser[] = [
  { name: 'Opérateur Démo', email: 'operator@comptoir.local', role: 'OPERATOR' },
  { name: 'Admin Démo', email: 'admin@comptoir.local', role: 'ADMIN' },
  { name: 'Superviseur Démo', email: 'supervisor@comptoir.local', role: 'SUPERVISOR' },
];

export function seed(): void {
  const db = getDb();

  // Make sure the schema exists before seeding.
  runMigrations(db);

  const passwordHash = bcrypt.hashSync(config.seedDefaultPassword, 10);

  // Idempotent: insert by email, refresh name/role/hash if the row already exists.
  const upsert = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, active)
    VALUES (@name, @email, @passwordHash, @role, 1)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      password_hash = excluded.password_hash,
      active = 1
  `);

  const insertMany = db.transaction((users: SeedUser[]) => {
    for (const u of users) {
      upsert.run({ ...u, passwordHash });
    }
  });

  insertMany(seedUsers);

  console.log('Seeded users (password for all: from SEED_DEFAULT_PASSWORD):');
  for (const u of seedUsers) {
    console.log(`  - ${u.role.padEnd(10)} ${u.email}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
  closeDb();
}
