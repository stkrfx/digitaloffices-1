import jwt from 'jsonwebtoken';
import { prisma, getPrismaDelegate } from '../../db/index.js';
import { Role, ROLES } from '../../../../shared/types.js';
import { hashPassword } from '../../utils/crypto.js';
import { sendPasswordResetEmail } from '../../utils/mailer.js';
import { env } from '../../env.js';
import { Prisma } from '../../generated/prisma/client.js';

// --------------------------------------------------------------------------
// PASSWORD MANAGEMENT SERVICE
// --------------------------------------------------------------------------
// Purpose: Handle Forgot Password and Reset Password flows.
// Standards:
// - Uses Short-lived JWTs for reset tokens (Stateless, 15 mins) 
// - Revokes all sessions on password reset (Security Critical) 
// --------------------------------------------------------------------------

interface ResetTokenPayload {
  id: string;
  role: Role;
  type: 'password_reset';
}

/**
 * FORGOT PASSWORD
 * Generates a short-lived JWT and sends it via email.
 */
export async function forgotPassword(role: Role, email: string) {
  const delegate = getPrismaDelegate(role);

  // Cast the delegate to a type that has the findUnique method with an email where clause
  const account = await (delegate as any).findUnique({
    where: { email }
  }) as { id: string; isBlocked: boolean; deletedAt: Date | null } | null;

  // Security: Always return success even if email not found to prevent enumeration
  if (!account) return;
  if (account.isBlocked || account.deletedAt) return;

  // Generate Stateless Reset Token (JWT)
  // We use a specific 'type' claim to differentiate from access tokens
  const token = jwt.sign(
    { id: account.id, role, type: 'password_reset' } as ResetTokenPayload,
    env.JWT_SECRET,
    { expiresIn: '15m' } // 15 Minutes 
  );

  // Send Email
  await sendPasswordResetEmail(email, token);
}

/**
 * RESET PASSWORD
 * Verifies token, updates password, and revokes sessions.
 */
export async function resetPassword(token: string, newPassword: string) {
  // 1. Verify Token
  let payload: ResetTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as ResetTokenPayload;
    if (payload.type !== 'password_reset') throw new Error('Invalid token type');
  } catch (err) {
    throw new Error('Invalid or expired reset token');
  }

  const { id, role } = payload;
  const delegate = getPrismaDelegate(role);

  // 2. Hash New Password
  const passwordHash = await hashPassword(newPassword);

  // 3. Update DB
  await (delegate as any).update({
    where: { id },
    data: { passwordHash },
  });

  // 4. Revoke All Sessions (Security Critical) 
  // We identify sessions by the specific role FK
  const whereClause: Prisma.RefreshSessionWhereInput = {};

  if (role === ROLES.USER) whereClause.userId = id;
  else if (role === ROLES.EXPERT) whereClause.expertId = id;
  else if (role === ROLES.ORGANIZATION) whereClause.organizationId = id;
  else if (role === ROLES.ADMIN) whereClause.adminId = id;

  await prisma.refreshSession.deleteMany({
    where: whereClause,
  });

  return { message: 'Password reset successful. You can now login.' };
}