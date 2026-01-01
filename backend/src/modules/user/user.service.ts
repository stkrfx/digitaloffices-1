import { prisma } from '../../db/index.js';

// --------------------------------------------------------------------------
// USER SERVICE
// --------------------------------------------------------------------------
// Purpose: Business logic for standard User profile management.
// Standards:
// - Strict typing.
// - Database interactions via Prisma.
// --------------------------------------------------------------------------

/**
 * GET USER PROFILE
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { 
      id: userId,
      isBlocked: false,
      deletedAt: null 
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      promotionalEmailsEnabled: true,
      createdAt: true,
      googleId: true, // Useful for frontend to show if linked
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * UPDATE USER PROFILE
 */
export async function updateUserProfile(
  userId: string, 
  data: { 
    name?: string; 
    avatarUrl?: string; 
    promotionalEmailsEnabled?: boolean;
  }
) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      avatarUrl: data.avatarUrl,
      promotionalEmailsEnabled: data.promotionalEmailsEnabled,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      promotionalEmailsEnabled: true,
    },
  });

  return updatedUser;
}