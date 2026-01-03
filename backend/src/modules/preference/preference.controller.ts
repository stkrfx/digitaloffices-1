import { FastifyReply, FastifyRequest } from 'fastify';
import * as preferenceService from './preference.service.js';
import { UpdatePreferenceInput } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// PREFERENCE MODULE - CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Orchestrate HTTP requests for UI/UX settings.
// Standards: 
// - Session-based identity extraction.
// - Role-agnostic preference handling.
// - Clean status code management.
// --------------------------------------------------------------------------

/**
 * GET PREFERENCES HANDLER
 * GET /preferences
 */
export async function getPreferencesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Extract identity and role from the authenticated session
  const { id, role } = request.user;

  const preferences = await preferenceService.getPreferences(id, role);

  return reply.status(200).send({
    success: true,
    data: preferences,
  });
}

/**
 * UPDATE PREFERENCES HANDLER
 * PATCH /preferences
 */
export async function updatePreferencesHandler(
  request: FastifyRequest<{ Body: UpdatePreferenceInput }>,
  reply: FastifyReply
) {
  const { id, role } = request.user;

  const updatedPreferences = await preferenceService.updatePreferences(
    id,
    role,
    request.body
  );

  return reply.status(200).send({
    success: true,
    message: 'Preferences updated successfully',
    data: updatedPreferences,
  });
}