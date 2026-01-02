import fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import redis from '@fastify/redis';
import { fastifySchedule } from '@fastify/schedule';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import { env } from './env.js';
import { disconnectDB } from './db/index.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { oauthRoutes } from './modules/auth/oauth.routes.js';
import { passwordRoutes } from './modules/auth/password.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { expertRoutes } from './modules/expert/expert.routes.js';
import { organizationRoutes } from './modules/organization/organization.routes.js';

// --------------------------------------------------------------------------
// APPLICATION FACTORY
// --------------------------------------------------------------------------
// "Gold Standard" Fastify Setup:
// - Zod Type Provider for end-to-end type safety
// - Strict Security Headers (Helmet, CORS)
// - Centralized Error Handling
// - Plugin Registration (Redis, JWT, Cookies)
// --------------------------------------------------------------------------

export async function buildApp(): Promise<FastifyInstance> {
    const app = fastify({
        logger: env.NODE_ENV === 'development' ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
        } : true,
        disableRequestLogging: env.NODE_ENV === 'production', // Reduce noise in prod
    }).withTypeProvider<ZodTypeProvider>();

    // 1. Validation (Zod)
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // 2. Security Headers
    await app.register(helmet, {
        global: true,
    });

    // 3. CORS
    await app.register(cors, {
        origin: [env.FRONTEND_URL], // Strict origin
        credentials: true, // Allow cookies
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // 4. Redis (Caching & Rate Limiting Storage)
    await app.register(redis, {
        url: env.REDIS_URL,
        closeClient: true, // Fastify handles closing
    });

    // 5. Rate Limiting (DDoS Protection)
    await app.register(rateLimit, {
        max: 100, // Default max requests
        timeWindow: '1 minute',
        redis: app.redis, // Use Redis for distributed state
    });

    // 6. Cookies
    await app.register(cookie, {
        secret: env.JWT_SECRET,
        hook: 'onRequest',
        parseOptions: {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: env.COOKIE_DOMAIN,
            path: '/',
        }
    });

    // 7. JWT
    await app.register(jwt, {
        secret: env.JWT_SECRET,
        cookie: {
            cookieName: 'accessToken',
            signed: false, // We verify via JWT signature, not cookie signature
        },
        sign: {
            expiresIn: '15m', // Short-lived Access Token 
        },
    });

    // 8. Scheduling (Cron Jobs)
    await app.register(fastifySchedule);

    // 9. Feature Module Routes
    // All Auth-related routes (Registration, Login, Refresh, Password Reset, OAuth)
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(oauthRoutes, { prefix: '/auth' });
    await app.register(passwordRoutes, { prefix: '/auth' });

    // Resource-specific routes
    await app.register(userRoutes, { prefix: '/users' });
    await app.register(expertRoutes, { prefix: '/experts' });
    await app.register(organizationRoutes, { prefix: '/organizations' });

    // 9. Global Error Handler
    app.setErrorHandler((error: FastifyError, request, reply) => {
        // Log error
        request.log.error(error);

        // Handle Zod Validation Errors
        if (error instanceof ZodError) {
            return reply.status(422).send({
                success: false,
                message: 'Validation Error',
                error: {
                    code: 'VALIDATION_ERROR',
                    details: error.issues,
                },
            });
        }

        // Handle Fastify Validation Errors (Legacy/Fallback)
        if (error.validation) {
            return reply.status(422).send({
                success: false,
                message: 'Validation Error',
                error: {
                    code: 'VALIDATION_ERROR',
                    details: error.validation,
                },
            });
        }

        // Handle JWT Errors
        if (error.statusCode === 401 || error.code?.startsWith('FST_JWT_')) {
            return reply.status(401).send({
                success: false,
                message: 'Unauthorized',
                error: { code: 'UNAUTHORIZED' },
            });
        }

        // Default 500
        const statusCode = error.statusCode || 500;
        const message = error.statusCode === 500 && env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : error.message;

        return reply.status(statusCode).send({
            success: false,
            message,
            error: {
                code: error.code || 'INTERNAL_SERVER_ERROR',
            },
        });
    });

    // 10. Health Check
    app.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Graceful Shutdown Hook
    app.addHook('onClose', async () => {
        await disconnectDB();
    });

    return app;
}