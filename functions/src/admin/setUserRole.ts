/**
 * setUserRole — HTTPS callable (admin only) that sets a user's role in both
 * the Firestore /roles/{uid} document and the Firebase Auth custom claim.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';
import { UserRole } from '../types';
import { ROLE } from '../constants';

const VALID_ROLES: UserRole[] = [ROLE.SUBMITTER, ROLE.REVIEWER, ROLE.ADMIN];

export const setUserRole = onCall(
  { region: 'us-east4' },
  async (request): Promise<{ success: true; uid: string }> => {
    requireRole(request, ROLE.ADMIN);

    const { email, role } = request.data as { email: string; role: UserRole };

    if (!email || typeof email !== 'string') {
      throw new HttpsError('invalid-argument', 'email is required.');
    }
    if (!role || !VALID_ROLES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `role must be one of: ${VALID_ROLES.join(', ')}.`,
      );
    }

    let targetUser: admin.auth.UserRecord;
    try {
      targetUser = await admin.auth().getUserByEmail(email);
    } catch {
      throw new HttpsError('not-found', `No user found with email "${email}".`);
    }

    const uid = targetUser.uid;

    // Update Firestore role document.
    await admin.firestore().collection('roles').doc(uid).set(
      { uid, role, email },
      { merge: true },
    );

    // Update custom claim (onRoleDocWritten will also do this via trigger,
    // but we set it directly here for immediate effect).
    await admin.auth().setCustomUserClaims(uid, { role });

    return { success: true, uid };
  },
);
