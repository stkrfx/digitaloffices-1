import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { Role, ROLES } from '../../../shared/types.js';

// --------------------------------------------------------------------------
// DATABASE CONNECTION (Prisma 7 style with driver adapter)
// --------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

// Base Prisma client (unextended)
const basePrisma = new PrismaClient({ adapter });

// --------------------------------------------------------------------------
// PRISMA EXTENDED CLIENT (Soft Delete + global read filters)
// --------------------------------------------------------------------------
//
// - delete / deleteMany on selected models become "soft" deletes
//   by updating `deletedAt` instead of actually deleting.
// - read operations automatically filter out records where deletedAt != null.
// - We call `basePrisma` inside delete/deleteMany to avoid recursive extension
//   calls, following the pattern of using a base client in extensions. [[Soft delete ext](https://github.com/prisma/prisma/issues/26222)]
// --------------------------------------------------------------------------

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async delete({ model, args, query }) {
        if (['User', 'Expert', 'Organization', 'Admin'].includes(model)) {
          // Use basePrisma to avoid calling the extended delete again
          return (basePrisma as any)[model].update({
            ...args,
            data: { deletedAt: new Date() },
          });
        }
        return query(args);
      },

      async deleteMany({ model, args, query }) {
        if (['User', 'Expert', 'Organization', 'Admin'].includes(model)) {
          return (basePrisma as any)[model].updateMany({
            ...args,
            data: { deletedAt: new Date() },
          });
        }
        return query(args);
      },

      async findMany({ model, args, query }) {
        if (['User', 'Expert', 'Organization', 'Admin'].includes(model)) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
        }
        return query(args);
      },

      async findFirst({ model, args, query }) {
        if (['User', 'Expert', 'Organization', 'Admin'].includes(model)) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
        }
        return query(args);
      },

      async findUnique({ model, args, query }) {
        if (['User', 'Expert', 'Organization', 'Admin'].includes(model)) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
        }
        return query(args);
      },

      async count({ model, args, query }) {
        if (['User', 'Expert', 'Organization', 'Admin'].includes(model)) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
        }
        return query(args);
      },
    },
  },
});

// --------------------------------------------------------------------------
// DISCONNECT HELPERS
// --------------------------------------------------------------------------

export async function disconnectDB() {
  await prisma.$disconnect();
  await pool.end();
}

// --------------------------------------------------------------------------
// HELPER: GET PRISMA DELEGATE BY ROLE
// --------------------------------------------------------------------------

export function getPrismaDelegate(role: Role) {
  switch (role) {
    case ROLES.USER:
      return prisma.user;
    case ROLES.EXPERT:
      return prisma.expert;
    case ROLES.ORGANIZATION:
      return prisma.organization;
    case ROLES.ADMIN:
      return prisma.admin;
    default:
      throw new Error(`Invalid role: ${role}`);
  }
}