import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import * as organizationController from './organization.controller.js';
import { authenticate } from '../../middleware/auth.js';

// --------------------------------------------------------------------------
// ORGANIZATION ROUTES
// --------------------------------------------------------------------------
// Purpose: Expose Organization profile management endpoints.
// Standards:
// - Uses 'fastify-type-provider-zod' 
// - Protected endpoints (Organization only)
// --------------------------------------------------------------------------

export async function organizationRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // GET /organizations/me
  router.get(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get own organization profile',
        tags: ['Organization'],
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.object({
              id: z.string(),
              email: z.string(),
              companyName: z.string(),
              logoUrl: z.string().nullable(),
              websiteUrl: z.string().nullable(),
              regNumber: z.string().nullable(),
              createdAt: z.date(),
              googleId: z.string().nullable(),
            }),
          }),
        },
      },
    },
    organizationController.getMeHandler
  );

  // PATCH /organizations/me
  router.patch(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Update own organization profile',
        tags: ['Organization'],
        body: organizationController.UpdateOrganizationProfileSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              email: z.string(),
              companyName: z.string(),
              logoUrl: z.string().nullable(),
              websiteUrl: z.string().nullable(),
              regNumber: z.string().nullable(),
            }),
          }),
        },
      },
    },
    organizationController.updateMeHandler
  );
}