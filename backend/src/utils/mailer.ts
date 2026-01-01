import nodemailer from 'nodemailer';
import { env } from '../env.js';

// --------------------------------------------------------------------------
// EMAIL SERVICE (NODEMAILER)
// --------------------------------------------------------------------------
// Purpose: Handle transactional emails (Verification, Password Reset).
// Standards:
// - Uses Nodemailer with SMTP.
// - Graceful fallback/mocking if SMTP credentials are not provided (Dev mode).
// --------------------------------------------------------------------------

const isSmtpConfigured = env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS;

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

/**
 * Generic Send Email Function
 */
async function sendEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    if (env.NODE_ENV !== 'test') {
      console.log(`\n📧 [MOCK EMAIL] To: ${to} | Subject: ${subject}`);
    }
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${env.SMTP_FROM}" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('❌ Email Failed:', error);
    // We do not throw here to prevent blocking the auth flow if email fails,
    // but in a strict production env, you might want to handle this differently.
  }
}

/**
 * Send Verification Email
 * URL: {FRONTEND_URL}/verify?token=xyz
 */
export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${env.FRONTEND_URL}/verify?token=${token}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Digital Offices!</h2>
      <p>Please verify your email address to activate your account.</p>
      <div style="margin: 20px 0;">
        <a href="${verifyUrl}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
      </div>
      <p>Or click this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    </div>
  `;

  await sendEmail(email, 'Verify your email - Digital Offices', html);
}

/**
 * Send Password Reset Email
 * URL: {FRONTEND_URL}/reset-password?token=xyz
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>You requested a password reset. Click the button below to proceed.</p>
      <div style="margin: 20px 0;">
        <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
      </div>
      <p>Or click this link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail(email, 'Reset your password - Digital Offices', html);
}