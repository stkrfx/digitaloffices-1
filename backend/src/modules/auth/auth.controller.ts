import { FastifyReply, FastifyRequest } from 'fastify';
import * as authService from './auth.service.js';
import { 
  Role, 
  ROLES, 
  UserRegisterInput, 
  ExpertRegisterInput, 
  OrganizationRegisterInput, 
  LoginInput,
  JwtPayload
} from '../../../../shared/types.js';
import { env } from '../../env.js';

// --------------------------------------------------------------------------
// AUTHENTICATION CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Handle HTTP Request/Response, Cookie Management, and Service Delegation.
// Standards:
// - HttpOnly Cookies for Dual Tokens 
// - Production-ready Cookie Security (Secure, SameSite, Domain) 
// - Standardized JSON Responses 
// --------------------------------------------------------------------------

// Cookie Configuration Helpers
const ACCESS_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Allows top-level navigation
  domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
  signed: false, // We verify the JWT signature inside the value
  maxAge: 15 * 60, // 15 Minutes 
};

const REFRESH_COOKIE_OPTIONS = {
  path: '/auth', // Restrict to auth routes (refresh/logout) 
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
  signed: false, // Opaque string
  maxAge: 7 * 24 * 60 * 60, // 7 Days 
};

/**
 * REGISTER HANDLER
 */
export async function registerHandler(
  request: FastifyRequest<{ 
    Params: { role: Role }; 
    Body: UserRegisterInput | ExpertRegisterInput | OrganizationRegisterInput 
  }>,
  reply: FastifyReply
) {
  const { role } = request.params;
  const body = request.body;

  // Validate Role Param just in case (Zod schema in route handles this too usually)
  if (!Object.values(ROLES).includes(role)) {
    return reply.status(400).send({ success: false, message: 'Invalid role' });
  }

  const result = await authService.register(role, body);

  return reply.status(201).send({
    success: true,
    message: result.message,
    data: { id: result.id, email: result.email, role: result.role }
  });
}

/**
 * LOGIN HANDLER
 */
export async function loginHandler(
  request: FastifyRequest<{ Params: { role: Role }; Body: LoginInput }>,
  reply: FastifyReply
) {
  const { role } = request.params;
  const { email, password } = request.body;
  const ipAddress = request.ip || '0.0.0.0'; // Fallback
  const userAgent = request.headers['user-agent'] || 'Unknown';

  const { accessTokenPayload, refreshToken, account } = await authService.login(
    role, 
    { email, password }, 
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
    message: 'Login successful',
    data: account, // Don't send tokens in body 
  });
}

/**
 * REFRESH HANDLER
 */
export async function refreshHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const refreshToken = request.cookies.refreshToken;
  const ipAddress = request.ip || '0.0.0.0';
  const userAgent = request.headers['user-agent'] || 'Unknown';

  if (!refreshToken) {
    return reply.status(401).send({
      success: false,
      message: 'No refresh token provided',
      error: { code: 'UNAUTHORIZED' }
    });
  }

  try {
    const { accessTokenPayload, refreshToken: newRefreshToken } = await authService.refresh(
      refreshToken, 
      ipAddress, 
      userAgent
    );

    // 1. Sign New Access Token
    const accessToken = await reply.jwtSign(accessTokenPayload);

    // 2. Set New Cookies (Rotation)
    reply.setCookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    reply.setCookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return reply.status(200).send({
      success: true,
      message: 'Session refreshed',
    });

  } catch (error) {
    // If refresh fails, clear cookies
    reply.clearCookie('accessToken', { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
    reply.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
    throw error; // Let global error handler process the specific message
  }
}

/**
 * LOGOUT HANDLER
 */
export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const refreshToken = request.cookies.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  // Clear cookies regardless of whether token was found in DB
  reply.clearCookie('accessToken', { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
  reply.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

  return reply.status(200).send({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * ME HANDLER (Session Check)
 */
export async function meHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Request.user is populated by 'authenticate' middleware
  const user = request.user; 
  
  return reply.status(200).send({
    success: true,
    data: user, // Returns { id, role }
  });
}