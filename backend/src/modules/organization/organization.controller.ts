import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as organizationService from './organization.service.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// ORGANIZATION CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Handle HTTP requests for Organization profiles.
// Standards:
// - Protected endpoints (Organization Only).
// - Validates input using Zod.
// --------------------------------------------------------------------------

export const UpdateOrganizationProfileSchema = z.object({
  companyName: z.string().min(2).optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  regNumber: z.string().optional(),
});

export type UpdateOrganizationProfileInput = z.infer<typeof UpdateOrganizationProfileSchema>;

/**
 * GET ME HANDLER (Private Profile)
 * GET /organizations/me
 */
export async function getMeHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user; // From authenticate middleware

  const profile = await organizationService.getOrganizationById(user.id);

  return reply.status(200).send({
    success: true,
    data: profile,
  });
}

/**
 * UPDATE ME HANDLER
 * PATCH /organizations/me
 */
export async function updateMeHandler(
  request: FastifyRequest<{ Body: UpdateOrganizationProfileInput }>,
  reply: FastifyReply
) {
  const user = request.user;

  if (user.role !== ROLES.ORGANIZATION) {
    return reply.status(403).send({
      success: false,
      message: 'Access restricted to Organizations',
    });
  }

  const updatedProfile = await organizationService.updateOrganizationProfile(
    user.id,
    request.body
  );

  return reply.status(200).send({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile,
  });
}