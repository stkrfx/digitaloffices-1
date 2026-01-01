import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { 
  UserRegisterSchema, 
  ExpertRegisterSchema, 
  OrganizationRegisterSchema, 
  LoginSchema,
  ROLES 
} from '../../../../shared/types.js';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

// --------------------------------------------------------------------------
// AUTHENTICATION ROUTES
// --------------------------------------------------------------------------
// Purpose: Define API endpoints and attach Zod schemas for validation.
// Standards:
// - Uses 'fastify-type-provider-zod' for automatic validation 
// - Routes match strictly to the Prompt requirements 
// --------------------------------------------------------------------------

export async function authRoutes(app: FastifyInstance) {
  // Use Zod Type Provider
  const router = app.withTypeProvider<ZodTypeProvider>();

  // --------------------------------------------------------------------------
  // PUBLIC ROUTES
  // --------------------------------------------------------------------------

  // POST /auth/:role/register
  // We use a Union Schema here because the body shape depends on the Role.
  // The service layer will perform specific logic.
  router.post(
    '/:role/register',
    {
      schema: {
        description: 'Register a new account (User, Expert, or Organization)',
        tags: ['Auth'],
        params: z.object({
          role: z.enum([ROLES.USER, ROLES.EXPERT, ROLES.ORGANIZATION]),
        }),
        body: z.union([
          UserRegisterSchema, 
          ExpertRegisterSchema, 
          OrganizationRegisterSchema
        ]),
        response: {
          201: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              email: z.string(),
              role: z.string(),
            }),
          }),
        },
      },
    },
    authController.registerHandler
  );

  // POST /auth/:role/login
  router.post(
    '/:role/login',
    {
      schema: {
        description: 'Login and receive HttpOnly Cookies (Dual Token)',
        tags: ['Auth'],
        params: z.object({
          role: z.enum([ROLES.USER, ROLES.EXPERT, ROLES.ORGANIZATION, ROLES.ADMIN]),
        }),
        body: LoginSchema,
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
    authController.loginHandler
  );

  // POST /auth/refresh
  router.post(
    '/refresh',
    {
      schema: {
        description: 'Rotate sessions using the Refresh Token cookie',
        tags: ['Auth'],
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    authController.refreshHandler
  );

  // POST /auth/logout
  router.post(
    '/logout',
    {
      schema: {
        description: 'Revoke session and clear cookies',
        tags: ['Auth'],
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    authController.logoutHandler
  );

  // --------------------------------------------------------------------------
  // PROTECTED ROUTES
  // --------------------------------------------------------------------------

  // GET /auth/me
  router.get(
    '/me',
    {
      onRequest: [authenticate], // Verify Access Token
      schema: {
        description: 'Get current session details',
        tags: ['Auth'],
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.object({
              id: z.string(),
              role: z.string(),
              iat: z.number().optional(),
              exp: z.number().optional(),
            }),
          }),
        },
      },
    },
    authController.meHandler
  );
}