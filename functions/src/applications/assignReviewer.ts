/**
 * assignReviewer — HTTPS callable (admin only) that assigns a reviewer to
 * an application and optionally auto-starts the review.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';
import { sendEmail } from '../email/sendEmail';
import { reviewerAssignedEmail } from '../email/templates';
import { APP_BASE_URL } from '../config';

export const assignReviewer = onCall(
  { region: 'us-central1' },
  async (request): Promise<{ success: true }> => {
    requireRole(request, 'admin');

    const adminUid = request.auth!.uid;
    const adminEmail = (request.auth!.token['email'] as string) ?? '';

    const { applicationId, reviewerUid, reviewerEmail } = request.data as {
      applicationId: string;
      reviewerUid: string;
      reviewerEmail: string;
    };

    if (!applicationId || typeof applicationId !== 'string') {
      throw new HttpsError('invalid-argument', 'applicationId is required.');
    }
    if (!reviewerUid || typeof reviewerUid !== 'string') {
      throw new HttpsError('invalid-argument', 'reviewerUid is required.');
    }
    if (!reviewerEmail || typeof reviewerEmail !== 'string') {
      throw new HttpsError('invalid-argument', 'reviewerEmail is required.');
    }

    const db = admin.firestore();
    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      throw new HttpsError('not-found', 'Application not found.');
    }

    const appData = appSnap.data()!;
    const currentStatus = appData['status'] as string;
    const autoStartReview = currentStatus === 'Submitted';

    const updates: Record<string, unknown> = {
      assignedReviewerUid: reviewerUid,
      assignedReviewerEmail: reviewerEmail,
      lastEditedAt: FieldValue.serverTimestamp(),
    };

    if (autoStartReview) {
      updates['status'] = 'Under Review';
    }

    const batch = db.batch();
    batch.update(appRef, updates);

    // Changelog — reviewer assignment.
    const logRef1 = appRef.collection('changelog').doc();
    batch.set(logRef1, {
      fieldName: 'assignedReviewerEmail',
      oldValue: appData['assignedReviewerEmail'] ?? null,
      newValue: reviewerEmail,
      changedBy: adminUid,
      changedByEmail: adminEmail,
      changedAt: FieldValue.serverTimestamp(),
      reason: 'reviewer_status_change',
    });

    if (autoStartReview) {
      const logRef2 = appRef.collection('changelog').doc();
      batch.set(logRef2, {
        fieldName: 'status',
        oldValue: 'Submitted',
        newValue: 'Under Review',
        changedBy: adminUid,
        changedByEmail: adminEmail,
        changedAt: FieldValue.serverTimestamp(),
        reason: 'reviewer_status_change',
      });
    }

    await batch.commit();

    // Send assignment email to reviewer.
    const applicantName = (appData['applicantName'] as string) || 'Applicant';
    const baseUrl = APP_BASE_URL.value();

    try {
      const tpl = reviewerAssignedEmail(applicantName, applicationId, baseUrl);
      await sendEmail({ to: reviewerEmail, ...tpl });
    } catch (emailErr) {
      console.error('[assignReviewer] Email send failed:', emailErr);
    }

    return { success: true };
  },
);
