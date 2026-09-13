/**
 * requireRole — throws HttpsError if the caller is unauthenticated or
 * does not hold one of the required roles.
 */

import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { UserRole } from '../types';

export function requireRole(request: CallableRequest, ...roles: UserRole[]): void {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to call this function.');
  }
  const callerRole = request.auth.token['role'] as UserRole | undefined;
  if (!callerRole || !roles.includes(callerRole)) {
    throw new HttpsError(
      'permission-denied',
      `Access denied. Required role: ${roles.join(' or ')}.`,
    );
  }
}
