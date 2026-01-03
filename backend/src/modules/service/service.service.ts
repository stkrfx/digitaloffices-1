import { prisma } from '../../db/index.js';
import { Prisma } from '../../generated/prisma/client.js';

// --------------------------------------------------------------------------
// SERVICE MODULE - BUSINESS LOGIC
// --------------------------------------------------------------------------
// Purpose: Core CRUD for Service offerings.
// Standards: 
// - Strict ownership verification (Security).
// - Conditional deletion (Data Integrity).
// - Precise type safety using Prisma generated types.
// --------------------------------------------------------------------------

/**
 * CREATE A NEW SERVICE
 * Ensures that a service is correctly linked to either an Expert or Organization.
 */
export async function createService(data: {
  title: string;
  description?: string;
  price: number | Prisma.Decimal;
  durationMin: number;
  expertId?: string;
  organizationId?: string;
}) {
  // Gold Standard: Validation to ensure exactly one owner is provided
  if (!data.expertId && !data.organizationId) {
    throw new Error('Service must be owned by an Expert or an Organization');
  }

  return await prisma.service.create({
    data: {
      title: data.title,
      description: data.description,
      price: data.price,
      durationMin: data.durationMin,
      expertId: data.expertId,
      organizationId: data.organizationId,
    },
  });
}

/**
 * GET ALL SERVICES FOR A PROVIDER
 * Used on public profiles (e.g., /experts/:username) to list active services.
 */
export async function getServicesByProvider(providerId: string, type: 'expert' | 'organization') {
  return await prisma.service.findMany({
    where: {
      [type === 'expert' ? 'expertId' : 'organizationId']: providerId,
      isActive: true, // Only show active services to the public
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * UPDATE SERVICE
 * Implements strict ownership check before allowing any modifications.
 */
export async function updateService(
  serviceId: string,
  ownerId: string,
  data: Partial<{
    title: string;
    description: string;
    price: number | Prisma.Decimal;
    durationMin: number;
    isActive: boolean;
  }>
) {
  // Verify ownership: Service must belong to the expert/org making the request
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      OR: [
        { expertId: ownerId },
        { organizationId: ownerId }
      ]
    },
  });

  if (!service) {
    throw new Error('Service not found or you do not have permission to edit it');
  }

  return await prisma.service.update({
    where: { id: serviceId },
    data,
  });
}

/**
 * DELETE SERVICE
 * Gold Standard Logic: 
 * 1. If a service has historic bookings, we "Soft Deactivate" it (isActive: false).
 * This preserves the booking history for the user's dashboard.
 * 2. If it has NO bookings, we Hard Delete it to keep the DB clean.
 */
export async function deleteService(serviceId: string, ownerId: string) {
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      OR: [{ expertId: ownerId }, { organizationId: ownerId }],
    },
    include: {
      _count: {
        select: { bookings: true }
      }
    }
  });

  if (!service) throw new Error('Service not found or unauthorized');

  // Check if we can safely delete or if we should just deactivate
  if (service._count.bookings > 0) {
    return await prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
  }

  return await prisma.service.delete({
    where: { id: serviceId },
  });
}