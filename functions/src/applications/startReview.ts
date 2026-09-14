/**
 * startReview — HTTPS callable that transitions an application from
 * "Submitted" to "Under Review".
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';
import { STATUS, ROLE } from '../constants';

export const startReview = onCall(
  { region: 'us-east4' },
  async (request): Promise<{ success: true }> => {
    requireRole(request, ROLE.REVIEWER, ROLE.ADMIN);

    const uid = request.auth!.uid;
    const email = (request.auth!.token['email'] as string) ?? '';

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

    const status = appSnap.data()!['status'] as string;
    if (status !== STATUS.SUBMITTED) {
      throw new HttpsError(
        'failed-precondition',
        `Cannot start review: application status is "${status}", expected "${STATUS.SUBMITTED}".`,
      );
    }

    const batch = db.batch();

    batch.update(appRef, {
      status: STATUS.UNDER_REVIEW,
      lastEditedAt: FieldValue.serverTimestamp(),
    });

    const logRef = appRef.collection('changelog').doc();
    batch.set(logRef, {
      fieldName: 'status',
      oldValue: STATUS.SUBMITTED,
      newValue: STATUS.UNDER_REVIEW,
      changedBy: uid,
      changedByEmail: email,
      changedAt: FieldValue.serverTimestamp(),
      reason: 'reviewer_status_change',
    });

    await batch.commit();

    return { success: true };
  },
);
