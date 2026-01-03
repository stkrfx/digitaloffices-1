import { FastifyReply, FastifyRequest } from 'fastify';
import * as reviewService from './review.service.js';
import { CreateReviewInput } from './review.schema.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// REVIEW MODULE - CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Orchestrate HTTP requests for the Feedback system.
// Standards: 
// - Secure context extraction (request.user).
// - Contextual role validation.
// - Clean status code management.
// --------------------------------------------------------------------------

/**
 * CREATE REVIEW HANDLER
 * POST /reviews
 */
export async function createReviewHandler(
  request: FastifyRequest<{ Body: CreateReviewInput }>,
  reply: FastifyReply
) {
  const user = request.user; // Populated by authenticate middleware

  // Gold Standard: Only standard Users (Clients) can write reviews
  if (user.role !== ROLES.USER) {
    return reply.status(403).send({
      success: false,
      message: 'Only clients can leave reviews',
    });
  }

  const review = await reviewService.createReview({
    ...request.body,
    userId: user.id,
  });

  return reply.status(201).send({
    success: true,
    message: 'Review submitted successfully',
    data: review,
  });
}

/**
 * GET PROVIDER REVIEWS HANDLER
 * GET /reviews/provider/:providerId?type=expert
 */
export async function getProviderReviewsHandler(
  request: FastifyRequest<{ 
    Params: { providerId: string }; 
    Querystring: { type: 'expert' | 'organization' } 
  }>,
  reply: FastifyReply
) {
  const { providerId } = request.params;
  const { type } = request.query;

  // Execute both data fetch and summary in parallel for better performance
  const [reviews, summary] = await Promise.all([
    reviewService.getProviderReviews(providerId, type),
    reviewService.getProviderRatingSummary(providerId, type),
  ]);

  return reply.status(200).send({
    success: true,
    data: {
      summary,
      reviews,
    },
  });
}