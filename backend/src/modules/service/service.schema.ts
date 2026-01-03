import { z } from 'zod';

// --------------------------------------------------------------------------
// SERVICE MODULE - SCHEMAS
// --------------------------------------------------------------------------
// Purpose: Request validation and Type definitions.
// Standards: 
// - Strict Zod validation.
// - Coerced types for incoming string-based numbers (from forms).
// - Reusable base schemas to keep code DRY.
// --------------------------------------------------------------------------

// Base fields used across multiple schemas
const serviceCore = {
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(1000).optional(),
  // Use coerce to handle cases where frontend sends numbers as strings
  price: z.coerce.number().positive('Price must be a positive value'),
  durationMin: z.coerce.number().int().min(5, 'Minimum duration is 5 minutes'),
};

/**
 * CREATE SERVICE SCHEMA
 */
export const createServiceSchema = z.object({
  body: z.object({
    ...serviceCore,
    // Note: expertId/organizationId are typically extracted from the 
    // authenticated session, but included here for flexible internal use.
    expertId: z.string().uuid().optional(),
    organizationId: z.string().uuid().optional(),
  }).refine(data => data.expertId || data.organizationId, {
    message: "Service must belong to either an Expert or an Organization",
    path: ["expertId"],
  }),
});

/**
 * UPDATE SERVICE SCHEMA
 */
export const updateServiceSchema = z.object({
  params: z.object({
    serviceId: z.string().uuid(),
  }),
  body: z.object({
    title: serviceCore.title.optional(),
    description: serviceCore.description.optional(),
    price: serviceCore.price.optional(),
    durationMin: serviceCore.durationMin.optional(),
    isActive: z.boolean().optional(),
  }),
});

/**
 * GET SERVICES SCHEMA
 */
export const getServicesSchema = z.object({
  params: z.object({
    providerId: z.string().uuid(),
  }),
  query: z.object({
    type: z.enum(['expert', 'organization']),
  }),
});

/**
 * DELETE SERVICE SCHEMA
 */
export const deleteServiceSchema = z.object({
  params: z.object({
    serviceId: z.string().uuid(),
  }),
});

// TypeScript Types derived from schemas
export type CreateServiceInput = z.infer<typeof createServiceSchema>['body'];
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>['body'];