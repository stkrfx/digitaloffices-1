import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as userService from './user.service.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// USER CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Handle HTTP requests for User profiles.
// Standards:
// - Protected endpoints (User Only).
// - Validates input using Zod.
// --------------------------------------------------------------------------

export const UpdateUserProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  promotionalEmailsEnabled: z.boolean().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>;

/**
 * GET ME HANDLER (Private Profile)
 * GET /users/me
 */
export async function getMeHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user; // From authenticate middleware

  const profile = await userService.getUserById(user.id);

  return reply.status(200).send({
    success: true,
    data: profile,
  });
}

/**
 * UPDATE ME HANDLER
 * PATCH /users/me
 */
export async function updateMeHandler(
  request: FastifyRequest<{ Body: UpdateUserProfileInput }>,
  reply: FastifyReply
) {
  const user = request.user;

  if (user.role !== ROLES.USER) {
    return reply.status(403).send({
      success: false,
      message: 'Access restricted to Users',
    });
  }

  const updatedProfile = await userService.updateUserProfile(
    user.id,
    request.body
  );

  return reply.status(200).send({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile,
  });
}