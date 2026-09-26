import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { conflict, notFound } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { getLevel } from '../services/stock.js';
import { lookupGtinExternal } from '../services/gtin.js';
import type { ProductRow } from '../types.js';

function withLevels(product: ProductRow) {
  const db = getDb();
  return {
    ...product,
    vitrine: getLevel(db, product.id, 'VITRINE'),
    stock: getLevel(db, product.id, 'STOCK'),
  };
}

const productBody = z.object({
  gtin: z.string().trim().min(1).max(64).nullish(),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(200).nullish(),
  category: z.string().trim().max(200).nullish(),
  image_url: z.string().trim().max(1000).nullish(),
  unit: z.string().trim().max(50).nullish(),
  mini_vitrine: z.number().int().min(0).default(1),
  mini_stock: z.number().int().min(0).default(0),
  source: z.enum(['api', 'manuel']).default('manuel'),
});

const productPatch = productBody.partial();

export async function productRoutes(app: FastifyInstance): Promise<void> {
  // List / search — any authenticated user (needed for the sale screen too).
  app.get('/products', { preHandler: [app.authenticate] }, async (req) => {
    const { q } = req.query as { q?: string };
    const db = getDb();
    let rows: ProductRow[];
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      rows = db
        .prepare(
          `SELECT * FROM products
           WHERE name LIKE ? OR brand LIKE ? OR gtin LIKE ?
           ORDER BY name LIMIT 200`,
        )
        .all(like, like, like) as ProductRow[];
    } else {
      rows = db.prepare('SELECT * FROM products ORDER BY name LIMIT 200').all() as ProductRow[];
    }
    return rows.map(withLevels);
  });

  app.get('/products/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(id)) as
      | ProductRow
      | undefined;
    if (!product) throw notFound('Produit introuvable');
    return withLevels(product);
  });

  // GTIN resolution: local cache first, then Open Beauty Facts (spec §7).
  app.get('/products/lookup/:gtin', { preHandler: [app.authenticate] }, async (req) => {
    const { gtin } = req.params as { gtin: string };
    const db = getDb();
    const local = db.prepare('SELECT * FROM products WHERE gtin = ?').get(gtin) as
      | ProductRow
      | undefined;
    if (local) {
      return { source: 'local' as const, product: withLevels(local) };
    }
    const suggestion = await lookupGtinExternal(gtin);
    if (suggestion) {
      return { source: 'api' as const, suggestion };
    }
    return { source: 'none' as const, gtin };
  });

  // Create — Admin+.
  app.post(
    '/products',
    { preHandler: [app.authenticate, app.requireRole('ADMIN')] },
    async (req, reply) => {
      const body = parse(productBody, req.body);
      const db = getDb();
      if (body.gtin) {
        const dup = db.prepare('SELECT id FROM products WHERE gtin = ?').get(body.gtin);
        if (dup) throw conflict('Un produit avec ce GTIN existe déjà');
      }
      const info = db
        .prepare(
          `INSERT INTO products (gtin, name, brand, category, image_url, unit, mini_vitrine, mini_stock, source)
           VALUES (@gtin, @name, @brand, @category, @image_url, @unit, @mini_vitrine, @mini_stock, @source)`,
        )
        .run({
          gtin: body.gtin ?? null,
          name: body.name,
          brand: body.brand ?? null,
          category: body.category ?? null,
          image_url: body.image_url ?? null,
          unit: body.unit ?? null,
          mini_vitrine: body.mini_vitrine,
          mini_stock: body.mini_stock,
          source: body.source,
        });
      const created = db
        .prepare('SELECT * FROM products WHERE id = ?')
        .get(info.lastInsertRowid) as ProductRow;
      reply.code(201);
      return withLevels(created);
    },
  );

  // Update (incl. thresholds) — Admin+.
  app.patch(
    '/products/:id',
    { preHandler: [app.authenticate, app.requireRole('ADMIN')] },
    async (req) => {
      const { id } = req.params as { id: string };
      const body = parse(productPatch, req.body);
      const db = getDb();
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(id)) as
        | ProductRow
        | undefined;
      if (!product) throw notFound('Produit introuvable');

      if (body.gtin && body.gtin !== product.gtin) {
        const dup = db
          .prepare('SELECT id FROM products WHERE gtin = ? AND id <> ?')
          .get(body.gtin, product.id);
        if (dup) throw conflict('Un produit avec ce GTIN existe déjà');
      }

      const merged = { ...product, ...body };
      db.prepare(
        `UPDATE products SET
           gtin=@gtin, name=@name, brand=@brand, category=@category, image_url=@image_url,
           unit=@unit, mini_vitrine=@mini_vitrine, mini_stock=@mini_stock, source=@source
         WHERE id=@id`,
      ).run({
        id: product.id,
        gtin: merged.gtin ?? null,
        name: merged.name,
        brand: merged.brand ?? null,
        category: merged.category ?? null,
        image_url: merged.image_url ?? null,
        unit: merged.unit ?? null,
        mini_vitrine: merged.mini_vitrine,
        mini_stock: merged.mini_stock,
        source: merged.source,
      });
      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id) as ProductRow;
      return withLevels(updated);
    },
  );
}
