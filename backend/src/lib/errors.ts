/** Build an Error carrying an HTTP status code that Fastify will honour. */
export function httpError(statusCode: number, message: string): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

export const badRequest = (m: string) => httpError(400, m);
export const unauthorized = (m = 'Non authentifié') => httpError(401, m);
export const forbidden = (m = 'Accès refusé') => httpError(403, m);
export const notFound = (m = 'Introuvable') => httpError(404, m);
export const conflict = (m: string) => httpError(409, m);
