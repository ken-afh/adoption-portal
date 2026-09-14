/**
 * onRoleDocWritten — Firestore trigger that syncs /roles/{uid} writes back
 * to Firebase Auth custom claims, so that claims always match Firestore.
 */

import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { UserRole } from '../types';

export const onRoleDocWritten = onDocumentWritten(
  { document: 'roles/{uid}', region: 'us-east4' },
  async (event) => {
    const uid = event.params['uid'];
    const afterData = event.data?.after.data();

    if (!afterData) {
      // Document was deleted — nothing to sync.
      return;
    }

    const role = afterData['role'] as UserRole;
    if (!role) return;

    await admin.auth().setCustomUserClaims(uid, { role });
  },
);
