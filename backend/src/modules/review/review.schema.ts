import { z } from 'zod';

// --------------------------------------------------------------------------
// REVIEW MODULE - SCHEMAS
// --------------------------------------------------------------------------
// Purpose: Validation for marketplace feedback.
// Standards: 
// - Strict numeric range for ratings (1-5).
// - Character limits on comments to prevent DB bloat.
// - Required relation links (bookingId).
// --------------------------------------------------------------------------

/**
 * CREATE REVIEW SCHEMA
 * POST /reviews
 */
export const createReviewSchema = z.object({
  body: z.object({
    bookingId: z.string().uuid('Invalid Booking ID'),
    rating: z.number()
      .int()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z.string()
      .max(1000, 'Comment is too long (max 1000 characters)')
      .optional(),
  }),
});

/**
 * GET REVIEWS SCHEMA
 * GET /reviews/provider/:providerId
 */
export const getProviderReviewsSchema = z.object({
  params: z.object({
    providerId: z.string().uuid(),
  }),
  query: z.object({
    type: z.enum(['expert', 'organization']),
  }),
});

// TypeScript Types
export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];