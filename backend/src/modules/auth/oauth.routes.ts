import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ROLES } from '../../../../shared/types.js';
import * as oauthController from './oauth.controller.js';

// --------------------------------------------------------------------------
// OAUTH ROUTES
// --------------------------------------------------------------------------
// Purpose: Expose Google Login endpoint.
// Standards:
// - Validates role and token inputs 
// - Uses Zod for strict schema validation 
// --------------------------------------------------------------------------

export async function oauthRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // POST /auth/:role/google
  router.post(
    '/:role/google',
    {
      schema: {
        description: 'Login or Register with Google ID Token',
        tags: ['Auth'],
        params: z.object({
          role: z.enum([ROLES.USER, ROLES.EXPERT, ROLES.ORGANIZATION]), // Admin usually not via public OAuth
        }),
        body: z.object({
          idToken: z.string().min(1, "Google ID Token is required"),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string().optional(),
            }),
          }),
        },
      },
    },
    oauthController.googleLoginHandler
  );
}