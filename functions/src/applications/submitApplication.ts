/**
 * submitApplication — HTTPS callable that transitions a draft/rejected/
 * clarification-requested application to Submitted or Clarification Received.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ApplicationStatus } from '../types';
import { sendEmail } from '../email/sendEmail';
import {
  submissionConfirmationEmail,
  newSubmissionNotificationEmail,
  clarificationReceivedEmail,
} from '../email/templates';
import { APP_BASE_URL } from '../config';

const REQUIRED_FIELDS: string[] = [
  'applicantName',
  'address',
  'city',
  'state',
  'zip',
  'phone',
  'homeType',
  'homeOwnership',
  'adultsInHome',
  'dogExperience',
  'adoptionReason',
  'agreeToHomeVisit',
  'signatureAcknowledgment',
];

const SUBMITTABLE_STATUSES: ApplicationStatus[] = [
  'Draft',
  'Clarification Requested',
  'Rejected',
];

export const submitApplication = onCall(
  { region: 'us-central1' },
  async (request): Promise<{ success: true; newStatus: string }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.auth.uid;
    const { applicationId } = request.data as { applicationId: string };

    if (!applicationId || typeof applicationId !== 'string') {
      throw new HttpsError('invalid-argument', 'applicationId is required.');
    }

    // Verify email is confirmed.
    const authUser = await admin.auth().getUser(uid);
    if (!authUser.emailVerified) {
      throw new HttpsError(
        'failed-precondition',
        'You must verify your email address before submitting.',
      );
    }

    const db = admin.firestore();
    const appRef = db.collection('applications').doc(applicationId);

    let newStatus: ApplicationStatus = 'Submitted';
    let prevStatus: ApplicationStatus = 'Draft';
    let appDataForEmail: Record<string, unknown> = {};

    await db.runTransaction(async (tx) => {
      const appSnap = await tx.get(appRef);
      if (!appSnap.exists) {
        throw new HttpsError('not-found', 'Application not found.');
      }

      const data = appSnap.data()!;

      if (data['submitterId'] !== uid) {
        throw new HttpsError('permission-denied', 'You do not own this application.');
      }

      prevStatus = data['status'] as ApplicationStatus;

      if (!SUBMITTABLE_STATUSES.includes(prevStatus)) {
        throw new HttpsError('already-exists', 'This application has already been submitted.');
      }

      // Validate required fields.
      for (const field of REQUIRED_FIELDS) {
        const val = data[field];
        if (val === null || val === undefined || val === '' || val === false || val === 0) {
          throw new HttpsError(
            'failed-precondition',
            `Required field "${field}" is missing or empty.`,
          );
        }
      }

      // Determine new status and whether to increment resubmitCount.
      let newResubmitCount: number = data['resubmitCount'] as number ?? 0;
      if (prevStatus === 'Clarification Requested') {
        newStatus = 'Clarification Received';
        newResubmitCount += 1;
      } else if (prevStatus === 'Rejected') {
        newStatus = 'Submitted';
        newResubmitCount += 1;
      } else {
        newStatus = 'Submitted';
      }

      const updates: Record<string, unknown> = {
        status: newStatus,
        lastEditedAt: FieldValue.serverTimestamp(),
        resubmitCount: newResubmitCount,
        signatureDate: FieldValue.serverTimestamp(),
      };

      // Only set submittedAt on first submission.
      if (!data['submittedAt']) {
        updates['submittedAt'] = FieldValue.serverTimestamp();
      }

      tx.update(appRef, updates);

      // Changelog entry for status change.
      const logRef = appRef.collection('changelog').doc();
      tx.set(logRef, {
        fieldName: 'status',
        oldValue: prevStatus,
        newValue: newStatus,
        changedBy: uid,
        changedByEmail: authUser.email ?? '',
        changedAt: FieldValue.serverTimestamp(),
        reason: 'resubmission',
      });

      appDataForEmail = data;
    });

    // Post-transaction emails (fire-and-forget; don't let email failures
    // surface as function errors after the transaction succeeded).
    const baseUrl = APP_BASE_URL.value();
    const applicantName = (appDataForEmail['applicantName'] as string) || 'Applicant';
    const submitterEmail = authUser.email ?? '';

    try {
      const confirmTpl = submissionConfirmationEmail(applicantName, applicationId, baseUrl);
      await sendEmail({ to: submitterEmail, ...confirmTpl });

      if (newStatus === 'Submitted') {
        const resubmitCount = (appDataForEmail['resubmitCount'] as number) ?? 0;
        const notifyTpl = newSubmissionNotificationEmail(
          applicantName,
          submitterEmail,
          applicationId,
          baseUrl,
          resubmitCount,
        );
        await sendEmail({ to: 'info@aforeverhome.org', ...notifyTpl });
      } else if (newStatus === 'Clarification Received') {
        const reviewerEmail = appDataForEmail['assignedReviewerEmail'] as string | null;
        if (reviewerEmail) {
          const clarTpl = clarificationReceivedEmail(applicantName, applicationId, baseUrl);
          await sendEmail({ to: reviewerEmail, ...clarTpl });
        }
      }
    } catch (emailErr) {
      console.error('[submitApplication] Email send failed:', emailErr);
    }

    return { success: true, newStatus };
  },
);
