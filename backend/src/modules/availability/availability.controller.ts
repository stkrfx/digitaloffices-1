import { FastifyReply, FastifyRequest } from 'fastify';
import * as availabilityService from './availability.service.js';
import { SyncAvailabilityInput } from './availability.schema.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// AVAILABILITY MODULE - CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Orchestrate HTTP requests for Expert schedules.
// Standards: 
// - Secure context extraction (request.user).
// - Clean status code responses.
// - Explicit role checks for "Write" operations.
// --------------------------------------------------------------------------

/**
 * SYNC AVAILABILITY HANDLER
 * PUT /availability
 */
export async function syncAvailabilityHandler(
  request: FastifyRequest<{ Body: SyncAvailabilityInput }>,
  reply: FastifyReply
) {
  const user = request.user;

  // Gold Standard: Defensive check. 
  // Although the route guard handles this, we verify role for type-safety and clarity.
  if (user.role !== ROLES.EXPERT) {
    return reply.status(403).send({
      success: false,
      message: 'Only Experts can manage availability',
    });
  }

  const availability = await availabilityService.syncAvailability(
    user.id,
    request.body.slots
  );

  return reply.status(200).send({
    success: true,
    message: 'Schedule updated successfully',
    data: availability,
  });
}

/**
 * GET EXPERT AVAILABILITY HANDLER
 * GET /availability/:expertId
 */
export async function getExpertAvailabilityHandler(
  request: FastifyRequest<{ Params: { expertId: string } }>,
  reply: FastifyReply
) {
  const { expertId } = request.params;

  const availability = await availabilityService.getAvailabilityByExpert(expertId);

  return reply.status(200).send({
    success: true,
    data: availability,
  });
}