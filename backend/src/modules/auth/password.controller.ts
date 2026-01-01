import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as passwordService from './password.service.js';
import { Role, ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// PASSWORD CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Expose password management endpoints (Forgot/Reset).
// Standards:
// - Validates inputs using Zod schemas within the route definition or manual check.
// - Returns standard success responses even if email is not found (Security).
// --------------------------------------------------------------------------

/**
 * FORGOT PASSWORD HANDLER
 * POST /auth/{role}/forgot-password
 */
export async function forgotPasswordHandler(
  request: FastifyRequest<{ 
    Params: { role: Role }; 
    Body: { email: string } 
  }>,
  reply: FastifyReply
) {
  const { role } = request.params;
  const { email } = request.body;

  // Validate Role
  if (!Object.values(ROLES).includes(role)) {
    return reply.status(400).send({ success: false, message: 'Invalid role' });
  }

  // Delegate to service (Fire and forget, or await)
  // We await to ensure errors are caught, but we always return success for security
  await passwordService.forgotPassword(role, email);

  // Return generic message 
  return reply.status(200).send({
    success: true,
    message: 'If an account exists with this email, you will receive a password reset link.',
  });
}

/**
 * RESET PASSWORD HANDLER
 * POST /auth/reset-password
 */
export async function resetPasswordHandler(
  request: FastifyRequest<{ 
    Body: { token: string; newPassword: string } 
  }>,
  reply: FastifyReply
) {
  const { token, newPassword } = request.body;

  const result = await passwordService.resetPassword(token, newPassword);

  return reply.status(200).send({
    success: true,
    message: result.message,
  });
}