/**
 * Environment configuration helpers for Cloud Functions.
 *
 * Firebase Functions v2 (2nd gen) reads secrets from Google Secret Manager
 * via `defineSecret()` / `params.defineSecret()`. For local development
 * the Firebase emulator reads from a `.env` file in the functions/ directory.
 *
 * Usage example in a function:
 *   import { smtpConfig } from './config';
 *   const transport = nodemailer.createTransport(smtpConfig());
 */

import { defineSecret, defineString } from 'firebase-functions/params';

// ─── Secrets (populated from Secret Manager in production) ───────────────────

/** SMTP password / app password for the outbound email account. */
export const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD');

// ─── String params (can be set in .env for local dev) ────────────────────────

/** The "from" address used in outbound notification emails. */
export const EMAIL_FROM = defineString('EMAIL_FROM', {
  default: 'no-reply@aforeverhome.net',
  description: 'Sender address for transactional emails',
});

/** SMTP host for Nodemailer transport. */
export const SMTP_HOST = defineString('SMTP_HOST', {
  default: 'smtp.gmail.com',
  description: 'SMTP server hostname',
});

/** SMTP port (as a string; convert to number before use). */
export const SMTP_PORT = defineString('SMTP_PORT', {
  default: '587',
  description: 'SMTP server port',
});

/** SMTP username / email account. */
export const SMTP_USER = defineString('SMTP_USER', {
  default: '',
  description: 'SMTP authentication username',
});

/** Base URL of the deployed UI, used to build links in emails. */
export const APP_BASE_URL = defineString('APP_BASE_URL', {
  default: 'http://localhost:5173',
  description: 'Base URL for the React app (used in email links)',
});

/** Google Workspace domain that reviewers must belong to. */
export const ORG_DOMAIN = defineString('ORG_DOMAIN', {
  default: 'aforeverhome.net',
  description: 'Allowed Google Workspace domain for reviewer sign-in',
});

/**
 * Override address for new-submission notifications.
 * In production this should be info@aforeverhome.net.
 * During testing, set this to your own email to avoid alerting the real inbox.
 * This can also be overridden at runtime via the Firestore /config/notifications doc.
 */
export const NOTIFY_EMAIL = defineString('NOTIFY_EMAIL', {
  default: 'info@aforeverhome.net',
  description: 'Recipient for new-submission and resubmission notifications (override for testing)',
});

// ─── Runtime config helpers ───────────────────────────────────────────────────

import * as adminPkg from 'firebase-admin';

/**
 * Returns the effective notification email address.
 * Checks Firestore /config/notifications.notifyEmail first; falls back to the
 * NOTIFY_EMAIL param so callers never have to worry about null/undefined.
 */
export async function getNotifyEmail(): Promise<string> {
  try {
    const db = adminPkg.firestore();
    const snap = await db.collection('config').doc('notifications').get();
    if (snap.exists) {
      const override = snap.data()?.['notifyEmail'] as string | undefined;
      if (override && override.trim()) return override.trim();
    }
  } catch {
    // Firestore unavailable — fall through to the param.
  }
  return NOTIFY_EMAIL.value();
}

// ─── Config factory helpers ───────────────────────────────────────────────────

/**
 * Returns a Nodemailer SMTP transport config object.
 * Call this inside the function handler (not at module scope) so that
 * secret values have been resolved by the Functions runtime.
 */
export function smtpConfig() {
  return {
    host: SMTP_HOST.value(),
    port: parseInt(SMTP_PORT.value(), 10),
    secure: false, // STARTTLS — true only for port 465
    auth: {
      user: SMTP_USER.value(),
      pass: SMTP_PASSWORD.value(),
    },
  };
}
