import { FastifyReply, FastifyRequest } from 'fastify';
import * as bookingService from './booking.service.js';
import { CreateBookingInput, UpdateBookingStatusInput } from './booking.schema.js';
import { ROLES } from '../../../../shared/types.js';

// --------------------------------------------------------------------------
// BOOKING MODULE - CONTROLLER
// --------------------------------------------------------------------------
// Purpose: Orchestrate HTTP requests for the Booking system.
// Standards: 
// - Secure context extraction (request.user).
// - Role-based data filtering.
// - Explicit status code management.
// --------------------------------------------------------------------------

/**
 * CREATE BOOKING HANDLER
 * POST /bookings
 */
export async function createBookingHandler(
  request: FastifyRequest<{ Body: CreateBookingInput }>,
  reply: FastifyReply
) {
  const user = request.user;

  // Gold Standard: Ensure only standard Users can initiate a booking
  if (user.role !== ROLES.USER) {
    return reply.status(403).send({
      success: false,
      message: 'Only clients can create bookings',
    });
  }

  const booking = await bookingService.createBooking({
    userId: user.id,
    serviceId: request.body.serviceId,
    startTime: request.body.startTime,
  });

  return reply.status(201).send({
    success: true,
    message: 'Booking request sent successfully',
    data: booking,
  });
}

/**
 * GET MY BOOKINGS (For Clients)
 * GET /bookings/me
 */
export async function getUserBookingsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;

  const bookings = await bookingService.getUserBookings(user.id);

  return reply.status(200).send({
    success: true,
    data: bookings,
  });
}

/**
 * GET PROVIDER BOOKINGS (For Experts/Organizations)
 * GET /bookings/provider
 */
export async function getProviderBookingsHandler(
  request: FastifyRequest<{ Querystring: { role: 'EXPERT' | 'ORGANIZATION' } }>,
  reply: FastifyReply
) {
  const user = request.user;
  const { role } = request.query;

  // Gold Standard: Security check to ensure the user is querying their own provider type
  if (user.role !== role) {
    return reply.status(403).send({
      success: false,
      message: `Access denied. You are logged in as ${user.role}, not ${role}`,
    });
  }

  const bookings = await bookingService.getProviderBookings(user.id, role);

  return reply.status(200).send({
    success: true,
    data: bookings,
  });
}

/**
 * UPDATE BOOKING STATUS HANDLER
 * PATCH /bookings/:bookingId/status
 */
export async function updateBookingStatusHandler(
  request: FastifyRequest<{ 
    Params: { bookingId: string }; 
    Body: UpdateBookingStatusInput 
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  const { bookingId } = request.params;
  const { status } = request.body;

  const updatedBooking = await bookingService.updateBookingStatus(
    bookingId,
    status,
    user.id
  );

  return reply.status(200).send({
    success: true,
    message: `Booking status updated to ${status}`,
    data: updatedBooking,
  });
}