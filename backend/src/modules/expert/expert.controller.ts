import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as expertService from './expert.service.js';

// --------------------------------------------------------------------------
// EXPERT CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Handle HTTP requests for Expert profiles.
// Standards:
// - Public Read access (Cached) 
// - Protected Write access (Expert Only)
// --------------------------------------------------------------------------

// Schema for updating profile (Ideally this moves to shared/types.ts in a full impl)
export const UpdateExpertProfileSchema = z.object({
  headline: z.string().max(100).optional(),
  bio: z.string().max(2000).optional(),
  hourlyRate: z.number().min(0).optional(),
  specialties: z.array(z.string()).max(10).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateExpertProfileInput = z.infer<typeof UpdateExpertProfileSchema>;

/**
 * GET PROFILE HANDLER (Public)
 * GET /experts/:username
 */
export async function getProfileHandler(
  request: FastifyRequest<{ Params: { username: string } }>,
  reply: FastifyReply
) {
  const { username } = request.params;
  const redis = request.server.redis; // Access Redis via Fastify instance

  const expert = await expertService.getExpertByUsername(username, redis);

  return reply.status(200).send({
    success: true,
    data: expert,
  });
}

/**
 * UPDATE PROFILE HANDLER (Protected)
 * PATCH /experts/me
 */
export async function updateProfileHandler(
  request: FastifyRequest<{ Body: UpdateExpertProfileInput }>,
  reply: FastifyReply
) {
  // User is attached by 'authenticate' middleware
  const user = request.user;
  const redis = request.server.redis;

  // 2. Update
  const updatedExpert = await expertService.updateExpertProfile(
    user.id, // The ID in the token is the Expert ID 
    request.body,
    redis
  );

  return reply.status(200).send({
    success: true,
    message: 'Profile updated successfully',
    data: updatedExpert,
  });
}