import { z } from 'zod';

// --------------------------------------------------------------------------
// ENVIRONMENT VARIABLE VALIDATION (STRICT)
// --------------------------------------------------------------------------
// Objective: "Gold Standard" security & configuration.
// Fails immediately if required secrets are missing.
// --------------------------------------------------------------------------

const envSchema = z.object({
  // CORE
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  
  // DATABASE
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid connection string" }),
  
  // AUTHENTICATION & SECRETS
  // Access Token Secret (Short-lived)
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  // Refresh Token Secret (Long-lived, used for hashing/signing if needed, though we store opaque hashes)
  // Even if we store opaque strings, having a server-side secret for generation salt is good practice.
  
  // REDIS (Caching & Rate Limit)
  REDIS_URL: z.string().url().optional().default('redis://localhost:6379'),

  // GOOGLE OAUTH
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:3001/auth/google/callback'),

  // CLIENT URLS (CORS & COOKIES)
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default('localhost'), // Set to .digitaloffices.com.au in prod

  // EMAIL (SMTP)
  // If not provided, we will mock emails as per prompt instructions, 
  // but schema allows them to be optional for dev.
  SMTP_HOST: z.string().optional().refine((val) => process.env.NODE_ENV !== 'production' || !!val, "SMTP_HOST is required in production"),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('no-reply@digitaloffices.com.au'),
});

// Validate process.env
// We use safeParse to log all errors at once if multiple are missing
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 4));
  process.exit(1);
}

export const env = parsed.data;