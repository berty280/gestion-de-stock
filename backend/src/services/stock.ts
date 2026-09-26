import type Database from 'better-sqlite3';
import { conflict, notFound } from '../lib/errors.js';
import type {
  AlertRow,
  AlertType,
  Location,
  MovementRow,
  MovementType,
  ProductRow,
} from '../types.js';

export interface MovementInput {
  productId: number;
  type: MovementType;
  quantity: number;
  from?: Location | null;
  to?: Location | null;
  userId: number;
  saleId?: number | null;
  scanUid?: string | null;
}

export interface MovementResult {
  movement: MovementRow;
  idempotent: boolean;
  /** Alerts newly opened by this movement (used to trigger emails after commit). */
  openedAlerts: AlertRow[];
}

export function getLevel(db: Database.Database, productId: number, location: Location): number {
  const row = db
    .prepare('SELECT quantity FROM stock_levels WHERE product_id = ? AND location = ?')
    .get(productId, location) as { quantity: number } | undefined;
  return row?.quantity ?? 0;
}

function setLevel(
  db: Database.Database,
  productId: number,
  location: Location,
  quantity: number,
): void {
  db.prepare(
    `INSERT INTO stock_levels (product_id, location, quantity)
     VALUES (?, ?, ?)
     ON CONFLICT(product_id, location) DO UPDATE SET quantity = excluded.quantity`,
  ).run(productId, location, quantity);
}

function getProduct(db: Database.Database, productId: number): ProductRow {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as
    | ProductRow
    | undefined;
  if (!product) throw notFound('Produit introuvable');
  return product;
}

function ensureOpenAlert(
  db: Database.Database,
  productId: number,
  type: AlertType,
): AlertRow | null {
  const existing = db
    .prepare(`SELECT * FROM alerts WHERE product_id = ? AND type = ? AND status = 'OUVERTE'`)
    .get(productId, type) as AlertRow | undefined;
  if (existing) return null; // already open, no duplicate (also enforced by partial unique index)

  const info = db
    .prepare(`INSERT INTO alerts (product_id, type, status) VALUES (?, ?, 'OUVERTE')`)
    .run(productId, type);
  return db.prepare('SELECT * FROM alerts WHERE id = ?').get(info.lastInsertRowid) as AlertRow;
}

function resolveOpenAlert(db: Database.Database, productId: number, type: AlertType): void {
  db.prepare(
    `UPDATE alerts
       SET status = 'RESOLUE', resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE product_id = ? AND type = ? AND status = 'OUVERTE'`,
  ).run(productId, type);
}

/**
 * Recompute alert state for a product after a stock change (see spec §6).
 * Returns any alerts that were newly opened.
 */
function evaluateAlerts(db: Database.Database, product: ProductRow): AlertRow[] {
  const vitrine = getLevel(db, product.id, 'VITRINE');
  const stock = getLevel(db, product.id, 'STOCK');
  const opened: AlertRow[] = [];

  // VITRINE_LOW → in-app notification to Admin ("réapprovisionner le rayon").
  if (vitrine < product.mini_vitrine) {
    const a = ensureOpenAlert(db, product.id, 'VITRINE_LOW');
    if (a) opened.push(a);
  } else {
    resolveOpenAlert(db, product.id, 'VITRINE_LOW');
  }

  // STOCK_LOW → in-app + email (supplier reorder).
  // Escalation: shelf empty AND reserve empty → force STOCK_LOW email.
  const bothEmpty = vitrine === 0 && stock === 0;
  if (stock < product.mini_stock || bothEmpty) {
    const a = ensureOpenAlert(db, product.id, 'STOCK_LOW');
    if (a) opened.push(a);
  } else {
    resolveOpenAlert(db, product.id, 'STOCK_LOW');
  }

  return opened;
}

/**
 * Append a movement (the source of truth), update the derived stock_levels cache,
 * and re-evaluate alerts — all within the caller's transaction.
 *
 * Idempotent on `scanUid`: replaying the same uid returns the existing movement
 * without double-counting.
 */
export function recordMovement(db: Database.Database, input: MovementInput): MovementResult {
  if (input.quantity <= 0 || !Number.isInteger(input.quantity)) {
    throw conflict('La quantité doit être un entier positif');
  }

  if (input.scanUid) {
    const existing = db
      .prepare('SELECT * FROM movements WHERE scan_uid = ?')
      .get(input.scanUid) as MovementRow | undefined;
    if (existing) {
      return { movement: existing, idempotent: true, openedAlerts: [] };
    }
  }

  const product = getProduct(db, input.productId);

  // Compute and validate resulting levels before writing anything.
  if (input.from) {
    const current = getLevel(db, product.id, input.from);
    const next = current - input.quantity;
    if (next < 0) {
      throw conflict(
        `Stock insuffisant en ${input.from} pour « ${product.name} » (${current} disponible)`,
      );
    }
    setLevel(db, product.id, input.from, next);
  }
  if (input.to) {
    const current = getLevel(db, product.id, input.to);
    setLevel(db, product.id, input.to, current + input.quantity);
  }

  const info = db
    .prepare(
      `INSERT INTO movements
         (product_id, type, quantity, from_location, to_location, user_id, sale_id, scan_uid)
       VALUES (@productId, @type, @quantity, @from, @to, @userId, @saleId, @scanUid)`,
    )
    .run({
      productId: input.productId,
      type: input.type,
      quantity: input.quantity,
      from: input.from ?? null,
      to: input.to ?? null,
      userId: input.userId,
      saleId: input.saleId ?? null,
      scanUid: input.scanUid ?? null,
    });

  const movement = db
    .prepare('SELECT * FROM movements WHERE id = ?')
    .get(info.lastInsertRowid) as MovementRow;

  const openedAlerts = evaluateAlerts(db, product);

  return { movement, idempotent: false, openedAlerts };
}

/**
 * Rebuild the entire stock_levels cache from the movements source of truth.
 * Safe to run at any time (spec §3: "reconstructible à tout moment").
 */
export function rebuildStockLevels(db: Database.Database): void {
  const rebuild = db.transaction(() => {
    db.prepare('DELETE FROM stock_levels').run();
    const movements = db
      .prepare('SELECT product_id, quantity, from_location, to_location FROM movements')
      .all() as Pick<MovementRow, 'product_id' | 'quantity' | 'from_location' | 'to_location'>[];

    const levels = new Map<string, number>();
    const key = (p: number, l: Location) => `${p}:${l}`;
    for (const m of movements) {
      if (m.from_location) {
        const k = key(m.product_id, m.from_location);
        levels.set(k, (levels.get(k) ?? 0) - m.quantity);
      }
      if (m.to_location) {
        const k = key(m.product_id, m.to_location);
        levels.set(k, (levels.get(k) ?? 0) + m.quantity);
      }
    }
    const insert = db.prepare(
      'INSERT INTO stock_levels (product_id, location, quantity) VALUES (?, ?, ?)',
    );
    for (const [k, qty] of levels) {
      const [pid, loc] = k.split(':');
      insert.run(Number(pid), loc, qty);
    }
  });
  rebuild();
}
