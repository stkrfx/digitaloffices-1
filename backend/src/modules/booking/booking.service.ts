import { prisma } from '../../db/index.js';
import { isTimeWithinAvailability } from '../availability/availability.service.js';
import { ROLES, BookingStatusType } from '../../../../shared/types.js';
import { BookingStatus } from '../../generated/prisma/enums.js';
import { 
    BadRequestError, 
    ConflictError, 
    NotFoundError, 
    UnauthorizedError 
} from '../../utils/errors.js';

// --------------------------------------------------------------------------
// BOOKING MODULE - BUSINESS LOGIC
// --------------------------------------------------------------------------
// Purpose: Core orchestration for scheduling sessions.
// Standards: 
// - Transactional Integrity (ACID): Uses $transaction to prevent race conditions.
// - Domain Errors: Uses specific AppErrors for cleaner API responses.
// - Double-booking Protection: Strict overlap checks within the transaction.
// --------------------------------------------------------------------------

/**
 * CREATE BOOKING
 * Handles the critical logic of reserving a time slot.
 */
export async function createBooking(data: {
  userId: string;
  serviceId: string;
  startTime: Date;
  notes?: string;
}) {
  const { userId, serviceId, startTime, notes } = data;

  // 1. Fetch Service details (outside TX to keep the transaction short)
  const service = await prisma.service.findUnique({
    where: { id: serviceId, isActive: true },
    include: { Expert: true, Organization: true },
  });

  if (!service) {
    throw new NotFoundError('Service not found or is currently inactive');
  }

  const durationMs = service.durationMin * 60000;
  const endTime = new Date(startTime.getTime() + durationMs);
  const expertId = service.expertId;
  const organizationId = service.organizationId;

  // 2. Execute Atomic Transaction to prevent Race Conditions
  return await prisma.$transaction(async (tx) => {
    
    // A. Verify Provider's General Availability
    if (expertId) {
      const isAvailable = await isTimeWithinAvailability(expertId, startTime, service.durationMin);
      if (!isAvailable) {
          throw new BadRequestError('Selected time is outside the provider\'s working hours');
      }
    }

    // B. Check for Overlapping Bookings (Double-Booking Protection)
    const overlap = await tx.booking.findFirst({
      where: {
        OR: [
            { 
              expertId: { 
                equals: expertId ?? undefined, 
                not: null 
              } 
            },
            { 
              organizationId: { 
                equals: organizationId ?? undefined, 
                not: null 
              } 
            }
          ],
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } }
        ]
      }
    });

    if (overlap) {
      throw new ConflictError('This time slot is already reserved');
    }

    // C. Create the Booking
    // Note: We cache totalPrice and provider IDs directly for reliable history/accounting
    return await tx.booking.create({
      data: {
        userId,
        serviceId,
        expertId,
        organizationId,
        startTime,
        endTime,
        totalPrice: service.price,
        notes,
        status: BookingStatus.PENDING,
      },
      include: {
        Service: { select: { title: true } },
        User: { select: { name: true, email: true } }
      }
    });
  });
}

/**
 * UPDATE BOOKING STATUS
 * Standardizes status changes (Confirm/Cancel) with authorization checks.
 */
export async function updateBookingStatus(
  bookingId: string, 
  status: BookingStatusType,
  actorId: string 
) {
  // 1. Verify existence and authorization
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [
        { userId: actorId },
        { expertId: actorId },
        { organizationId: actorId }
      ]
    }
  });

  if (!booking) {
    throw new NotFoundError('Booking not found or you are not authorized to modify it');
  }

  // 2. Prevent redundant updates (e.g., cancelling an already cancelled booking)
  if (booking.status === status) {
    throw new BadRequestError(`Booking is already ${status.toLowerCase()}`);
  }

  // 3. Gold Standard: Apply business rules for status transitions
  // Example: Users can't "Confirm" their own booking if it's pending provider action
  if (status === 'CONFIRMED' && booking.userId === actorId) {
      throw new UnauthorizedError('Users cannot confirm their own bookings');
  }

  return await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
  });
}

/**
 * GET USER BOOKINGS
 */
export async function getUserBookings(userId: string) {
  return await prisma.booking.findMany({
    where: { userId },
    include: {
      Service: true,
      Expert: { select: { name: true, avatarUrl: true } },
      Organization: { select: { companyName: true, logoUrl: true } },
    },
    orderBy: { startTime: 'desc' },
  });
}

/**
 * GET PROVIDER BOOKINGS
 */
export async function getProviderBookings(providerId: string, role: typeof ROLES.EXPERT | typeof ROLES.ORGANIZATION) {
    return await prisma.booking.findMany({
      where: role === ROLES.EXPERT ? { expertId: providerId } : { organizationId: providerId },
    include: {
      Service: true,
      User: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { startTime: 'desc' },
  });
}