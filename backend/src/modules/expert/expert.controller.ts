import { FastifyReply, FastifyRequest } from 'fastify';
import * as expertService from './expert.service.js';
import { 
  ExpertSearchInput, 
  UpdateExpertProfileInput 
} from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// EXPERT CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Orchestrate HTTP requests for Expert discovery and management.
// Standards:
// - Imports shared types to maintain universality.
// - Delegated heavy lifting to the Service layer.
// --------------------------------------------------------------------------

/**
 * SEARCH EXPERTS HANDLER (Public)
 * GET /experts/search
 */
export async function searchExpertsHandler(
  request: FastifyRequest<{ Querystring: ExpertSearchInput }>,
  reply: FastifyReply
) {
  // Gold Standard: Query logic is isolated in the service for testing and reuse
  const result = await expertService.searchExperts(request.query);

  return reply.status(200).send({
    success: true,
    data: result,
  });
}

/**
 * GET PROFILE HANDLER (Public)
 * GET /experts/:username
 */
export async function getProfileHandler(
  request: FastifyRequest<{ Params: { username: string } }>,
  reply: FastifyReply
) {
  const { username } = request.params;
  const redis = request.server.redis;

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
  const user = request.user;
  const redis = request.server.redis;

  const updatedExpert = await expertService.updateExpertProfile(
    user.id, 
    request.body,
    redis
  );

  return reply.status(200).send({
    success: true,
    message: 'Profile updated successfully',
    data: updatedExpert,
  });
}