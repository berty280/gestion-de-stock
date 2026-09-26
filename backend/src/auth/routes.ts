import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { unauthorized } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import type { JwtUser, UserRow } from '../types.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (req) => {
    const { email, password } = parse(loginSchema, req.body);
    const db = getDb();
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.toLowerCase()) as UserRow | undefined;

    if (!user || user.active !== 1 || !bcrypt.compareSync(password, user.password_hash)) {
      throw unauthorized('Email ou mot de passe invalide');
    }

    const payload: JwtUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = app.jwt.sign(payload, { expiresIn: '12h' });
    return { token, user: payload };
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req) => {
    return { user: req.user };
  });
}
