import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/connection.js';

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  const guard = { preHandler: [app.authenticate, app.requireRole('ADMIN')] };

  // Stock courant — every product with shelf/reserve quantities and low flags.
  app.get('/reports/stock', guard, async () => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT p.id, p.gtin, p.name, p.brand, p.category, p.unit,
                p.mini_vitrine, p.mini_stock,
                COALESCE(v.quantity, 0) AS vitrine,
                COALESCE(s.quantity, 0) AS stock
         FROM products p
         LEFT JOIN stock_levels v ON v.product_id = p.id AND v.location = 'VITRINE'
         LEFT JOIN stock_levels s ON s.product_id = p.id AND s.location = 'STOCK'
         ORDER BY p.name`,
      )
      .all() as Array<{
      vitrine: number;
      stock: number;
      mini_vitrine: number;
      mini_stock: number;
      [k: string]: unknown;
    }>;
    return rows.map((r) => ({
      ...r,
      vitrine_low: r.vitrine < r.mini_vitrine,
      stock_low: r.stock < r.mini_stock || (r.vitrine === 0 && r.stock === 0),
    }));
  });

  // Mouvements — recent history with product & user names (optional filters).
  app.get('/reports/movements', guard, async (req) => {
    const { type, product_id, limit } = req.query as {
      type?: string;
      product_id?: string;
      limit?: string;
    };
    const db = getDb();
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (type && ['RECEPTION', 'REAPPRO', 'VENTE', 'AJUSTEMENT'].includes(type)) {
      clauses.push('m.type = ?');
      params.push(type);
    }
    if (product_id) {
      clauses.push('m.product_id = ?');
      params.push(Number(product_id));
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const max = Math.min(Number(limit) || 100, 500);
    const rows = db
      .prepare(
        `SELECT m.id, m.type, m.quantity, m.from_location, m.to_location, m.sale_id,
                m.created_at, p.name AS product_name, u.name AS user_name
         FROM movements m
         JOIN products p ON p.id = m.product_id
         LEFT JOIN users u ON u.id = m.user_id
         ${where}
         ORDER BY m.id DESC LIMIT ?`,
      )
      .all(...params, max);
    return rows;
  });

  // Ventes du jour — summary + list for a given date (default: today, UTC).
  app.get('/reports/sales', guard, async (req) => {
    const { date } = req.query as { date?: string };
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
    const db = getDb();

    const summary = db
      .prepare(
        `SELECT COUNT(DISTINCT s.id) AS sales_count,
                COALESCE(SUM(m.quantity), 0) AS items_sold
         FROM sales s
         LEFT JOIN movements m ON m.sale_id = s.id
         WHERE substr(s.created_at, 1, 10) = ?`,
      )
      .get(day) as { sales_count: number; items_sold: number };

    const sales = db
      .prepare(
        `SELECT s.id, s.created_at, u.name AS seller,
                c.name AS customer_name, c.phone AS customer_phone,
                (SELECT COALESCE(SUM(m.quantity),0) FROM movements m WHERE m.sale_id = s.id) AS total_items
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN users u ON u.id = s.user_id
         WHERE substr(s.created_at, 1, 10) = ?
         ORDER BY s.id DESC`,
      )
      .all(day);

    return { date: day, ...summary, sales };
  });
}
