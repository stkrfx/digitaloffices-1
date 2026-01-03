import { z } from 'zod';
import dotenv from 'dotenv';

// Load variables from .env into process.env
dotenv.config();

/**
 * ENVIRONMENT VARIABLE VALIDATION (GOLD STANDARD)
 * Objective: "Zero-Configuration" for Australian defaults with strict production overrides.
 * Standards:
 * - Fail-Fast: The application will not start if critical regional or security config is missing.
 * - Type Safety: All variables are coerced to their correct types (numbers, booleans, URLs).
 */

const envSchema = z.object({
  // --- CORE APP INFO ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  APP_NAME: z.string().default('Digital Offices Australia'),
  SUPPORT_EMAIL: z.string().email().default('support@digitaloffices.com.au'),

  // --- REGIONAL SETTINGS (Australia-First) ---
  // Gold Standard: Centralize regional defaults to prevent timezone bugs
  DEFAULT_TIMEZONE: z.string().default('Australia/Sydney'),
  DEFAULT_CURRENCY: z.string().length(3).default('AUD'),

  // --- DATABASE ---
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid PostgreSQL connection string" }),
  
  // --- AUTHENTICATION ---
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 high-entropy characters"),
  
  // --- REDIS (Caching & Rate Limiting) ---
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // --- GOOGLE OAUTH ---
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required for SSO"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required for SSO"),
  GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:3001/auth/google/callback'),

  // --- CLIENT & CORS ---
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default('localhost'),

  // --- EMAIL (SMTP) ---
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('no-reply@digitaloffices.com.au'),
  SMTP_SECURE: z.coerce.boolean().default(false),
}).refine(
  (data) => {
    // Gold Standard: Enforce Australian production domain security
    if (data.NODE_ENV === 'production') {
      const isAuDomain = data.COOKIE_DOMAIN === '.digitaloffices.com.au';
      const hasSmtp = !!data.SMTP_HOST && !!data.SMTP_USER && !!data.SMTP_PASS;
      return isAuDomain && hasSmtp;
    }
    return true;
  },
  {
    message: "Production Error: COOKIE_DOMAIN must be '.digitaloffices.com.au' and SMTP credentials must be provided.",
    path: ['COOKIE_DOMAIN'],
  }
);

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 4));
  process.exit(1);
}

export const env = parsed.data;