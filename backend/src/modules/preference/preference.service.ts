import { prisma } from '../../db/index.js';
import { ROLES, ThemePreferenceType } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// PREFERENCE MODULE - BUSINESS LOGIC
// --------------------------------------------------------------------------
// Purpose: Manage UI/UX settings (Theme, Language, Timezone).
// Standards: 
// - Upsert pattern (Atomic Update or Create).
// - Polymorphic owner handling.
// - Default value injection.
// --------------------------------------------------------------------------

/**
 * GET PREFERENCES
 * Retrieves settings for a specific owner based on their role.
 */
export async function getPreferences(ownerId: string, role: string) {
  // Determine which foreign key to query based on role
  const whereClause = {
    [role === ROLES.USER ? 'userId' : role === ROLES.EXPERT ? 'expertId' : 'organizationId']: ownerId
  };

  const preferences = await prisma.userPreference.findUnique({
    where: whereClause as any,
  });

  // Gold Standard: If no preferences exist, return the system defaults 
  // instead of null to prevent frontend crashes.
  return preferences || {
    theme: 'SYSTEM',
    language: 'en',
    timezone: 'UTC',
  };
}

/**
 * UPDATE PREFERENCES
 * Uses the Upsert pattern to ensure a record exists before updating.
 */
export async function updatePreferences(
  ownerId: string,
  role: string,
  data: {
    theme?: ThemePreferenceType;
    language?: string;
    timezone?: string;
  }
) {
  const field = role === ROLES.USER ? 'userId' : role === ROLES.EXPERT ? 'expertId' : 'organizationId';

  return await prisma.userPreference.upsert({
    where: { [field]: ownerId } as any,
    update: data,
    create: {
      ...data,
      [field]: ownerId,
    },
  });
}