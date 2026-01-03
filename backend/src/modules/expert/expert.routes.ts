import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import * as expertController from './expert.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES, ExpertSearchSchema, UpdateExpertProfileSchema } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// EXPERT ROUTES
// --------------------------------------------------------------------------

export async function expertRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // 1. SEARCH EXPERTS (Public)
  // Gold Standard: Placed before /:username to avoid route collision.
  router.get(
    '/search',
    {
      schema: {
        description: 'Search and filter experts with pagination',
        tags: ['Expert'],
        querystring: ExpertSearchSchema.shape.query,
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.any() // Structured response handled in service/shared types
          }),
        },
      },
    },
    expertController.searchExpertsHandler
  );

  // 2. GET BY USERNAME (Public)
  router.get(
    '/:username',
    {
      schema: {
        description: 'Get public expert profile by username',
        tags: ['Expert'],
        params: z.object({
          username: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.object({
              id: z.string(),
              name: z.string(),
              username: z.string(),
              avatarUrl: z.string().nullable(),
              headline: z.string().nullable(),
              bio: z.string().nullable(),
              hourlyRate: z.number().nullable(),
              specialties: z.array(z.string()),
              isVerified: z.boolean(),
              createdAt: z.date(),
            }),
          }),
        },
      },
    },
    expertController.getProfileHandler
  );

  // 3. PATCH ME (Protected)
  router.patch(
    '/me',
    {
      onRequest: [authenticate, authorize([ROLES.EXPERT])],
      schema: {
        description: 'Update own expert profile',
        tags: ['Expert'],
        body: UpdateExpertProfileSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              headline: z.string().nullable(),
              bio: z.string().nullable(),
              hourlyRate: z.number().nullable(),
              specialties: z.array(z.string()),
            }),
          }),
        },
      },
    },
    expertController.updateProfileHandler as any
  );
}