import type { Role } from '../types.js';

const RANK: Record<Role, number> = {
  OPERATOR: 1,
  ADMIN: 2,
  SUPERVISOR: 3,
};

export function roleRank(role: Role): number {
  return RANK[role] ?? 0;
}

/** True when `role` is at least as privileged as `min`. */
export function roleAtLeast(role: Role, min: Role): boolean {
  return roleRank(role) >= roleRank(min);
}
