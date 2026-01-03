import { FastifyInstance } from 'fastify';
import * as bookingController from './booking.controller.js';
import { CreateBookingSchema, UpdateBookingStatusSchema, GetProviderBookingsSchema } from '../../../../shared/types.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// BOOKING MODULE - ROUTES
// --------------------------------------------------------------------------
// Purpose: Define API endpoints for the scheduling system.
// Standards: 
// - Strict RBAC for client vs. provider actions.
// - Schema-based request validation.
// - Clear RESTful resource naming.
// --------------------------------------------------------------------------

export async function bookingRoutes(app: FastifyInstance) {
  /**
   * CREATE BOOKING
   * Restricted: Only standard Users (Clients) can book services.
   */
  app.post('/', {
    schema: { body: CreateBookingSchema },
    onRequest: [authenticate, authorize([ROLES.USER])],
    handler: bookingController.createBookingHandler,
  });

  /**
   * GET MY BOOKINGS (Client View)
   * Restricted: Returns bookings where the authenticated user is the 'Client'.
   */
  app.get('/me', {
    onRequest: [authenticate, authorize([ROLES.USER])],
    handler: bookingController.getUserBookingsHandler,
  });

  /**
   * GET PROVIDER BOOKINGS (Expert/Org View)
   * Restricted: Returns bookings where the authenticated user is the 'Provider'.
   */
  app.get('/provider', {
    schema: GetProviderBookingsSchema,
    onRequest: [authenticate, authorize([ROLES.EXPERT, ROLES.ORGANIZATION])],
    handler: bookingController.getProviderBookingsHandler,
  });

  /**
   * UPDATE BOOKING STATUS
   * Restricted: Used by both Clients (to cancel) and Providers (to confirm/complete).
   */
  app.patch('/:bookingId/status', {
    schema: { body: UpdateBookingStatusSchema },
    onRequest: [authenticate, authorize([ROLES.USER, ROLES.EXPERT, ROLES.ORGANIZATION])],
    handler: bookingController.updateBookingStatusHandler,
  });
}