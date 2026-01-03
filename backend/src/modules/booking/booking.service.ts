import { prisma } from '../../db/index.js';
import { isTimeWithinAvailability } from '../availability/availability.service.js';

// --------------------------------------------------------------------------
// BOOKING MODULE - BUSINESS LOGIC
// --------------------------------------------------------------------------
// Purpose: Core orchestration for scheduling sessions.
// Standards: 
// - Transactional Integrity (ACID).
// - Double-entry validation (Availability + Conflict checks).
// - Rich relational data fetching.
// --------------------------------------------------------------------------

/**
 * CREATE BOOKING
 * The most critical business logic in the system.
 */
export async function createBooking(data: {
  userId: string;
  serviceId: string;
  startTime: Date;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Service details to get duration and price
    const service = await tx.service.findUnique({
      where: { id: data.serviceId, isActive: true },
      include: { Expert: true, Organization: true },
    });

    if (!service) throw new Error('Service not found or inactive');

    const durationMs = service.durationMin * 60000;
    const endTime = new Date(data.startTime.getTime() + durationMs);
    const expertId = service.expertId;
    const organizationId = service.organizationId;

    // 2. Gold Standard: Verify Provider's General Availability
    // Note: In a production app, we use the service helper but within the TX context
    if (expertId) {
      const isAvailable = await isTimeWithinAvailability(expertId, data.startTime, service.durationMin);
      if (!isAvailable) throw new Error('Selected time is outside the expert\'s working hours');
    }

    // 3. Gold Standard: Check for Double-Booking (Overlaps)
    const existingConflict = await tx.booking.findFirst({
      where: {
        OR: [
          { expertId: expertId ?? undefined },
          { organizationId: organizationId ?? undefined }
        ],
        status: { in: ['CONFIRMED', 'PENDING'] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: data.startTime } }
        ]
      }
    });

    if (existingConflict) {
      throw new Error('This time slot is already booked');
    }

    // 4. Create the Booking
    return await tx.booking.create({
      data: {
        startTime: data.startTime,
        endTime,
        totalPrice: service.price,
        userId: data.userId,
        serviceId: data.serviceId,
        expertId,
        organizationId,
        status: 'PENDING', // Default state until payment or manual confirmation
      },
      include: {
        Service: { select: { title: true } },
        User: { select: { name: true, email: true } }
      }
    });
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
export async function getProviderBookings(providerId: string, role: 'EXPERT' | 'ORGANIZATION') {
  return await prisma.booking.findMany({
    where: role === 'EXPERT' ? { expertId: providerId } : { organizationId: providerId },
    include: {
      Service: true,
      User: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { startTime: 'desc' },
  });
}

/**
 * UPDATE BOOKING STATUS (Cancel/Confirm)
 */
export async function updateBookingStatus(
  bookingId: string, 
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
  actorId: string // Ensure only involved parties can change status
) {
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

  if (!booking) throw new Error('Booking not found or unauthorized');

  return await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
  });
}