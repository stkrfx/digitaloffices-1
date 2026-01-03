import { FastifyInstance } from 'fastify';
import * as serviceController from './service.controller.js';
import * as serviceSchema from './service.schema.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// SERVICE MODULE - ROUTES
// --------------------------------------------------------------------------
// Purpose: Define API endpoints for Service management.
// Standards: 
// - Schema-based validation for high performance.
// - RBAC (Role Based Access Control) applied at the route level.
// - Clear separation of Public and Private endpoints.
// --------------------------------------------------------------------------

export async function serviceRoutes(app: FastifyInstance) {
  /**
   * CREATE SERVICE
   * Restricted to Experts and Organizations.
   */
  app.post('/', {
    schema: serviceSchema.createServiceSchema,
    onRequest: [authenticate, authorize([ROLES.EXPERT, ROLES.ORGANIZATION])],
    handler: serviceController.createServiceHandler,
  });

  /**
   * GET PROVIDER SERVICES
   * Publicly accessible for profile pages.
   */
  app.get('/:providerId', {
    schema: serviceSchema.getServicesSchema,
    handler: serviceController.getProviderServicesHandler,
  });

  /**
   * UPDATE SERVICE
   * Restricted to the owner of the service.
   */
  app.patch('/:serviceId', {
    schema: serviceSchema.updateServiceSchema,
    onRequest: [authenticate, authorize([ROLES.EXPERT, ROLES.ORGANIZATION])],
    handler: serviceController.updateServiceHandler,
  });

  /**
   * DELETE SERVICE
   * Restricted to the owner.
   */
  app.delete('/:serviceId', {
    schema: serviceSchema.deleteServiceSchema,
    onRequest: [authenticate, authorize([ROLES.EXPERT, ROLES.ORGANIZATION])],
    handler: serviceController.deleteServiceHandler,
  });
}