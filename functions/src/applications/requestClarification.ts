/**
 * requestClarification — HTTPS callable that transitions an application from
 * "Under Review" to "Clarification Requested" and posts a comment.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';
import { sendEmail } from '../email/sendEmail';
import { clarificationRequestEmail } from '../email/templates';
import { APP_BASE_URL } from '../config';

export const requestClarification = onCall(
  { region: 'us-central1' },
  async (request): Promise<{ success: true }> => {
    requireRole(request, 'reviewer', 'admin');

    const uid = request.auth!.uid;
    const reviewerName = (request.auth!.token['name'] as string) ?? 'Reviewer';
    const reviewerEmail = (request.auth!.token['email'] as string) ?? '';
    const callerRole = request.auth!.token['role'] as string;

    const { applicationId, message } = request.data as {
      applicationId: string;
      message: string;
    };

    if (!applicationId || typeof applicationId !== 'string') {
      throw new HttpsError('invalid-argument', 'applicationId is required.');
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new HttpsError('invalid-argument', 'message is required.');
    }

    const db = admin.firestore();
    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      throw new HttpsError('not-found', 'Application not found.');
    }

    const appData = appSnap.data()!;
    const status = appData['status'] as string;
    if (status !== 'Under Review') {
      throw new HttpsError(
        'failed-precondition',
        `Cannot request clarification: application status is "${status}", expected "Under Review".`,
      );
    }

    const batch = db.batch();

    // 1. Update application status.
    batch.update(appRef, {
      status: 'Clarification Requested',
      lastEditedAt: FieldValue.serverTimestamp(),
    });

    // 2. Create a comment document.
    const commentRef = appRef.collection('comments').doc();
    batch.set(commentRef, {
      type: 'clarification_request',
      text: message.trim(),
      authorUid: uid,
      authorName: reviewerName,
      authorRole: callerRole,
      createdAt: FieldValue.serverTimestamp(),
      isResolved: false,
    });

    // 3. Changelog entry.
    const logRef = appRef.collection('changelog').doc();
    batch.set(logRef, {
      fieldName: 'status',
      oldValue: 'Under Review',
      newValue: 'Clarification Requested',
      changedBy: uid,
      changedByEmail: reviewerEmail,
      changedAt: FieldValue.serverTimestamp(),
      reason: 'reviewer_status_change',
    });

    await batch.commit();

    // Send email to submitter.
    const submitterEmail = appData['submitterEmail'] as string;
    const applicantName = (appData['applicantName'] as string) || 'Applicant';
    const baseUrl = APP_BASE_URL.value();

    try {
      const tpl = clarificationRequestEmail(applicantName, applicationId, baseUrl, message.trim());
      await sendEmail({ to: submitterEmail, ...tpl });
    } catch (emailErr) {
      console.error('[requestClarification] Email send failed:', emailErr);
    }

    return { success: true };
  },
);
