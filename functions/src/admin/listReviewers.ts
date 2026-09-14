/**
 * listReviewers — HTTPS callable (admin only).
 * Returns all users from the `roles` collection with role "reviewer" or "admin".
 */

import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';
import { ROLE } from '../constants';

interface Reviewer {
  uid: string;
  email: string;
  role: string;
}

interface ListReviewersResult {
  reviewers: Reviewer[];
}

export const listReviewers = onCall(
  { region: 'us-east4' },
  async (request): Promise<ListReviewersResult> => {
    requireRole(request, ROLE.ADMIN);

    const snapshot = await admin
      .firestore()
      .collection('roles')
      .where('role', 'in', [ROLE.REVIEWER, ROLE.ADMIN])
      .get();

    const reviewers: Reviewer[] = snapshot.docs.map((doc) => {
      const data = doc.data() as { uid: string; email: string; role: string };
      return { uid: data.uid, email: data.email, role: data.role };
    });

    return { reviewers };
  },
);
