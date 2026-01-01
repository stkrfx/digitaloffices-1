import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import * as userController from './user.controller.js';
import { authenticate } from '../../middleware/auth.js';

// --------------------------------------------------------------------------
// USER ROUTES
// --------------------------------------------------------------------------
// Purpose: Expose User profile management endpoints.
// Standards:
// - Uses 'fastify-type-provider-zod' 
// - Protected endpoints (User only)
// --------------------------------------------------------------------------

export async function userRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // GET /users/me
  router.get(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get own user profile',
        tags: ['User'],
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              avatarUrl: z.string().nullable(),
              promotionalEmailsEnabled: z.boolean(),
              createdAt: z.date(),
              googleId: z.string().nullable(),
            }),
          }),
        },
      },
    },
    userController.getMeHandler
  );

  // PATCH /users/me
  router.patch(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Update own user profile',
        tags: ['User'],
        body: userController.UpdateUserProfileSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              avatarUrl: z.string().nullable(),
              promotionalEmailsEnabled: z.boolean(),
            }),
          }),
        },
      },
    },
    userController.updateMeHandler as any
  );
}