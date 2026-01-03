import { prisma } from '../../db/index.js';

// --------------------------------------------------------------------------
// AVAILABILITY MODULE - BUSINESS LOGIC
// --------------------------------------------------------------------------
// Purpose: Manage Expert "Open Hours."
// Standards: 
// - Atomic transactions (All-or-nothing updates).
// - Time format validation (HH:mm).
// - Conflict prevention.
// --------------------------------------------------------------------------

/**
 * SYNC AVAILABILITY
 * Replaces the entire schedule for an expert.
 * This is the "Gold Standard" for scheduling UX—experts usually save their 
 * whole week at once in a dashboard.
 */
export async function syncAvailability(
  expertId: string,
  slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
) {
  // We use a Transaction to ensure the delete and create happen together
  return await prisma.$transaction(async (tx) => {
    // 1. Wipe existing availability for this expert
    await tx.availability.deleteMany({
      where: { expertId },
    });

    // 2. Create the new set of slots
    const newAvailability = await tx.availability.createMany({
      data: slots.map((slot) => ({
        ...slot,
        expertId,
      })),
    });

    return newAvailability;
  });
}

/**
 * GET EXPERT AVAILABILITY
 * Retrieves the weekly schedule for a specific expert.
 */
export async function getAvailabilityByExpert(expertId: string) {
  return await prisma.availability.findMany({
    where: { expertId },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' },
    ],
  });
}

/**
 * HELPER: IS WITHIN AVAILABILITY
 * A "Gold Standard" utility to check if a requested booking time 
 * falls within the expert's defined hours.
 */
export async function isTimeWithinAvailability(
  expertId: string,
  date: Date,
  durationMin: number
) {
  const dayOfWeek = date.getUTCDay();
  const startTimeStr = date.getUTCHours().toString().padStart(2, '0') + ':' + 
                       date.getUTCMinutes().toString().padStart(2, '0');
  
  // Calculate end time string
  const endDateTime = new Date(date.getTime() + durationMin * 60000);
  const endTimeStr = endDateTime.getUTCHours().toString().padStart(2, '0') + ':' + 
                     endDateTime.getUTCMinutes().toString().padStart(2, '0');

  const availability = await prisma.availability.findFirst({
    where: {
      expertId,
      dayOfWeek,
      startTime: { lte: startTimeStr },
      endTime: { gte: endTimeStr },
    },
  });

  return !!availability;
}