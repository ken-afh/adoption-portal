/**
 * validateMx — HTTPS callable that checks whether a domain has MX records.
 * Uses Node's built-in https module; no extra dependencies.
 */

import * as https from 'https';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

interface ValidateMxRequest {
  email: string;
}

interface ValidateMxResponse {
  valid: boolean;
  domain?: string;
}

function dnsLookup(domain: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`;
    const req = https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
      res.on('end', () => {
        try {
          const json = JSON.parse(raw) as { Status: number; Answer?: unknown[] };
          // Status 0 = NOERROR; Answer must be present and non-empty.
          resolve(json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export const validateMx = onCall(
  { region: 'us-central1' },
  async (request): Promise<ValidateMxResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const data = request.data as ValidateMxRequest;
    if (!data?.email || typeof data.email !== 'string') {
      throw new HttpsError('invalid-argument', 'email is required.');
    }

    const parts = data.email.split('@');
    if (parts.length !== 2 || !parts[1]) {
      return { valid: false };
    }
    const domain = parts[1].toLowerCase();

    const valid = await dnsLookup(domain);
    return { valid, domain };
  },
);
