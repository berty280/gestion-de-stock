import type { ZodSchema } from 'zod';
import { badRequest } from './errors.js';

/** Parse `data` with a zod schema, throwing a 400 with a readable message on failure. */
export function parse<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join('.') || '(racine)'}: ${i.message}`)
      .join('; ');
    throw badRequest(msg);
  }
  return result.data;
}
