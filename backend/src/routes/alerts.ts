import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/connection.js';
import { notFound } from '../lib/errors.js';

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  // In-app notifications — Admin+ (VITRINE_LOW → réappro; STOCK_LOW → recommande).
  app.get(
    '/alerts',
    { preHandler: [app.authenticate, app.requireRole('ADMIN')] },
    async (req) => {
      const { status } = req.query as { status?: string };
      const db = getDb();
      const where = status === 'RESOLUE' || status === 'OUVERTE' ? 'WHERE a.status = ?' : '';
      const params = where ? [status] : [];
      const rows = db
        .prepare(
          `SELECT a.*, p.name AS product_name, p.brand AS product_brand,
                  p.mini_vitrine, p.mini_stock,
                  (SELECT quantity FROM stock_levels WHERE product_id = a.product_id AND location='VITRINE') AS vitrine,
                  (SELECT quantity FROM stock_levels WHERE product_id = a.product_id AND location='STOCK') AS stock
           FROM alerts a JOIN products p ON p.id = a.product_id
           ${where}
           ORDER BY a.status ASC, a.created_at DESC
           LIMIT 200`,
        )
        .all(...params);
      return rows;
    },
  );

  app.get(
    '/alerts/count',
    { preHandler: [app.authenticate, app.requireRole('ADMIN')] },
    async () => {
      const db = getDb();
      const row = db
        .prepare(
          `SELECT
             SUM(CASE WHEN type='VITRINE_LOW' THEN 1 ELSE 0 END) AS vitrine_low,
             SUM(CASE WHEN type='STOCK_LOW' THEN 1 ELSE 0 END) AS stock_low,
             COUNT(*) AS total
           FROM alerts WHERE status='OUVERTE'`,
        )
        .get() as { vitrine_low: number | null; stock_low: number | null; total: number };
      return {
        vitrine_low: row.vitrine_low ?? 0,
        stock_low: row.stock_low ?? 0,
        total: row.total ?? 0,
      };
    },
  );

  // Manual resolution (Supervisor). Auto-resolution also happens on restock.
  app.post(
    '/alerts/:id/resolve',
    { preHandler: [app.authenticate, app.requireRole('SUPERVISOR')] },
    async (req) => {
      const { id } = req.params as { id: string };
      const db = getDb();
      const info = db
        .prepare(
          `UPDATE alerts SET status='RESOLUE', resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE id = ? AND status='OUVERTE'`,
        )
        .run(Number(id));
      if (info.changes === 0) throw notFound('Alerte ouverte introuvable');
      return db.prepare('SELECT * FROM alerts WHERE id = ?').get(Number(id));
    },
  );
}
