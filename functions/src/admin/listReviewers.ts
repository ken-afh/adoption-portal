/**
 * listReviewers — HTTPS callable (admin only).
 * Returns all users from the `roles` collection with role "reviewer" or "admin".
 */

import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';

interface Reviewer {
  uid: string;
  email: string;
  role: string;
}

interface ListReviewersResult {
  reviewers: Reviewer[];
}

export const listReviewers = onCall(
  { region: 'us-central1' },
  async (request): Promise<ListReviewersResult> => {
    requireRole(request, 'admin');

    const snapshot = await admin
      .firestore()
      .collection('roles')
      .where('role', 'in', ['reviewer', 'admin'])
      .get();

    const reviewers: Reviewer[] = snapshot.docs.map((doc) => {
      const data = doc.data() as { uid: string; email: string; role: string };
      return { uid: data.uid, email: data.email, role: data.role };
    });

    return { reviewers };
  },
);
