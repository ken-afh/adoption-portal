/**
 * deleteApplication — HTTPS callable that lets a submitter delete their own
 * draft or rejected application, including all subcollections.
 *
 * Allowed statuses: Draft, Rejected.
 * Applications that are under review or approved cannot be deleted.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { STATUS } from '../constants';
import type { ApplicationStatus } from '../types';

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

export const deleteApplication = onCall(
  { region: 'us-east4' },
  async (request): Promise<{ success: true }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.auth.uid;
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

    const data = appSnap.data()!;

    if (data['submitterId'] !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this application.');
    }

    const deletableStatuses: ApplicationStatus[] = [STATUS.DRAFT, STATUS.REJECTED];
    if (!deletableStatuses.includes(data['status'] as ApplicationStatus)) {
      throw new HttpsError(
        'failed-precondition',
        'Only draft or rejected applications can be deleted.',
      );
    }

    // Delete subcollections first, then the parent document.
    await deleteCollection(db, appRef.collection('comments'));
    await deleteCollection(db, appRef.collection('changelog'));
    await appRef.delete();

    return { success: true };
  },
);
