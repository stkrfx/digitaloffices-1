import { FastifyInstance } from 'fastify';
import * as availabilityController from './availability.controller.js';
import * as availabilitySchema from './availability.schema.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// AVAILABILITY MODULE - ROUTES
// --------------------------------------------------------------------------
// Purpose: Define API endpoints for managing Expert working hours.
// Standards: 
// - Public discovery for "Read" operations.
// - Strict RBAC for "Write" operations.
// - Schema-based validation for request/response integrity.
// --------------------------------------------------------------------------

export async function availabilityRoutes(app: FastifyInstance) {
  /**
   * GET EXPERT AVAILABILITY
   * Public: Needed for clients to see bookable slots on the profile page.
   */
  app.get('/:expertId', {
    schema: availabilitySchema.getAvailabilitySchema,
    handler: availabilityController.getExpertAvailabilityHandler,
  });

  /**
   * SYNC AVAILABILITY
   * Protected: Only the Expert themselves can update their schedule.
   */
  app.put('/', {
    schema: availabilitySchema.syncAvailabilitySchema,
    onRequest: [authenticate, authorize([ROLES.EXPERT])],
    handler: availabilityController.syncAvailabilityHandler,
  });
}