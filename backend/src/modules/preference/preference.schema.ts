import { z } from 'zod';
import { ThemePreference } from '../../generated/prisma/index.js';

// --------------------------------------------------------------------------
// PREFERENCE MODULE - SCHEMAS
// --------------------------------------------------------------------------
// Purpose: Validation for UI/UX settings.
// Standards: 
// - Native Enum synchronization.
// - Timezone validation (Intl support).
// - Strict string constraints for language codes.
// --------------------------------------------------------------------------

/**
 * UPDATE PREFERENCES SCHEMA
 * PATCH /preferences
 */
export const updatePreferenceSchema = z.object({
  body: z.object({
    // Gold Standard: Sync with Prisma Enum to ensure only valid themes are allowed
    theme: z.nativeEnum(ThemePreference).optional(),
    
    // Validate language codes (e.g., 'en', 'fr', 'es')
    language: z.string().min(2).max(5).optional(),
    
    // Gold Standard: Validate timezone against the system's recognized list
    timezone: z.string().refine((tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch (e) {
        return false;
      }
    }, {
      message: 'Invalid IANA timezone string (e.g., "Australia/Sydney")',
    }).optional(),
  }),
});

// TypeScript Types derived from Schema
export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>['body'];