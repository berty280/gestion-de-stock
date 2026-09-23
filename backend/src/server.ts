import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { getDb } from './db/connection.js';

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    },
  });

  app.register(cors, { origin: config.corsOrigin, credentials: true });

  // Liveness + DB connectivity check.
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

  app.get('/', async () => ({
    name: 'Comptoir API',
    version: '0.1.0',
    docs: 'See docs/SPEC.md',
  }));

  return app;
}
