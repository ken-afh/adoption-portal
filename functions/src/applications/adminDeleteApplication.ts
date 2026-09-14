/**
 * adminDeleteApplication — HTTPS callable that lets an admin permanently delete
 * any application regardless of status, including all subcollections.
 *
 * Reviewers are explicitly denied — only callers with role == 'admin' may call
 * this function.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';
import { ROLE } from '../constants';

async function deleteCollection(
  db: admin.firestore.Firestore,
  collRef: admin.firestore.CollectionReference,
) {
  const snap = await collRef.get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export const adminDeleteApplication = onCall(
  { region: 'us-east4' },
  async (request): Promise<{ success: true }> => {
    requireRole(request, ROLE.ADMIN);

    const { applicationId } = request.data as { applicationId: string };

    if (!applicationId || typeof applicationId !== 'string') {
      throw new HttpsError('invalid-argument', 'applicationId is required.');
    }

    const db = admin.firestore();
    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      throw new HttpsError('not-found', 'Application not found.');
    }

    await deleteCollection(db, appRef.collection('comments'));
    await deleteCollection(db, appRef.collection('changelog'));
    await appRef.delete();

    return { success: true };
  },
);
