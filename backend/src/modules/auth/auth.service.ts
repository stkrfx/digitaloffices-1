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
// [NEW] Import our professional error classes
import { 
    BadRequestError, 
    ConflictError, 
    UnauthorizedError, 
    ForbiddenError 
} from '../../utils/errors.js';

/**
 * AUTHENTICATION SERVICE
 * Standards: 
 * - Generic Login Failures: We use the same error message for "user not found" and "wrong password" 
 * to prevent User Enumeration attacks.
 * - Domain-Driven Errors: Decouples business logic from HTTP transport layer.
 */

export async function register(role: Role, data: UserRegisterInput | ExpertRegisterInput | OrganizationRegisterInput) {
    const delegate = getPrismaDelegate(role);
    const { email, password } = data;

    // 1. Validate Email Domain
    const disposableDomains = ['tempmail.com', 'mailinator.com']; 
    const domain = email.split('@')[1];
    if (disposableDomains.includes(domain)) {
        throw new BadRequestError('Disposable email addresses are not allowed.');
    }

    // 2. Check Uniqueness
    // @ts-expect-error - Prisma delegates share 'findUnique' signature
    const existing = await delegate.findUnique({ where: { email } });
    if (existing) {
        throw new ConflictError('Email already registered for this account type.');
    }

    const passwordHash = await hashPassword(password);
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
            data: { ...commonData, name: input.name }
        });
    } else if (role === ROLES.EXPERT) {
        const input = data as ExpertRegisterInput;
        const username = await generateUniqueUsername();
        result = await prisma.expert.create({
            data: {
                ...commonData,
                name: input.name,
                username,
            }
        });
    } else if (role === ROLES.ORGANIZATION) {
        const input = data as OrganizationRegisterInput;
        result = await prisma.organization.create({
            data: {
                ...commonData,
                companyName: input.companyName,
                websiteUrl: input.websiteUrl,
                regNumber: input.regNumber
            }
        });
    } else {
        throw new BadRequestError('Admin registration is not public.');
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

    // 1. Find Account
    // @ts-expect-error - Dynamic delegate
    const account = await delegate.findUnique({ where: { email: data.email } });

    // GOLD STANDARD: Use generic "Invalid email or password" for 404/401 
    // to prevent hackers from knowing which emails exist in your DB.
    if (!account) {
        throw new UnauthorizedError('Invalid email or password');
    }

    if (account.isBlocked) throw new ForbiddenError('Account is blocked');
    if (account.deletedAt) throw new UnauthorizedError('Invalid email or password'); 
    if (!account.emailVerifiedAt) throw new ForbiddenError('Please verify your email before logging in'); 
    if (!account.passwordHash) throw new BadRequestError('Account uses Social Login. Please use Google to sign in.');

    // 2. Verify Password
    const isValid = await verifyPassword(data.password, account.passwordHash);
    if (!isValid) {
        throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Dual Token Generation Logic
    const payload: JwtPayload = { id: account.id, role };
    const refreshToken = generateRandomToken(64);
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days 

    const sessionData: any = {
        tokenHash: refreshTokenHash,
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