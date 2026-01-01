import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ROLES } from '../../../../shared/types.js';
import * as passwordController from './password.controller.js';

// --------------------------------------------------------------------------
// PASSWORD ROUTES
// --------------------------------------------------------------------------
// Purpose: Expose password recovery endpoints.
// Standards:
// - Validates role for forgot-password.
// - Strict Zod validation for inputs.
// --------------------------------------------------------------------------

export async function passwordRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  // POST /auth/:role/forgot-password
  router.post(
    '/:role/forgot-password',
    {
      schema: {
        description: 'Request a password reset email',
        tags: ['Auth'],
        params: z.object({
          role: z.enum([ROLES.USER, ROLES.EXPERT, ROLES.ORGANIZATION, ROLES.ADMIN]),
        }),
        body: z.object({
          email: z.string().email(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    passwordController.forgotPasswordHandler
  );

  // POST /auth/reset-password
  router.post(
    '/reset-password',
    {
      schema: {
        description: 'Reset password using a valid token',
        tags: ['Auth'],
        body: z.object({
          token: z.string(),
          newPassword: z.string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[0-9]/, "Password must contain at least one number")
            .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    passwordController.resetPasswordHandler
  );
}