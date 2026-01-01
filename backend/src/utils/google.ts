import { OAuth2Client } from 'google-auth-library';
import { env } from '../env.js';

// --------------------------------------------------------------------------
// GOOGLE OAUTH UTILITIES
// --------------------------------------------------------------------------
// Purpose: Verify Identity Tokens sent from the Frontend.
// Standards:
// - Uses official google-auth-library 
// - Verifies Audience (Client ID) matches backend config
// --------------------------------------------------------------------------

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Verify Google ID Token
 * Returns standardized GoogleUser object or throws error.
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUser> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Invalid Token Payload');
    }

    if (!payload.email) {
      throw new Error('Google Account does not have an email address');
    }

    if (!payload.email_verified) {
      throw new Error('Google Account email is not verified');
    }

    return {
      googleId: payload.sub, // Unique Google ID
      email: payload.email,
      name: payload.name || 'Google User',
      avatarUrl: payload.picture,
    };
  } catch (error) {
    console.error('Google Verification Error:', error);
    throw new Error('Invalid Google Token');
  }
}