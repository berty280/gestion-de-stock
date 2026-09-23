import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { getDb, closeDb } from './connection.js';
import { runMigrations } from './migrate.js';
import { recordMovement } from '../services/stock.js';
import type { ProductSource } from '../types.js';

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

  seedDemoProducts();
}

interface DemoProduct {
  gtin: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  mini_vitrine: number;
  mini_stock: number;
  source: ProductSource;
  reception: number; // quantité reçue en stock
  reappro: number; // quantité déplacée vers la vitrine
}

const demoProducts: DemoProduct[] = [
  { gtin: '3600523351992', name: 'Savon de toilette', brand: 'Dove', category: 'Hygiène', unit: 'pièce', mini_vitrine: 2, mini_stock: 5, source: 'manuel', reception: 20, reappro: 6 },
  { gtin: '3574661648446', name: 'Crème hydratante visage', brand: 'Nivea', category: 'Cosmétique', unit: 'pièce', mini_vitrine: 1, mini_stock: 3, source: 'manuel', reception: 10, reappro: 3 },
  { gtin: '8001090382948', name: 'Shampooing anti-pelliculaire', brand: 'Head & Shoulders', category: 'Hygiène', unit: 'pièce', mini_vitrine: 2, mini_stock: 4, source: 'manuel', reception: 12, reappro: 4 },
  { gtin: '3014260228187', name: 'Dentifrice protection caries', brand: 'Signal', category: 'Hygiène', unit: 'pièce', mini_vitrine: 3, mini_stock: 6, source: 'manuel', reception: 8, reappro: 2 },
  { gtin: '3600542525893', name: 'Gel douche fraîcheur', brand: 'Ushuaïa', category: 'Hygiène', unit: 'pièce', mini_vitrine: 2, mini_stock: 5, source: 'manuel', reception: 4, reappro: 3 },
];

/** Insert a small demo catalogue with realistic stock, only if none exists yet. */
function seedDemoProducts(): void {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n;
  if (count > 0) {
    console.log('Products already present — skipping demo catalogue.');
    return;
  }

  const admin = db.prepare("SELECT id FROM users WHERE role='ADMIN' LIMIT 1").get() as
    | { id: number }
    | undefined;
  const userId = admin?.id ?? 1;

  const seedOne = db.transaction((p: DemoProduct) => {
    const info = db
      .prepare(
        `INSERT INTO products (gtin, name, brand, category, unit, mini_vitrine, mini_stock, source)
         VALUES (@gtin, @name, @brand, @category, @unit, @mini_vitrine, @mini_stock, @source)`,
      )
      .run(p);
    const productId = Number(info.lastInsertRowid);
    // Réception en réserve, puis réappro d'une partie vers la vitrine.
    recordMovement(db, { productId, type: 'RECEPTION', quantity: p.reception, to: 'STOCK', userId });
    if (p.reappro > 0) {
      recordMovement(db, {
        productId,
        type: 'REAPPRO',
        quantity: p.reappro,
        from: 'STOCK',
        to: 'VITRINE',
        userId,
      });
    }
  });

  for (const p of demoProducts) seedOne(p);
  console.log(`Seeded ${demoProducts.length} demo products with initial stock.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
  closeDb();
}
