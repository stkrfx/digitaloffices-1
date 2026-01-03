import { prisma } from '../../db/index.js';

// --------------------------------------------------------------------------
// REVIEW MODULE - BUSINESS LOGIC
// --------------------------------------------------------------------------
// Purpose: Reputation management and feedback.
// Standards: 
// - Verified reviews only (linked to completed bookings).
// - Atomic creation (Transaction).
// - Prevents duplicate reviews for the same booking.
// --------------------------------------------------------------------------

/**
 * CREATE A REVIEW
 * Gold Standard: Only allows reviews for completed, un-reviewed bookings.
 */
export async function createReview(data: {
  bookingId: string;
  userId: string;
  rating: number;
  comment?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify the booking exists and is completed
    const booking = await tx.booking.findUnique({
      where: { id: data.bookingId },
      include: { review: true }
    });

    if (!booking) throw new Error('Booking not found');
    
    // Security: Only the user who made the booking can review it
    if (booking.userId !== data.userId) {
      throw new Error('Unauthorized: You can only review your own bookings');
    }

    // Business Logic: Must be completed
    if (booking.status !== 'COMPLETED') {
      throw new Error('You can only review completed sessions');
    }

    // Integrity: Prevent duplicate reviews
    if (booking.review) {
      throw new Error('You have already reviewed this booking');
    }

    // 2. Create the Review
    return await tx.review.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        bookingId: data.bookingId,
        userId: data.userId,
      },
    });
  });
}

/**
 * GET REVIEWS FOR A PROVIDER
 * Fetches all reviews for an expert or organization to show on their profile.
 */
export async function getProviderReviews(providerId: string, type: 'expert' | 'organization') {
  return await prisma.review.findMany({
    where: {
      Booking: {
        [type === 'expert' ? 'expertId' : 'organizationId']: providerId,
      },
    },
    include: {
      User: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * GET PROVIDER RATING SUMMARY
 * Helper to calculate average rating and total review count.
 */
export async function getProviderRatingSummary(providerId: string, type: 'expert' | 'organization') {
  const aggregate = await prisma.review.aggregate({
    where: {
      Booking: {
        [type === 'expert' ? 'expertId' : 'organizationId']: providerId,
      },
    },
    _avg: { rating: true },
    _count: { id: true },
  });

  return {
    averageRating: aggregate._avg.rating || 0,
    totalReviews: aggregate._count.id,
  };
}