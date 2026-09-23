import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { conflict, notFound } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import type { CustomerRow } from '../types.js';

const customerBody = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).nullish(),
});

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  // Clients CRUD — all roles (spec §5).
  app.get('/customers', { preHandler: [app.authenticate] }, async (req) => {
    const { q } = req.query as { q?: string };
    const db = getDb();
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      return db
        .prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name LIMIT 200')
        .all(like, like);
    }
    return db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT 200').all();
  });

  app.get('/customers/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const row = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(Number(id));
    if (!row) throw notFound('Client introuvable');
    return row;
  });

  app.post('/customers', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = parse(customerBody, req.body);
    const db = getDb();
    const info = db
      .prepare('INSERT INTO customers (name, phone, unknown) VALUES (?, ?, 0)')
      .run(body.name, body.phone ?? null);
    reply.code(201);
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
  });

  app.patch('/customers/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = parse(customerBody.partial(), req.body);
    const db = getDb();
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(id)) as
      | CustomerRow
      | undefined;
    if (!existing) throw notFound('Client introuvable');
    const merged = { ...existing, ...body };
    db.prepare('UPDATE customers SET name = ?, phone = ? WHERE id = ?').run(
      merged.name,
      merged.phone ?? null,
      existing.id,
    );
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(existing.id);
  });

  app.delete('/customers/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const db = getDb();
    const used = db.prepare('SELECT COUNT(*) AS n FROM sales WHERE customer_id = ?').get(Number(id)) as {
      n: number;
    };
    if (used.n > 0) {
      throw conflict('Impossible de supprimer un client rattaché à des ventes');
    }
    const info = db.prepare('DELETE FROM customers WHERE id = ?').run(Number(id));
    if (info.changes === 0) throw notFound('Client introuvable');
    return { deleted: true };
  });
}
