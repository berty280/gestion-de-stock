import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { getDb } from './db/connection.js';
import { registerAuth } from './auth/plugin.js';
import { authRoutes } from './auth/routes.js';
import { productRoutes } from './routes/products.js';
import { customerRoutes } from './routes/customers.js';
import { operationRoutes } from './routes/operations.js';
import { saleRoutes } from './routes/sales.js';
import { alertRoutes } from './routes/alerts.js';
import { userRoutes } from './routes/users.js';
import { reportRoutes } from './routes/reports.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    },
  });

  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await registerAuth(app);

  // Public
  app.get('/health', async () => {
    const db = getDb();
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    const migrations = db
      .prepare(
        "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = '_migrations'",
      )
      .get() as { n: number };
    return {
      status: 'ok',
      db: row.ok === 1 ? 'up' : 'down',
      migrationsTable: migrations.n === 1,
      time: new Date().toISOString(),
    };
  });

  app.get('/', async () => ({ name: 'Comptoir API', version: '0.1.0', docs: 'See docs/SPEC.md' }));

  // Feature routes
  await app.register(authRoutes);
  await app.register(productRoutes);
  await app.register(customerRoutes);
  await app.register(operationRoutes);
  await app.register(saleRoutes);
  await app.register(alertRoutes);
  await app.register(userRoutes);
  await app.register(reportRoutes);

  return app;
}
