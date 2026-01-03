import { z } from 'zod';

// --------------------------------------------------------------------------
// AVAILABILITY MODULE - SCHEMAS
// --------------------------------------------------------------------------
// Purpose: Request validation for Expert working hours.
// Standards: 
// - Regex-based time validation (HH:mm).
// - Range validation for days of the week.
// - Logical validation (End time must be after start time).
// --------------------------------------------------------------------------

// Reusable regex for 24-hour time format (e.g., "09:00", "17:30")
const timeStringRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * SYNC AVAILABILITY SCHEMA
 * Validates a bulk update of the weekly schedule.
 */
export const syncAvailabilitySchema = z.object({
  body: z.object({
    slots: z.array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6), // 0=Sunday, 6=Saturday
        startTime: z.string().regex(timeStringRegex, 'Invalid start time format (HH:mm)'),
        endTime: z.string().regex(timeStringRegex, 'Invalid end time format (HH:mm)'),
      }).refine((data) => {
        // Gold Standard: Logical check to ensure the shift doesn't end before it starts
        const [startH, startM] = data.startTime.split(':').map(Number);
        const [endH, endM] = data.endTime.split(':').map(Number);
        return (endH > startH) || (endH === startH && endM > startM);
      }, {
        message: 'End time must be after start time',
        path: ['endTime'],
      })
    ),
  }),
});

/**
 * GET AVAILABILITY SCHEMA
 */
export const getAvailabilitySchema = z.object({
  params: z.object({
    expertId: z.string().uuid(),
  }),
});

// TypeScript Types
export type SyncAvailabilityInput = z.infer<typeof syncAvailabilitySchema>['body'];