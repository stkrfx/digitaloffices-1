import { FastifyRedis } from '@fastify/redis';
import { prisma } from '../../db/index.js';

// --------------------------------------------------------------------------
// EXPERT SERVICE
// --------------------------------------------------------------------------
// Purpose: Business logic for Expert-specific features.
// Standards:
// - Redis Caching for high-read public profiles 
// - Strict typing and error handling
// --------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 60 * 60; // 1 Hour

/**
 * GET PUBLIC EXPERT PROFILE
 * Strategies:
 * 1. Check Redis Cache.
 * 2. If miss, fetch from Postgres (Prisma).
 * 3. Cache result.
 * 4. Return Data.
 */
export async function getExpertByUsername(username: string, redis: FastifyRedis) {
  const cacheKey = `expert:profile:${username}`;

  // 1. Check Cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Fetch from DB
  const expert = await prisma.expert.findUnique({
    where: { 
      username,
      isBlocked: false,
      deletedAt: null 
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      headline: true,
      bio: true,
      hourlyRate: true,
      specialties: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (!expert) {
    throw new Error('Expert not found');
  }

  // 3. Cache Result
  // We store the JSON stringified object
  await redis.set(cacheKey, JSON.stringify(expert), 'EX', CACHE_TTL_SECONDS);

  return expert;
}

/**
 * UPDATE EXPERT PROFILE
 * Updates DB and invalidates Cache.
 */
export async function updateExpertProfile(
  id: string, 
  data: { 
    headline?: string; 
    bio?: string; 
    hourlyRate?: number; 
    specialties?: string[];
    avatarUrl?: string;
  },
  redis: FastifyRedis
) {
  // 1. Update DB
  const updatedExpert = await prisma.expert.update({
    where: { id },
    data: {
      headline: data.headline,
      bio: data.bio,
      hourlyRate: data.hourlyRate,
      specialties: data.specialties,
      avatarUrl: data.avatarUrl,
    },
  });

  // 2. Invalidate Cache
  // We need the username to construct the key.
  const cacheKey = `expert:profile:${updatedExpert.username}`;
  await redis.del(cacheKey);

  return updatedExpert;
}