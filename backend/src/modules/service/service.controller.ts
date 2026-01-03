import { FastifyReply, FastifyRequest } from 'fastify';
import * as serviceService from './service.service.js';
import { CreateServiceInput, UpdateServiceInput } from './service.schema.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// SERVICE MODULE - CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Orchestrate HTTP requests for Service management.
// Standards: 
// - Dynamic ownership assignment based on User Role.
// - Clean status code responses (201 for Created).
// - Centralized request context usage (request.user).
// --------------------------------------------------------------------------

/**
 * CREATE SERVICE HANDLER
 * POST /services
 */
export async function createServiceHandler(
  request: FastifyRequest<{ Body: CreateServiceInput }>,
  reply: FastifyReply
) {
  const user = request.user; // Populated by authenticate middleware

  // Determine if the provider is an Expert or Organization based on their session role
  const expertId = user.role === ROLES.EXPERT ? user.id : undefined;
  const organizationId = user.role === ROLES.ORGANIZATION ? user.id : undefined;

  const service = await serviceService.createService({
    ...request.body,
    expertId,
    organizationId,
  });

  return reply.status(201).send({
    success: true,
    message: 'Service created successfully',
    data: service,
  });
}

/**
 * GET PROVIDER SERVICES HANDLER (Public)
 * GET /services/:providerId?type=expert
 */
export async function getProviderServicesHandler(
  request: FastifyRequest<{ 
    Params: { providerId: string }; 
    Querystring: { type: 'expert' | 'organization' } 
  }>,
  reply: FastifyReply
) {
  const { providerId } = request.params;
  const { type } = request.query;

  const services = await serviceService.getServicesByProvider(providerId, type);

  return reply.status(200).send({
    success: true,
    data: services,
  });
}

/**
 * UPDATE SERVICE HANDLER
 * PATCH /services/:serviceId
 */
export async function updateServiceHandler(
  request: FastifyRequest<{ 
    Params: { serviceId: string }; 
    Body: UpdateServiceInput 
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  const { serviceId } = request.params;

  // The service layer handles the ownership verification using user.id
  const updatedService = await serviceService.updateService(
    serviceId,
    user.id,
    request.body
  );

  return reply.status(200).send({
    success: true,
    message: 'Service updated successfully',
    data: updatedService,
  });
}

/**
 * DELETE SERVICE HANDLER
 * DELETE /services/:serviceId
 */
export async function deleteServiceHandler(
  request: FastifyRequest<{ Params: { serviceId: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  const { serviceId } = request.params;

  await serviceService.deleteService(serviceId, user.id);

  return reply.status(200).send({
    success: true,
    message: 'Service deleted or deactivated successfully',
  });
}