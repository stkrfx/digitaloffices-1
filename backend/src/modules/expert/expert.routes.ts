import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import * as expertController from './expert.controller.js';
import { authenticate } from '../../middleware/auth.js';

// --------------------------------------------------------------------------
// EXPERT ROUTES
// --------------------------------------------------------------------------
// Purpose: Expose Expert profile management endpoints.
// Standards:
// - Uses 'fastify-type-provider-zod' 
// - Public Read / Protected Write 
// --------------------------------------------------------------------------

export async function expertRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // GET /experts/:username
  // Publicly accessible, cached via Redis in the service layer
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
              hourlyRate: z.any(), // Decimal types can be tricky in JSON, often string/number
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

  // PATCH /experts/me
  // Protected: Only the logged-in expert can update their own profile
  router.patch(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Update own expert profile',
        tags: ['Expert'],
        body: expertController.UpdateExpertProfileSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              headline: z.string().nullable(),
              bio: z.string().nullable(),
              hourlyRate: z.any(),
              specialties: z.array(z.string()),
            }),
          }),
        },
      },
    },
    expertController.updateProfileHandler as any
  );
}