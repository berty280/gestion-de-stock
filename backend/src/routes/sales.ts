import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { notFound } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { notifyOpenedAlerts } from '../services/alerts.js';
import { recordMovement } from '../services/stock.js';
import type { AlertRow, CustomerRow, MovementRow, SaleRow } from '../types.js';

const saleSchema = z.object({
  customer_id: z.number().int().positive().optional(),
  customer: z
    .object({
      name: z.string().trim().min(1).max(200),
      phone: z.string().trim().max(50).nullish(),
    })
    .optional(),
  unknown: z.boolean().optional(),
  lines: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
        scan_uid: z.string().trim().max(128).optional(),
      }),
    )
    .min(1),
});

function buildReceipt(saleId: number) {
  const db = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId) as SaleRow | undefined;
  if (!sale) throw notFound('Vente introuvable');
  const customer = sale.customer_id
    ? (db.prepare('SELECT * FROM customers WHERE id = ?').get(sale.customer_id) as
        | CustomerRow
        | undefined)
    : null;
  const seller = db.prepare('SELECT name FROM users WHERE id = ?').get(sale.user_id) as
    | { name: string }
    | undefined;
  const lines = db
    .prepare(
      `SELECT m.id, m.product_id, m.quantity, p.name, p.brand, p.unit, p.gtin
       FROM movements m JOIN products p ON p.id = m.product_id
       WHERE m.sale_id = ? ORDER BY m.id`,
    )
    .all(saleId) as Array<{
    id: number;
    product_id: number;
    quantity: number;
    name: string;
    brand: string | null;
    unit: string | null;
    gtin: string | null;
  }>;
  return {
    sale,
    customer: customer ?? { name: 'Inconnu', phone: null, unknown: 1 },
    seller: seller?.name ?? null,
    lines,
    total_items: lines.reduce((n, l) => n + l.quantity, 0),
  };
}

export async function saleRoutes(app: FastifyInstance): Promise<void> {
  // Vente (Operator+): panier de scans → Vitrine −N par ligne → crée sale + movements.
  app.post('/sales', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = parse(saleSchema, req.body);
    const db = getDb();
    const userId = req.user.id;

    const run = db.transaction(() => {
      // Resolve the customer.
      let customerId: number | null = null;
      if (body.customer_id) {
        const c = db.prepare('SELECT id FROM customers WHERE id = ?').get(body.customer_id);
        if (!c) throw notFound('Client introuvable');
        customerId = body.customer_id;
      } else if (body.customer && !body.unknown) {
        const info = db
          .prepare('INSERT INTO customers (name, phone, unknown) VALUES (?, ?, 0)')
          .run(body.customer.name, body.customer.phone ?? null);
        customerId = Number(info.lastInsertRowid);
      }
      // else: unknown customer → customer_id stays null.

      const saleInfo = db
        .prepare('INSERT INTO sales (customer_id, user_id) VALUES (?, ?)')
        .run(customerId, userId);
      const saleId = Number(saleInfo.lastInsertRowid);

      const openedAlerts: AlertRow[] = [];
      const movements: MovementRow[] = [];
      for (const line of body.lines) {
        const result = recordMovement(db, {
          productId: line.product_id,
          type: 'VENTE',
          quantity: line.quantity,
          from: 'VITRINE',
          userId,
          saleId,
          scanUid: line.scan_uid ?? null,
        });
        movements.push(result.movement);
        openedAlerts.push(...result.openedAlerts);
      }
      return { saleId, openedAlerts };
    });

    const { saleId, openedAlerts } = run();
    await notifyOpenedAlerts(db, openedAlerts);
    reply.code(201);
    return buildReceipt(saleId);
  });

  // Receipt / invoice for a sale.
  app.get('/sales/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    return buildReceipt(Number(id));
  });

  // (list route below)

  // Recent sales (Admin+ — operational history).
  app.get(
    '/sales',
    { preHandler: [app.authenticate, app.requireRole('ADMIN')] },
    async () => {
      const db = getDb();
      const rows = db
        .prepare(
          `SELECT s.id, s.created_at, s.user_id, u.name AS seller,
                  c.name AS customer_name, c.phone AS customer_phone,
                  (SELECT COALESCE(SUM(m.quantity),0) FROM movements m WHERE m.sale_id = s.id) AS total_items
           FROM sales s
           LEFT JOIN customers c ON c.id = s.customer_id
           LEFT JOIN users u ON u.id = s.user_id
           ORDER BY s.id DESC LIMIT 100`,
        )
        .all();
      return rows;
    },
  );
}
