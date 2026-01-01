import { prisma } from '../../db/index.js';

// --------------------------------------------------------------------------
// ORGANIZATION SERVICE
// --------------------------------------------------------------------------
// Purpose: Business logic for Organization profile management.
// Standards:
// - Strict typing.
// - Database interactions via Prisma (Siloed Organization Table).
// --------------------------------------------------------------------------

/**
 * GET ORGANIZATION PROFILE
 * Public or Internal use.
 */
export async function getOrganizationById(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { 
      id: organizationId,
      isBlocked: false,
      deletedAt: null 
    },
    select: {
      id: true,
      email: true,
      companyName: true,
      logoUrl: true,
      websiteUrl: true,
      regNumber: true,
      createdAt: true,
      googleId: true,
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  return org;
}

/**
 * UPDATE ORGANIZATION PROFILE
 */
export async function updateOrganizationProfile(
  organizationId: string, 
  data: { 
    companyName?: string; 
    logoUrl?: string; 
    websiteUrl?: string;
    regNumber?: string;
  }
) {
  const updatedOrg = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      companyName: data.companyName,
      logoUrl: data.logoUrl,
      websiteUrl: data.websiteUrl,
      regNumber: data.regNumber,
    },
    select: {
      id: true,
      email: true,
      companyName: true,
      logoUrl: true,
      websiteUrl: true,
      regNumber: true,
    },
  });

  return updatedOrg;
}