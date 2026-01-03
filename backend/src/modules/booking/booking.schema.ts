import { z } from 'zod';
import { BookingStatus } from '../../generated/prisma/index.js';

// --------------------------------------------------------------------------
// BOOKING MODULE - SCHEMAS
// --------------------------------------------------------------------------
// Purpose: Request validation for scheduling and managing sessions.
// Standards: 
// - ISO 8601 Date validation.
// - Future-date enforcement (Logic).
// - Strict Enum validation for status updates.
// --------------------------------------------------------------------------

/**
 * CREATE BOOKING SCHEMA
 * POST /bookings
 */
export const createBookingSchema = z.object({
  body: z.object({
    serviceId: z.string().uuid('Invalid Service ID'),
    // Gold Standard: Coerce to Date object and ensure it is in the future
    startTime: z.coerce.date().refine((date) => date > new Date(), {
      message: 'Booking time must be in the future',
    }),
  }),
});

/**
 * UPDATE BOOKING STATUS SCHEMA
 * PATCH /bookings/:bookingId/status
 */
export const updateBookingStatusSchema = z.object({
  params: z.object({
    bookingId: z.string().uuid(),
  }),
  body: z.object({
    status: z.nativeEnum(BookingStatus),
  }),
});

/**
 * GET PROVIDER BOOKINGS SCHEMA
 */
export const getProviderBookingsSchema = z.object({
  query: z.object({
    role: z.enum(['EXPERT', 'ORGANIZATION']),
  }),
});

// TypeScript Types
export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'];
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>['body'];