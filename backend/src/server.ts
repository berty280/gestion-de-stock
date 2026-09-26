import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
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

  // All API endpoints live under /api so the SPA can own the rest of the paths.
  await app.register(
    async (api) => {
      api.get('/health', async () => {
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

      await api.register(authRoutes);
      await api.register(productRoutes);
      await api.register(customerRoutes);
      await api.register(operationRoutes);
      await api.register(saleRoutes);
      await api.register(alertRoutes);
      await api.register(userRoutes);
      await api.register(reportRoutes);
    },
    { prefix: '/api' },
  );

  // Serve the built PWA (single-port mode) when it exists, with SPA fallback.
  if (config.frontendDist && existsSync(config.frontendDist)) {
    await app.register(fastifyStatic, { root: config.frontendDist, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api')) {
        return reply.type('text/html').sendFile('index.html');
      }
      return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Route inconnue' });
    });
  }

  return app;
}
