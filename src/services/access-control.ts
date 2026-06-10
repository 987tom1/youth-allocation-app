import type { Actor } from '../core/entities/user';
import type { UserRole } from '../core/types/enums';
import { ForbiddenError } from '../core/errors/app-error';

// All actions in the system
export type Action =
  | 'student:read'            // view student list
  | 'student:read:sensitive'  // view mobile/parent phone
  | 'student:write'           // create/update/delete students
  | 'leader:read'             // view leaders
  | 'leader:write'            // create/update leaders (grade login, director, admin)
  | 'allocation:write'        // assign/unassign students to leaders
  | 'overview:read'           // view ministry-wide overview stats
  | 'atrisk:read'             // view at-risk data
  | 'import:run'              // upload CSV data
  | 'admin:manage';           // settings, accounts, year-rollover

const ROLE_PERMISSIONS: Record<UserRole, Set<Action>> = {
  // grade — scoped to their grade; can manage leaders within their grade
  grade: new Set<Action>([
    'student:read',
    'student:read:sensitive',
    'leader:read',
    'leader:write',
    'allocation:write',
    'overview:read',
    'atrisk:read',
  ]),
  // quad — read-only across their quad; sees leaders and allocations
  quad: new Set<Action>([
    'student:read',
    'student:read:sensitive',
    'leader:read',
    'allocation:write',
    'overview:read',
    'atrisk:read',
  ]),
  // director — ministry-wide access; can import data
  director: new Set<Action>([
    'student:read',
    'student:read:sensitive',
    'student:write',
    'leader:read',
    'leader:write',
    'allocation:write',
    'overview:read',
    'atrisk:read',
    'import:run',
  ]),
  // admin — everything including back-office management
  admin: new Set<Action>([
    'student:read',
    'student:read:sensitive',
    'student:write',
    'leader:read',
    'leader:write',
    'allocation:write',
    'overview:read',
    'atrisk:read',
    'import:run',
    'admin:manage',
  ]),
};

export function can(actor: Actor, action: Action): boolean {
  return ROLE_PERMISSIONS[actor.role]?.has(action) ?? false;
}

export function assertCan(actor: Actor, action: Action): void {
  if (!can(actor, action)) {
    throw new ForbiddenError(`Role '${actor.role}' cannot perform '${action}'`);
  }
}

/**
 * Returns true if the actor can access data for a given grade.
 * - grade: own grade only
 * - quad: all grades within their quad
 * - director/admin: all grades
 */
export function canAccessGrade(actor: Actor, grade: number | null): boolean {
  switch (actor.role) {
    case 'admin':
    case 'director':
      return true;
    case 'grade':
      return actor.grade != null && actor.grade === grade;
    case 'quad': {
      if (!actor.quad || grade == null) return false;
      const isJunior = grade >= 7 && grade <= 9;
      const isSenior = grade >= 10 && grade <= 12;
      if (actor.quad === 'g79' || actor.quad === 'b79') return isJunior;
      if (actor.quad === 'g1012' || actor.quad === 'b1012') return isSenior;
      return false;
    }
    default:
      return false;
  }
}

export function assertCanAccessGrade(actor: Actor, grade: number | null): void {
  if (!canAccessGrade(actor, grade)) {
    throw new ForbiddenError('Access denied to this grade');
  }
}

/**
 * Returns true if the actor's gender scope aligns with the given gender.
 * Quad logins are gender-scoped; grade and above see all genders.
 */
export function canAccessGender(actor: Actor, gender: string): boolean {
  if (actor.role === 'admin' || actor.role === 'director' || actor.role === 'grade') return true;
  if (actor.role === 'quad') {
    if (!actor.quad) return false;
    const femaleQuads = new Set(['g79', 'g1012']);
    const isFemale = gender.toLowerCase() === 'female' || gender.toLowerCase() === 'f';
    return femaleQuads.has(actor.quad) ? isFemale : !isFemale;
  }
  return false;
}
