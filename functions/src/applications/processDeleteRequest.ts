/**
 * processDeleteRequest — HTTPS callable that an admin uses to fulfil a pending
 * GDPR deletion request.
 *
 * It permanently deletes all of the user's applications (and their
 * subcollections), their role document, and their Firebase Auth account, then
 * marks the deleteRequest document as processed.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
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

export const processDeleteRequest = onCall(
  { region: 'us-east4' },
  async (request): Promise<{ success: true }> => {
    requireRole(request, ROLE.ADMIN);

    const { requestUid } = request.data as { requestUid: string };

    if (!requestUid || typeof requestUid !== 'string') {
      throw new HttpsError('invalid-argument', 'requestUid is required.');
    }

    const adminUid = request.auth!.uid;
    const db = admin.firestore();

    const reqRef = db.collection('deleteRequests').doc(requestUid);
    const reqSnap = await reqRef.get();

    if (!reqSnap.exists) {
      throw new HttpsError('not-found', 'Delete request not found.');
    }

    const reqData = reqSnap.data()!;
    if (reqData['status'] !== 'pending') {
      throw new HttpsError('failed-precondition', 'This request has already been processed.');
    }

    // 1. Delete all applications and their subcollections.
    const appsSnap = await db
      .collection('applications')
      .where('submitterId', '==', requestUid)
      .get();

    for (const appDoc of appsSnap.docs) {
      await deleteCollection(db, appDoc.ref.collection('comments'));
      await deleteCollection(db, appDoc.ref.collection('changelog'));
      await appDoc.ref.delete();
    }

    // 2. Delete role document.
    await db.collection('roles').doc(requestUid).delete();

    // 3. Mark the request as processed before deleting the Auth account so we
    //    have a record even if the auth deletion fails.
    await reqRef.update({
      status: 'processed',
      processedAt: FieldValue.serverTimestamp(),
      processedBy: adminUid,
    });

    // 4. Delete Firebase Auth account last.
    try {
      await admin.auth().deleteUser(requestUid);
    } catch (err: unknown) {
      // User may have already deleted their own account; treat as non-fatal.
      const code = (err as { code?: string }).code;
      if (code !== 'auth/user-not-found') throw err;
    }

    return { success: true };
  },
);
