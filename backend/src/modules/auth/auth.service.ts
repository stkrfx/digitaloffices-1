import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { prisma } from '../../db/index.js';
import { 
  Role, 
  ROLES, 
  UserRegisterInput, 
  ExpertRegisterInput, 
  OrganizationRegisterInput, 
  LoginInput, 
  JwtPayload 
} from '../../../../shared/types.js'; // Adjust path if needed based on monorepo structure, strictly referencing shared/
import { hashPassword, verifyPassword, generateRandomToken, hashToken } from '../../utils/crypto.js';
import { env } from '../../env.js';

// --------------------------------------------------------------------------
// AUTHENTICATION SERVICE
// --------------------------------------------------------------------------
// Purpose: Core business logic for Siloed Identity Management.
// Standards:
// - Role-specific database tables (No single User table) 
// - Dual Token Generation (Access + Refresh) 
// - Secure Session Management (Refresh Token Hashing) 
// - Username Generation for Experts 
// --------------------------------------------------------------------------

// Helpers to select the correct Prisma delegate based on role
function getPrismaDelegate(role: Role) {
  switch (role) {
    case ROLES.USER: return prisma.user;
    case ROLES.EXPERT: return prisma.expert;
    case ROLES.ORGANIZATION: return prisma.organization;
    case ROLES.ADMIN: return prisma.admin;
    default: throw new Error(`Invalid role: ${role}`);
  }
}

/**
 * GENERATE UNIQUE USERNAME (Expert Only)
 * Uses 'unique-names-generator' to create handles like 'happy_sky_22'
 */
async function generateUniqueUsername(): Promise<string> {
  let username: string;
  let exists = true;

  // Retry loop to ensure uniqueness
  do {
    const name = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: '_',
      length: 2,
    });
    const number = Math.floor(Math.random() * 100);
    username = `${name}_${number}`; // e.g., 'red_lion_45'

    const count = await prisma.expert.count({ where: { username } });
    exists = count > 0;
  } while (exists);

  return username;
}

/**
 * REGISTER
 * Handles creation for all 4 roles strictly in their respective silos.
 */
export async function register(role: Role, data: UserRegisterInput | ExpertRegisterInput | OrganizationRegisterInput) {
  const delegate = getPrismaDelegate(role);
  const { email, password } = data;

  // 1. Check Uniqueness (Email)
  // @ts-expect-error - Prisma delegates share 'findUnique' signature for email
  const existing = await delegate.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already registered for this account type.');
  }

  // 2. Hash Password
  const passwordHash = await hashPassword(password);

  // 3. Generate Verification Token
  const emailVerificationToken = generateRandomToken();

  // 4. Prepare Common Data
  const commonData = {
    email,
    passwordHash,
    emailVerificationToken,
    emailVerifiedAt: null, // Require verification 
  };

  // 5. Create Record based on Role
  let result;
  if (role === ROLES.USER) {
    const input = data as UserRegisterInput;
    result = await prisma.user.create({
      data: { ...commonData, name: input.name }
    });
  } else if (role === ROLES.EXPERT) {
    const input = data as ExpertRegisterInput;
    // Auto-generate username if not provided or just force generation based on requirements
    // Prompt says: "Auto-generate a unique handle" 
    // However, schema Input has 'username'. We prioritize auto-generation to match prompt strictly.
    const username = await generateUniqueUsername(); 
    
    result = await prisma.expert.create({
      data: { 
        ...commonData, 
        name: input.name,
        username, // Enforced auto-generation
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
    throw new Error('Admin registration is not public.');
  }

  // 6. Send Verification Email (Mocking for now as per prompt instructions if SMTP not set)
  // TODO: Call email service here
  console.log(`[Mock Email] Verify ${role} at: http://localhost:3000/verify?token=${emailVerificationToken}`);

  return {
    id: result.id,
    email: result.email,
    role,
    message: "Registration successful. Please verify your email."
  };
}

/**
 * LOGIN
 * Authenticates user and issues Dual Tokens.
 */
export async function login(role: Role, data: LoginInput, ipAddress: string, userAgent: string) {
  const delegate = getPrismaDelegate(role);

  // 1. Find Account
  // @ts-expect-error - Dynamic delegate handling
  const account = await delegate.findUnique({ where: { email: data.email } });
  
  if (!account) {
    throw new Error('Invalid email or password');
  }

  // 2. Security Checks
  if (account.isBlocked) throw new Error('Account is blocked');
  if (account.deletedAt) throw new Error('Account is deleted'); // Soft Delete Check 
  if (!account.emailVerifiedAt) throw new Error('Email not verified'); // Verification Check 
  if (!account.passwordHash) throw new Error('Invalid login method (try OAuth)');

  // 3. Verify Password
  const isValid = await verifyPassword(data.password, account.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // 4. Generate Tokens
  // Access Token Payload
  const payload: JwtPayload = { id: account.id, role };
  
  // Refresh Token (Long-lived opaque string)
  const refreshToken = generateRandomToken(64);
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days 

  // 5. Store Session
  // Polymorphic relation handling
  const sessionData: any = {
    tokenHash: refreshTokenHash,
    expiresAt,
    ipAddress,
    userAgent,
  };

  // Set the correct foreign key
  if (role === ROLES.USER) sessionData.userId = account.id;
  if (role === ROLES.EXPERT) sessionData.expertId = account.id;
  if (role === ROLES.ORGANIZATION) sessionData.organizationId = account.id;
  if (role === ROLES.ADMIN) sessionData.adminId = account.id;

  await prisma.refreshSession.create({ data: sessionData });

  return {
    accessTokenPayload: payload, // Controller will sign this
    refreshToken,
    account: {
      id: account.id,
      email: account.email,
      name: (account as any).name || (account as any).companyName,
    }
  };
}

/**
 * LOGOUT
 * Revokes the specific Refresh Session.
 */
export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshSession.deleteMany({
    where: { tokenHash }
  });
}

/**
 * REFRESH TOKEN
 * Rotates the session.
 */
export async function refresh(refreshToken: string, ipAddress: string, userAgent: string) {
  const tokenHash = hashToken(refreshToken);

  // 1. Find Session
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash },
    include: { User: true, Expert: true, Organization: true, Admin: true }
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }

  // 2. Identify User & Role from Polymorphic Relation
  let account: any = null;
  let role: Role | null = null;

  if (session.User) { account = session.User; role = ROLES.USER; }
  else if (session.Expert) { account = session.Expert; role = ROLES.EXPERT; }
  else if (session.Organization) { account = session.Organization; role = ROLES.ORGANIZATION; }
  else if (session.Admin) { account = session.Admin; role = ROLES.ADMIN; }

  if (!account || !role) throw new Error('Orphaned session');

  // 3. Security Checks (Re-check on refresh)
  if (account.isBlocked || account.deletedAt) throw new Error('Account unavailable');

  // 4. Rotate Token (Security Best Practice)
  // Delete old session
  await prisma.refreshSession.delete({ where: { id: session.id } });

  // Create new session
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