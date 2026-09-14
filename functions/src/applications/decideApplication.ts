/**
 * decideApplication — HTTPS callable that approves or rejects an application
 * that is "Under Review" or "Clarification Received".
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';
import { STATUS, ROLE } from '../constants';
import type { ApplicationStatus } from '../types';
import { sendEmail } from '../email/sendEmail';
import { approvalEmail, rejectionEmail } from '../email/templates';
import { APP_BASE_URL } from '../config';

const DECIDABLE_STATUSES: ApplicationStatus[] = [STATUS.UNDER_REVIEW, STATUS.CLARIFICATION_RECEIVED];

export const decideApplication = onCall(
  { region: 'us-east4' },
  async (request): Promise<{ success: true }> => {
    requireRole(request, ROLE.REVIEWER, ROLE.ADMIN);

    const uid = request.auth!.uid;
    const reviewerEmail = (request.auth!.token['email'] as string) ?? '';

    const { applicationId, decision, reason } = request.data as {
      applicationId: string;
      decision: 'approved' | 'rejected';
      reason?: string;
    };

    if (!applicationId || typeof applicationId !== 'string') {
      throw new HttpsError('invalid-argument', 'applicationId is required.');
    }
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new HttpsError('invalid-argument', 'decision must be "approved" or "rejected".');
    }
    if (decision === 'rejected' && (!reason || !reason.trim())) {
      throw new HttpsError('invalid-argument', 'reason is required when rejecting.');
    }

    const db = admin.firestore();
    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      throw new HttpsError('not-found', 'Application not found.');
    }

    const appData = appSnap.data()!;
    const currentStatus = appData['status'] as ApplicationStatus;

    if (!DECIDABLE_STATUSES.includes(currentStatus)) {
      throw new HttpsError(
        'failed-precondition',
        `Cannot decide application: status is "${currentStatus}".`,
      );
    }

    const newStatus = decision === 'approved' ? STATUS.APPROVED : STATUS.REJECTED;
    const decisionReason = decision === 'rejected' ? (reason ?? '').trim() : null;

    const batch = db.batch();

    batch.update(appRef, {
      status: newStatus,
      decisionAt: FieldValue.serverTimestamp(),
      decisionBy: reviewerEmail,
      decisionReason,
      lastEditedAt: FieldValue.serverTimestamp(),
    });

    const logRef = appRef.collection('changelog').doc();
    batch.set(logRef, {
      fieldName: 'status',
      oldValue: currentStatus,
      newValue: newStatus,
      changedBy: uid,
      changedByEmail: reviewerEmail,
      changedAt: FieldValue.serverTimestamp(),
      reason: 'reviewer_status_change',
    });

    await batch.commit();

    // Send decision email to submitter.
    const submitterEmail = appData['submitterEmail'] as string;
    const applicantName = (appData['applicantName'] as string) || 'Applicant';
    const baseUrl = APP_BASE_URL.value();

    try {
      if (decision === 'approved') {
        const tpl = approvalEmail(applicantName, baseUrl);
        await sendEmail({ to: submitterEmail, ...tpl });
      } else {
        const tpl = rejectionEmail(applicantName, applicationId, baseUrl, decisionReason ?? '');
        await sendEmail({ to: submitterEmail, ...tpl });
      }
    } catch (emailErr) {
      console.error('[decideApplication] Email send failed:', emailErr);
    }

    return { success: true };
  },
);
