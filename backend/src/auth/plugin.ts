import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { roleAtLeast } from '../lib/roles.js';
import type { JwtUser, Role } from '../types.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest) => Promise<void>;
    requireRole: (min: Role) => (req: FastifyRequest) => Promise<void>;
  }
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, { secret: config.jwtSecret });

  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw unauthorized();
    }
  });

  app.decorate('requireRole', (min: Role) => {
    return async (req: FastifyRequest) => {
      // Assumes `authenticate` ran first in the preHandler chain.
      const user = req.user;
      if (!user || !roleAtLeast(user.role, min)) {
        throw forbidden();
      }
    };
  });
}
