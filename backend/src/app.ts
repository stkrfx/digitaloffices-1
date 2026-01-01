import fastify, { FastifyInstance } from 'fastify';
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
    secret: env.JWT_SECRET, // Used for signing cookies if needed
    hook: 'onRequest',
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

  // 9. Global Error Handler
  app.setErrorHandler((error, request, reply) => {
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
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_COOKIE' || error.statusCode === 401) {
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