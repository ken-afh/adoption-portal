/**
 * saveApplication — HTTPS callable that persists partial edits to a draft
 * application and records per-field changelog entries.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ApplicationStatus, UserRole } from '../types';
import { STATUS, ROLE } from '../constants';

// Fields the submitter (or reviewer) may write via this function.
// All metadata / workflow fields are excluded.
type ApplicationFields = Record<string, unknown>;

const REVIEWER_ROLES: UserRole[] = [ROLE.REVIEWER, ROLE.ADMIN];

// Statuses in which a submitter is allowed to edit.
const SUBMITTER_EDITABLE_STATUSES: ApplicationStatus[] = [
  STATUS.DRAFT,
  STATUS.CLARIFICATION_REQUESTED,
  STATUS.REJECTED,
];

export const saveApplication = onCall(
  { region: 'us-east4' },
  async (request): Promise<{ success: true; fieldsChanged: number }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.auth.uid;
    const email = (request.auth.token['email'] as string) ?? '';
    const callerRole = request.auth.token['role'] as UserRole | undefined;

    const { applicationId, fields } = request.data as {
      applicationId: string;
      fields: ApplicationFields;
    };

    if (!applicationId || typeof applicationId !== 'string') {
      throw new HttpsError('invalid-argument', 'applicationId is required.');
    }
    if (!fields || typeof fields !== 'object') {
      throw new HttpsError('invalid-argument', 'fields must be an object.');
    }

    const db = admin.firestore();
    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      throw new HttpsError('not-found', 'Application not found.');
    }

    const appData = appSnap.data()!;
    const isOwner = appData['submitterId'] === uid;
    const isReviewer = callerRole && REVIEWER_ROLES.includes(callerRole);

    if (!isOwner && !isReviewer) {
      throw new HttpsError('permission-denied', 'You do not have access to this application.');
    }

    if (isOwner && !isReviewer) {
      const status = appData['status'] as ApplicationStatus;
      if (!SUBMITTER_EDITABLE_STATUSES.includes(status)) {
        throw new HttpsError(
          'failed-precondition',
          `Applications with status "${status}" cannot be edited.`,
        );
      }
    }

    // Collect changed fields only.
    const updates: Record<string, unknown> = {};
    const changedFields: Array<{ name: string; oldValue: unknown; newValue: unknown }> = [];

    for (const [key, newValue] of Object.entries(fields)) {
      const oldValue = appData[key];
      // Simple equality check — good enough for primitives.
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        updates[key] = newValue;
        changedFields.push({ name: key, oldValue, newValue });
      }
    }

    if (changedFields.length === 0) {
      return { success: true, fieldsChanged: 0 };
    }

    updates['lastEditedAt'] = FieldValue.serverTimestamp();

    const batch = db.batch();

    // 1. Update the application document.
    batch.update(appRef, updates);

    // 2. Create one changelog entry per changed field.
    const changelogCol = appRef.collection('changelog');
    for (const { name, oldValue, newValue } of changedFields) {
      const logRef = changelogCol.doc();
      batch.set(logRef, {
        fieldName: name,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
        changedBy: uid,
        changedByEmail: email,
        changedAt: FieldValue.serverTimestamp(),
        reason: 'submitter_edit',
      });
    }

    await batch.commit();

    return { success: true, fieldsChanged: changedFields.length };
  },
);
