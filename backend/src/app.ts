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
import { registerCleanupJob } from './jobs/cleanup.js';

// Route Imports
import { authRoutes } from './modules/auth/auth.routes.js';
import { oauthRoutes } from './modules/auth/oauth.routes.js';
import { passwordRoutes } from './modules/auth/password.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { expertRoutes } from './modules/expert/expert.routes.js';
import { organizationRoutes } from './modules/organization/organization.routes.js';
import { serviceRoutes } from './modules/service/service.routes.js';
import { availabilityRoutes } from './modules/availability/availability.routes.js';
import { bookingRoutes } from './modules/booking/booking.routes.js';
import { reviewRoutes } from './modules/review/review.routes.js';
import { preferenceRoutes } from './modules/preference/preference.routes.js';

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
        disableRequestLogging: env.NODE_ENV === 'production',
    }).withTypeProvider<ZodTypeProvider>();

    // 1. Validation & Serialization (Zod)
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // 2. Security Headers
    await app.register(helmet, { global: true });

    // 3. CORS
    await app.register(cors, {
        origin: [env.FRONTEND_URL],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // 4. Redis
    await app.register(redis, {
        url: env.REDIS_URL,
        closeClient: true,
    });

    // 5. Rate Limiting
    await app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        redis: app.redis,
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
            signed: false,
        },
        sign: {
            expiresIn: '15m',
        },
    });

    // 8. Scheduling
    await app.register(fastifySchedule);
    registerCleanupJob(app);

    // 9. Feature Module Routes
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(oauthRoutes, { prefix: '/auth' });
    await app.register(passwordRoutes, { prefix: '/auth' });

    // Resource-specific routes
    await app.register(userRoutes, { prefix: '/users' });
    await app.register(expertRoutes, { prefix: '/experts' });
    await app.register(organizationRoutes, { prefix: '/organizations' });

    // Domain Specific (New Modules)
    await app.register(serviceRoutes, { prefix: '/services' });
    await app.register(availabilityRoutes, { prefix: '/availability' });
    await app.register(bookingRoutes, { prefix: '/bookings' });
    await app.register(reviewRoutes, { prefix: '/reviews' });
    await app.register(preferenceRoutes, { prefix: '/preferences' });

    // 10. Global Error Handler
    app.setErrorHandler((error: FastifyError, request, reply) => {
        request.log.error(error);

        if (error instanceof ZodError) {
            return reply.status(422).send({
                success: false,
                message: 'Validation Error',
                error: { code: 'VALIDATION_ERROR', details: error.issues },
            });
        }

        if (error.statusCode === 401 || error.code?.startsWith('FST_JWT_')) {
            return reply.status(401).send({
                success: false,
                message: 'Unauthorized',
                error: { code: 'UNAUTHORIZED' },
            });
        }

        const statusCode = error.statusCode || 500;
        const message = error.statusCode === 500 && env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : error.message;

        return reply.status(statusCode).send({
            success: false,
            message,
            error: { code: error.code || 'INTERNAL_SERVER_ERROR' },
        });
    });

    // 11. Health Check
    app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    app.addHook('onClose', async () => {
        await disconnectDB();
    });

    return app;
}