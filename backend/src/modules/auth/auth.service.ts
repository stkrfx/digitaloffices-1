import { prisma } from '../../db/index.js';
import {
    Role,
    ROLES,
    UserRegisterInput,
    ExpertRegisterInput,
    OrganizationRegisterInput,
    LoginInput,
    JwtPayload
} from '../../../../shared/types.js';
import { hashPassword, verifyPassword, generateRandomToken, hashToken } from '../../utils/crypto.js';
import { sendVerificationEmail } from '../../utils/mailer.js'
import { getPrismaDelegate } from '../../db/index.js';
import { generateUniqueUsername } from '../../utils/username.js';
import { validateEmailProfessional } from '../../utils/email-validator.js';
import { 
    BadRequestError, 
    ConflictError, 
    UnauthorizedError, 
    ForbiddenError 
} from '../../utils/errors.js';

/**
 * AUTHENTICATION SERVICE (GOLD STANDARD)
 * Standards: 
 * - Multi-Layer Validation: Syntax + Disposable List + DNS/MX Verification.
 * - Anti-Enumeration: Generic failures for sensitive operations.
 * - Precision: Decimal handling for financial data (AUD).
 */

export async function register(role: Role, data: UserRegisterInput | ExpertRegisterInput | OrganizationRegisterInput) {
    const delegate = getPrismaDelegate(role);
    const email = data.email.trim().toLowerCase(); // Normalize immediately

    // 1. Professional Multi-Layer Email Validation
    const emailValidation = await validateEmailProfessional(email);
    if (!emailValidation.isValid) {
        throw new BadRequestError(emailValidation.reason || 'Invalid email address.');
    }

    // 2. Check Uniqueness
    // @ts-expect-error - Prisma delegates share 'findUnique' signature
    const existing = await delegate.findUnique({ where: { email } });
    if (existing) {
        // Gold Standard: In some highly secure systems, you might return a success message 
        // even if the user exists to prevent enumeration. For SaaS, a ConflictError is standard UX.
        throw new ConflictError('This email is already registered.');
    }

    const passwordHash = await hashPassword(data.password);
    const emailVerificationToken = generateRandomToken();

    const commonData = {
        email,
        passwordHash,
        emailVerificationToken,
        emailVerifiedAt: null,
    };

    let result;
    if (role === ROLES.USER) {
        const input = data as UserRegisterInput;
        result = await prisma.user.create({
            data: { 
                ...commonData, 
                name: input.name,
                // Initialize default preferences (localized to Australia/Sydney)
                preferences: { create: {} } 
            }
        });
    } else if (role === ROLES.EXPERT) {
        const input = data as ExpertRegisterInput;
        const username = await generateUniqueUsername();
        result = await prisma.expert.create({
            data: {
                ...commonData,
                name: input.name,
                username,
                preferences: { create: {} }
            }
        });
    } else if (role === ROLES.ORGANIZATION) {
        const input = data as OrganizationRegisterInput;
        result = await prisma.organization.create({
            data: {
                ...commonData,
                companyName: input.companyName,
                websiteUrl: input.websiteUrl,
                regNumber: input.regNumber,
                preferences: { create: {} }
            }
        });
    } else {
        throw new BadRequestError('Account type not supported for public registration.');
    }

    await sendVerificationEmail(result.email, emailVerificationToken);

    return {
        id: result.id,
        email: result.email,
        role,
        message: "Registration successful. Please verify your email."
    };
}

export async function login(role: Role, data: LoginInput, ipAddress: string, userAgent: string) {
    const delegate = getPrismaDelegate(role);
    const email = data.email.trim().toLowerCase();

    // 1. Find Account
    // @ts-expect-error - Dynamic delegate
    const account = await delegate.findUnique({ where: { email } });

    // GOLD STANDARD: Prevent User Enumeration
    // We throw the exact same error for "not found" and "wrong password"
    if (!account || account.deletedAt) {
        throw new UnauthorizedError('Invalid email or password');
    }

    if (account.isBlocked) throw new ForbiddenError('Account is blocked. Please contact support.');
    if (!account.emailVerifiedAt) throw new ForbiddenError('Please verify your email before logging in.'); 
    
    // Social Login check
    if (!account.passwordHash) {
        throw new BadRequestError('This account is linked with Google. Please use Google Sign-In.');
    }

    // 2. Verify Password
    const isValid = await verifyPassword(data.password, account.passwordHash);
    if (!isValid) {
        throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Dual Token Generation (JWT + Refresh Rotation)
    const payload: JwtPayload = { id: account.id, role };
    const refreshToken = generateRandomToken(64);
    const refreshTokenHash = hashToken(refreshToken);
    
    // 7-day session window
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

    const sessionData: any = {
        tokenHash: refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
    };

    // Attach to polymorphic session
    if (role === ROLES.USER) sessionData.userId = account.id;
    if (role === ROLES.EXPERT) sessionData.expertId = account.id;
    if (role === ROLES.ORGANIZATION) sessionData.organizationId = account.id;
    if (role === ROLES.ADMIN) sessionData.adminId = account.id;

    await prisma.refreshSession.create({ data: sessionData });

    return {
        accessTokenPayload: payload,
        refreshToken,
        account: {
            id: account.id,
            email: account.email,
            name: (account as any).name || (account as any).companyName,
        }
    };
}

export async function refresh(refreshToken: string, ipAddress: string, userAgent: string) {
    const tokenHash = hashToken(refreshToken);

    const session = await prisma.refreshSession.findUnique({
        where: { tokenHash },
        include: { User: true, Expert: true, Organization: true, Admin: true }
    });

    if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const roleMap = { User: ROLES.USER, Expert: ROLES.EXPERT, Organization: ROLES.ORGANIZATION, Admin: ROLES.ADMIN };
    let account: any = null;
    let role: Role | null = null;

    for (const [key, r] of Object.entries(roleMap)) {
        if ((session as any)[key]) {
            account = (session as any)[key];
            role = r as Role;
            break;
        }
    }
    
    if (!account?.id || !role) throw new UnauthorizedError('Session integrity compromised');
    
    // TOKEN ROTATION: Security best practice
    await prisma.refreshSession.delete({ where: { id: session.id } });

    const newRefreshToken = generateRandomToken(64);
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const sessionData: any = {
        tokenHash: newHash,
        expiresAt,
        ipAddress,
        userAgent,
    };

    if (role === ROLES.USER) sessionData.userId = account.id;
    if (role === ROLES.EXPERT) sessionData.expertId = account.id;
    if (role === ROLES.ORGANIZATION) sessionData.organizationId = account.id;
    if (role === ROLES.ADMIN) sessionData.adminId = account.id;

    await prisma.refreshSession.create({ data: sessionData });

    return {
        accessTokenPayload: { id: account.id, role } as JwtPayload,
        refreshToken: newRefreshToken
    };
}

export async function logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshSession.deleteMany({
        where: { tokenHash }
    });
}