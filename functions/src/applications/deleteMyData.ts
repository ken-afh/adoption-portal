/**
 * deleteMyData — HTTPS callable that queues a GDPR "right to erasure" request.
 *
 * Instead of immediately deleting the user's data, this creates a document in
 * /deleteRequests/{uid} which an admin must review and process via
 * processDeleteRequest.  This satisfies GDPR while giving the organisation a
 * window to verify the request is legitimate.
 *
 * A user may only have one pending request at a time.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const deleteMyData = onCall(
  { region: 'us-east4' },
  async (request): Promise<{ success: true; requestId: string }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.auth.uid;
    const email = (request.auth.token['email'] as string) ?? '';
    const db = admin.firestore();

    const reqRef = db.collection('deleteRequests').doc(uid);
    const existing = await reqRef.get();

    if (existing.exists && existing.data()!['status'] === 'pending') {
      throw new HttpsError(
        'already-exists',
        'A deletion request is already pending. An administrator will process it shortly.',
      );
    }

    await reqRef.set({
      uid,
      email,
      requestedAt: FieldValue.serverTimestamp(),
      status: 'pending',           // 'pending' | 'processed'
      processedAt: null,
      processedBy: null,
    });

    return { success: true, requestId: uid };
  },
);
