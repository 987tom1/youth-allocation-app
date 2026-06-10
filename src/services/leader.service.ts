import { z } from 'zod';
import { generateId } from '../utils/id';
import { assertCan, canAccessGrade } from './access-control';
import type { ILeaderRepository } from '../repositories/interfaces/entity-repositories';
import type { Leader } from '../core/entities/leader';
import type { Actor } from '../core/entities/user';
import type { Grade } from '../core/types/enums';
import { NotFoundError, ForbiddenError, BadRequestError } from '../core/errors/app-error';

const CreateLeaderSchema = z.object({
  fullName: z.string().min(1).max(100),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  grades: z.array(z.number().int().min(7).max(12)).optional(),
});

export interface LeaderService {
  list(actor: Actor): Promise<Leader[]>;
  get(actor: Actor, id: string): Promise<Leader>;
  create(actor: Actor, input: unknown): Promise<Leader>;
  update(actor: Actor, id: string, input: unknown): Promise<Leader>;
  remove(actor: Actor, id: string): Promise<void>;
}

export function makeLeaderService(repo: ILeaderRepository): LeaderService {
  return {
    async list(actor) {
      assertCan(actor, 'leader:read');
      const all = await repo.findActive();

      if (actor.role === 'grade') {
        // Grade login sees only leaders they created (or assigned to their grade)
        return all.filter(
          (l) =>
            l.createdByGrade === actor.grade ||
            l.grades.length === 0 ||
            l.grades.includes(actor.grade as Grade),
        );
      }
      if (actor.role === 'quad') {
        // Quad login sees all leaders within their quad's grades
        return all.filter((l) => l.grades.some((g) => canAccessGrade(actor, g)) || l.grades.length === 0);
      }
      return all;
    },

    async get(actor, id) {
      assertCan(actor, 'leader:read');
      const l = await repo.findById(id);
      if (!l) throw new NotFoundError('Leader not found');
      return l;
    },

    async create(actor, input) {
      assertCan(actor, 'leader:write');
      const data = CreateLeaderSchema.parse(input);

      // Grade login: leader is automatically scoped to their grade
      if (actor.role === 'grade' && actor.grade == null) {
        throw new BadRequestError('Grade login has no grade assigned');
      }
      const grades: Grade[] =
        actor.role === 'grade' && actor.grade != null
          ? [actor.grade]
          : ((data.grades ?? []) as Grade[]);

      const now = new Date().toISOString();
      const leader: Leader = {
        id: generateId(),
        fullName: data.fullName,
        gender: (data.gender ?? null) as Leader['gender'],
        grades,
        active: true,
        createdByGrade: actor.role === 'grade' ? actor.grade : null,
        createdAt: now,
        updatedAt: now,
      };
      return repo.save(leader);
    },

    async update(actor, id, input) {
      assertCan(actor, 'leader:write');
      const existing = await repo.findById(id);
      if (!existing) throw new NotFoundError('Leader not found');

      // Grade login can only update leaders they created
      if (actor.role === 'grade' && existing.createdByGrade !== actor.grade) {
        throw new ForbiddenError('You can only edit leaders you created');
      }

      const patch = CreateLeaderSchema.extend({ active: z.boolean().optional() }).partial().parse(input);
      const updated: Leader = {
        ...existing,
        fullName: patch.fullName ?? existing.fullName,
        gender: patch.gender !== undefined ? ((patch.gender ?? null) as Leader['gender']) : existing.gender,
        grades: patch.grades !== undefined ? (patch.grades as Grade[]) : existing.grades,
        active: patch.active !== undefined ? patch.active : existing.active,
        updatedAt: new Date().toISOString(),
      };
      return repo.save(updated);
    },

    async remove(actor, id) {
      assertCan(actor, 'leader:write');
      const existing = await repo.findById(id);
      if (!existing) throw new NotFoundError('Leader not found');
      if (actor.role === 'grade' && existing.createdByGrade !== actor.grade) {
        throw new ForbiddenError('You can only delete leaders you created');
      }
      await repo.delete(id);
    },
  };
}
