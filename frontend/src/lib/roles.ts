import type { Role } from './types';

const RANK: Record<Role, number> = { OPERATOR: 1, ADMIN: 2, SUPERVISOR: 3 };

export function roleAtLeast(role: Role | undefined, min: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export const roleLabel: Record<Role, string> = {
  OPERATOR: 'Opérateur',
  ADMIN: 'Admin',
  SUPERVISOR: 'Superviseur',
};
