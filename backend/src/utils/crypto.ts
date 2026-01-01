import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

// --------------------------------------------------------------------------
// CRYPTOGRAPHY UTILITIES
// --------------------------------------------------------------------------
// Purpose: Secure password handling and token generation/hashing.
// Standards: 
// - Bcrypt for passwords (slow, resistant to brute-force) 
// - SHA-256 for opaque token hashing (fast, collision-resistant) 
// --------------------------------------------------------------------------

const SALT_ROUNDS = 12; // Industry standard balance between security and performance

/**
 * Hash a plain text password using Bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a Bcrypt hash.
 */
export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/**
 * Generate a cryptographically secure random string (hex).
 * Used for Refresh Tokens and Email Verification Tokens.
 * Default: 32 bytes -> 64 hex characters.
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Create a fast SHA-256 hash of a token.
 * Used to store the 'tokenHash' in the database while the user holds the raw token.
 * This ensures that even if the DB is compromised, active refresh tokens cannot be stolen.
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}