import { FastifyInstance } from 'fastify';
import * as preferenceController from './preference.controller.ts';
import * as preferenceSchema from './preference.schema.ts';
import { authenticate } from '../../middleware/auth.ts';

// --------------------------------------------------------------------------
// PREFERENCE MODULE - ROUTES
// --------------------------------------------------------------------------
// Purpose: Define API endpoints for managing User/Expert/Org UI settings.
// Standards: 
// - Strictly protected (Auth required).
// - Schema-based validation for request integrity.
// - Minimalist RESTful surface.
// --------------------------------------------------------------------------

export async function preferenceRoutes(app: FastifyInstance) {
  /**
   * GET PREFERENCES
   * Retrieves the settings for the currently authenticated user.
   */
  app.get('/', {
    onRequest: [authenticate],
    handler: preferenceController.getPreferencesHandler,
  });

  /**
   * UPDATE PREFERENCES
   * Updates settings (Theme, Timezone, etc.) via partial update (PATCH).
   */
  app.patch('/', {
    schema: preferenceSchema.updatePreferenceSchema,
    onRequest: [authenticate],
    handler: preferenceController.updatePreferencesHandler,
  });
}