import { prisma } from '../../db/index.js';
import {
    Role,
    ROLES,
    JwtPayload
} from '../../../../shared/types.js';
import { verifyGoogleToken } from '../../utils/google.js';
import { generateRandomToken, hashToken } from '../../utils/crypto.js';
import { Prisma } from '../../generated/prisma/client';
import { getPrismaDelegate } from '../../db/index.js';
import { generateUniqueUsername } from '../../utils/username.js';

// --------------------------------------------------------------------------
// OAUTH SERVICE
// --------------------------------------------------------------------------
// Purpose: Handle Google Sign-In Logic (Hybrid Flow).
// Standards:
// - Verifies ID Token using Google Auth Library 
// - Auto-creates account if not exists (JIT Provisioning) 
// - Auto-verifies email for Google users 
// - Generates Dual Tokens (Access + Refresh) 
// --------------------------------------------------------------------------

interface CreateSessionInput extends Omit<Prisma.RefreshSessionCreateInput, 'User' | 'Expert' | 'Organization' | 'Admin'> {
    userId?: string;
    expertId?: string;
    organizationId?: string;
    adminId?: string;
}

export async function loginWithGoogle(role: Role, idToken: string, ipAddress: string, userAgent: string) {
    if (role === ROLES.ADMIN) throw new Error('Admin OAuth not permitted');

    // 1. Verify Google Token
    const googleUser = await verifyGoogleToken(idToken);
    const { email, googleId, name, avatarUrl } = googleUser;

    // Instead of @ts-expect-error, use an explicit type for the account
    type AuthAccount = {
        id: string;
        email: string;
        googleId: string | null;
        isBlocked: boolean;
        deletedAt: Date | null;
        emailVerifiedAt: Date | null;
        name?: string;        // Add this
    companyName?: string; // Add this
    };

    const delegate = getPrismaDelegate(role) as any; // Temporary cast for the delegate wrapper
    let account = await (delegate.findUnique({ where: { email } }) as Promise<AuthAccount | null>);

    if (account) {
        // 2a. Account exists
        if (account.isBlocked) throw new Error('Account is blocked');
        if (account.deletedAt) throw new Error('Account is deleted');

        // Link Google ID if not already linked
        if (!account.googleId) {
            account = await (delegate.update({
                where: { id: account.id },
                data: { googleId, emailVerifiedAt: account.emailVerifiedAt || new Date() },
            }) as Promise<AuthAccount>);
        }
    } else {
        // 2b. Create new account (JIT)
        // Prepare specific data based on role
        const commonData = {
            email,
            googleId,
            emailVerifiedAt: new Date(), // Auto-verified 
            isBlocked: false,
        };

        if (role === ROLES.USER) {
            account = await prisma.user.create({
                data: { ...commonData, name, avatarUrl }
            });
        } else if (role === ROLES.EXPERT) {
            const username = await generateUniqueUsername();
            account = await prisma.expert.create({
                data: { ...commonData, name, avatarUrl, username }
            });
        } else if (role === ROLES.ORGANIZATION) {
            // For organizations, we use the user's name as company name initially, they can change it
            account = await prisma.organization.create({
                data: { ...commonData, companyName: name }
            });
        } else {
            throw new Error('Admin login via Google not supported for new accounts.');
        }
    }

    // 3. Generate Tokens (Identical to standard login)
    const payload: JwtPayload = { id: account.id, role };

    const refreshToken = generateRandomToken(64);
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const sessionData: CreateSessionInput = {
        tokenHash: refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
    };

    // Set the correct foreign key based on role
    if (role === ROLES.USER) sessionData.userId = account.id;
    else if (role === ROLES.EXPERT) sessionData.expertId = account.id;
    else if (role === ROLES.ORGANIZATION) sessionData.organizationId = account.id;

    await prisma.refreshSession.create({
        data: sessionData as Prisma.RefreshSessionCreateInput
    });

    return {
        accessTokenPayload: payload,
        refreshToken,
        account: {
            id: account.id,
            email: account.email,
            name: account.name || account.companyName || '', // No more 'any'
        }
    };
}