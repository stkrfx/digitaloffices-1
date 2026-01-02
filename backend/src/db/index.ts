import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client'
import { Role, ROLES } from '../../../shared/types.js';

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
export const prisma = new PrismaClient({ adapter })
export async function disconnectDB() {
  await prisma.$disconnect();
  await pool.end();
}

export function getPrismaDelegate(role: Role) {
  switch (role) {
      case ROLES.USER: return prisma.user;
      case ROLES.EXPERT: return prisma.expert;
      case ROLES.ORGANIZATION: return prisma.organization;
      case ROLES.ADMIN: return prisma.admin;
      default: throw new Error(`Invalid role: ${role}`);
  }
}