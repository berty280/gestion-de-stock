import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { conflict, notFound } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { notifyOpenedAlerts } from '../services/alerts.js';
import { recordMovement, type MovementResult } from '../services/stock.js';
import type { ProductRow } from '../types.js';

const productDataSchema = z.object({
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

// Réception: either an existing product_id, or product data to create on the fly.
const receptionSchema = z
  .object({
    product_id: z.number().int().positive().optional(),
    product: productDataSchema.optional(),
    quantity: z.number().int().positive(),
    scan_uid: z.string().trim().max(128).optional(),
  })
  .refine((v) => v.product_id !== undefined || v.product !== undefined, {
    message: 'product_id ou product requis',
  });

const reapproSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  scan_uid: z.string().trim().max(128).optional(),
});

const adjustmentSchema = z.object({
  product_id: z.number().int().positive(),
  location: z.enum(['VITRINE', 'STOCK']),
  delta: z.number().int().refine((n) => n !== 0, { message: 'delta ne peut pas être 0' }),
  scan_uid: z.string().trim().max(128).optional(),
});

export async function operationRoutes(app: FastifyInstance): Promise<void> {
  // 1. Réception (Admin+): scan → Stock +N (creates the product if unknown).
  app.post(
    '/operations/reception',
    { preHandler: [app.authenticate, app.requireRole('ADMIN')] },
    async (req) => {
      const body = parse(receptionSchema, req.body);
      const db = getDb();
      const userId = req.user.id;

      const run = db.transaction((): MovementResult & { product: ProductRow } => {
        let productId = body.product_id;

        if (!productId && body.product) {
          const data = body.product;
          if (data.gtin) {
            const existing = db.prepare('SELECT * FROM products WHERE gtin = ?').get(data.gtin) as
              | ProductRow
              | undefined;
            if (existing) productId = existing.id;
          }
          if (!productId) {
            const info = db
              .prepare(
                `INSERT INTO products (gtin, name, brand, category, image_url, unit, mini_vitrine, mini_stock, source)
                 VALUES (@gtin, @name, @brand, @category, @image_url, @unit, @mini_vitrine, @mini_stock, @source)`,
              )
              .run({
                gtin: data.gtin ?? null,
                name: data.name,
                brand: data.brand ?? null,
                category: data.category ?? null,
                image_url: data.image_url ?? null,
                unit: data.unit ?? null,
                mini_vitrine: data.mini_vitrine,
                mini_stock: data.mini_stock,
                source: data.source,
              });
            productId = Number(info.lastInsertRowid);
          }
        }

        if (!productId) throw notFound('Produit introuvable');

        const result = recordMovement(db, {
          productId,
          type: 'RECEPTION',
          quantity: body.quantity,
          to: 'STOCK',
          userId,
          scanUid: body.scan_uid ?? null,
        });
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as ProductRow;
        return { ...result, product };
      });

      const result = run();
      await notifyOpenedAlerts(db, result.openedAlerts);
      return {
        idempotent: result.idempotent,
        movement: result.movement,
        product: result.product,
      };
    },
  );

  // 2. Réappro (Admin+): Stock −N, Vitrine +N → STOCK_LOW + email if reserve low.
  app.post(
    '/operations/reappro',
    { preHandler: [app.authenticate, app.requireRole('ADMIN')] },
    async (req) => {
      const body = parse(reapproSchema, req.body);
      const db = getDb();
      const userId = req.user.id;

      const run = db.transaction(() =>
        recordMovement(db, {
          productId: body.product_id,
          type: 'REAPPRO',
          quantity: body.quantity,
          from: 'STOCK',
          to: 'VITRINE',
          userId,
          scanUid: body.scan_uid ?? null,
        }),
      );

      const result = run();
      await notifyOpenedAlerts(db, result.openedAlerts);
      return { idempotent: result.idempotent, movement: result.movement };
    },
  );

  // Ajustements / corrections (Supervisor only) — signed delta on one location.
  app.post(
    '/operations/adjustment',
    { preHandler: [app.authenticate, app.requireRole('SUPERVISOR')] },
    async (req) => {
      const body = parse(adjustmentSchema, req.body);
      const db = getDb();
      const userId = req.user.id;

      const run = db.transaction(() =>
        recordMovement(db, {
          productId: body.product_id,
          type: 'AJUSTEMENT',
          quantity: Math.abs(body.delta),
          from: body.delta < 0 ? body.location : null,
          to: body.delta > 0 ? body.location : null,
          userId,
          scanUid: body.scan_uid ?? null,
        }),
      );

      let result;
      try {
        result = run();
      } catch (err) {
        // recordMovement throws a 409 for negative results — surface as-is.
        if (err instanceof Error && 'statusCode' in err) throw err;
        throw conflict('Ajustement impossible');
      }
      await notifyOpenedAlerts(db, result.openedAlerts);
      return { idempotent: result.idempotent, movement: result.movement };
    },
  );
}
