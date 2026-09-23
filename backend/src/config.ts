import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv();

function env(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Resolve a path from an env var against the backend package root. */
function resolvePath(value: string): string {
  return resolve(process.cwd(), value);
}

export const config = {
  port: Number(env('PORT', '3000')),
  host: env('HOST', '0.0.0.0'),
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  databasePath: resolvePath(env('DATABASE_PATH', './data/comptoir.db')),
  jwtSecret: env('JWT_SECRET', 'change-me-in-production'),
  seedDefaultPassword: env('SEED_DEFAULT_PASSWORD', 'comptoir123'),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? '587'),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Comptoir <no-reply@example.com>',
    alertTo: process.env.ALERT_EMAIL_TO ?? '',
  },
} as const;

export type AppConfig = typeof config;
