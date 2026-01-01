import { FastifyReply, FastifyRequest } from 'fastify';
import { Role, JwtPayload } from '../../../shared/types.js';

// --------------------------------------------------------------------------
// AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// --------------------------------------------------------------------------
// Purpose: Protect routes using the "Dual Token" strategy.
// Standards:
// - Verifies JWT Access Token from HttpOnly Cookie 
// - Enforces Role-Based Access Control (RBAC) 
// --------------------------------------------------------------------------

// Extend FastifyRequest to include user info
declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: JwtPayload;
    }
}

/**
 * Global Guard: Verifies that a valid Access Token exists.
 * If valid, attaches the payload to `req.user`.
 * If invalid/missing, throws 401.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
        // 1. Verify JWT (Checks signature and expiration)
        // The @fastify/jwt plugin automatically looks for the cookie configured in app.ts ('accessToken')
        await request.jwtVerify();

        // 2. Attach payload to request object for downstream controllers
        // request.user is automatically populated by jwtVerify, but we ensure typing match
        const user = request.user as JwtPayload;

        if (!user.id || !user.role) {
            throw new Error('Invalid Token Payload');
        }
}

/**
 * RBAC Guard: Factory function to enforce specific roles.
 * Usage: `onRequest: [authenticate, authorize(['admin', 'expert'])]`
 */
export function authorize(allowedRoles: Role[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        // This assumes `authenticate` has already run and populated `request.user`
        const user = request.user;

        if (!user || !allowedRoles.includes(user.role)) {
            reply.status(403).send({
                success: false,
                message: 'Forbidden: Insufficient permissions',
                error: {
                    code: 'FORBIDDEN',
                    details: `User role '${user?.role}' is not in allowed roles: [${allowedRoles.join(', ')}]`
                },
            });
        }
    };
}