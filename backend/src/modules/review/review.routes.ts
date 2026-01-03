import { FastifyInstance } from 'fastify';
import * as reviewController from './review.controller.js';
import { CreateReviewSchema, GetProviderReviewsSchema } from '../../../../shared/types.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// REVIEW MODULE - ROUTES
// --------------------------------------------------------------------------
// Purpose: API endpoints for marketplace feedback.
// Standards: 
// - Public read access for profile transparency.
// - Strict RBAC for review creation.
// - Schema-based request/response validation.
// --------------------------------------------------------------------------

export async function reviewRoutes(app: FastifyInstance) {
  /**
   * CREATE REVIEW
   * Restricted: Only Users (Clients) who completed a booking can review.
   */
  app.post('/', {
    schema: { body: CreateReviewSchema },
    onRequest: [authenticate, authorize([ROLES.USER])],
    handler: reviewController.createReviewHandler,
  });

  /**
   * GET PROVIDER REVIEWS
   * Public: Displayed on Expert/Organization profile pages.
   */
  app.get('/provider/:providerId', {
    schema: GetProviderReviewsSchema,
    handler: reviewController.getProviderReviewsHandler,
  });
}