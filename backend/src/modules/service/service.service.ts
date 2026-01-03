import { prisma } from '../../db/index.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ServiceSearchInput, ServiceSearchResponse } from '../../../../shared/types.js';

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


/**
 * GLOBAL SERVICE SEARCH (Discovery Engine)
 * Gold Standards:
 * - Advanced Filtering: Price ranges, duration, and case-insensitive keywords.
 * - Enriched Data: Includes provider details and reputation in a single response.
 * - Performance: Parallel count and findMany execution.
 */
export async function searchServices(input: ServiceSearchInput): Promise<ServiceSearchResponse> {
  const { 
    keyword, minPrice, maxPrice, minDuration, maxDuration, 
    page, limit, sortBy 
  } = input;

  const skip = (page - 1) * limit;

  // 1. Build Dynamic Filter Clause
  const where: Prisma.ServiceWhereInput = {
    isActive: true,
    ...(keyword && {
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ],
    }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
    ...((minDuration !== undefined || maxDuration !== undefined) && {
      durationMin: {
        ...(minDuration !== undefined && { gte: minDuration }),
        ...(maxDuration !== undefined && { lte: maxDuration }),
      },
    }),
  };

  // 2. Define Sorting Logic
  let orderBy: Prisma.ServiceOrderByWithRelationInput = { createdAt: 'desc' };
  if (sortBy === 'price_asc') orderBy = { price: 'asc' };
  if (sortBy === 'price_desc') orderBy = { price: 'desc' };
  if (sortBy === 'duration_asc') orderBy = { durationMin: 'asc' };

  // 3. Parallel Execution for performance
  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        Expert: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bookings: {
              where: { review: { isNot: null } },
              select: { review: { select: { rating: true } } }
            }
          }
        },
        Organization: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            bookings: {
              where: { review: { isNot: null } },
              select: { review: { select: { rating: true } } }
            }
          }
        }
      }
    }),
    prisma.service.count({ where })
  ]);

  // 4. Transform into Standardized Discovery DTO
  const mappedServices = services.map(s => {
    const provider = s.Expert || s.Organization;
    const type = s.Expert ? 'expert' : 'organization';
    const name = s.Expert ? s.Expert.name : s.Organization?.companyName || 'Unknown';
    const avatarUrl = s.Expert ? s.Expert.avatarUrl : s.Organization?.logoUrl || null;
    
    // Calculate provider average rating from historic bookings
    const allReviews = provider?.bookings.map(b => b.review).filter(Boolean) || [];
    const avgRating = allReviews.length > 0 
      ? allReviews.reduce((acc, r) => acc + (r?.rating || 0), 0) / allReviews.length 
      : 0;

    return {
      id: s.id,
      title: s.title,
      description: s.description,
      price: Number(s.price),
      durationMin: s.durationMin,
      provider: {
        id: provider?.id || '',
        name,
        type: type as "expert" | "organization",
        avatarUrl,
        averageRating: avgRating,
      }
    };
  });

  return {
    services: mappedServices,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  };
}