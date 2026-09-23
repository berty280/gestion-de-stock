import { config } from './config.js';
import { buildServer } from './server.js';
import { runMigrations } from './db/migrate.js';
import { closeDb } from './db/connection.js';

async function main(): Promise<void> {
  // Apply any pending migrations on boot so the API never runs against a stale schema.
  const applied = runMigrations();
  if (applied.length > 0) {
    console.log(`Applied migrations on boot: ${applied.join(', ')}`);
  }

  const app = buildServer();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    closeDb();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
