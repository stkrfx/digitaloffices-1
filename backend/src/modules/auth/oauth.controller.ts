import { FastifyReply, FastifyRequest } from 'fastify';
import * as oauthService from './oauth.service.js';
import { Role, ROLES } from '../../../../shared/types.js';
import { env } from '../../env.js';

// --------------------------------------------------------------------------
// OAUTH CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Handle Google OAuth HTTP requests.
// Standards:
// - Replicates Cookie Security Standards from Auth Controller 
// - Handles Hybrid Flow (Frontend sends ID Token) 
// --------------------------------------------------------------------------

// Cookie Configuration (Must match AuthController for consistency)
const ACCESS_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
  signed: false,
  maxAge: 15 * 60, // 15 Minutes
};

const REFRESH_COOKIE_OPTIONS = {
  path: '/auth',
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
  signed: false,
  maxAge: 7 * 24 * 60 * 60, // 7 Days
};

/**
 * GOOGLE LOGIN HANDLER
 * POST /auth/{role}/google
 */
export async function googleLoginHandler(
  request: FastifyRequest<{ 
    Params: { role: Role }; 
    Body: { idToken: string } 
  }>,
  reply: FastifyReply
) {
  const { role } = request.params;
  const { idToken } = request.body;
  const ipAddress = request.ip || '0.0.0.0';
  const userAgent = request.headers['user-agent'] || 'Unknown';

  // Validate Role
  if (!Object.values(ROLES).includes(role)) {
    return reply.status(400).send({ success: false, message: 'Invalid role' });
  }

  // Delegate to Service
  const { accessTokenPayload, refreshToken, account } = await oauthService.loginWithGoogle(
    role, 
    idToken, 
    ipAddress, 
    userAgent
  );

  // 1. Sign Access Token
  const accessToken = await reply.jwtSign(accessTokenPayload);

  // 2. Set Cookies
  reply.setCookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
  reply.setCookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  return reply.status(200).send({
    success: true,
    message: 'Google login successful',
    data: account,
  });
}