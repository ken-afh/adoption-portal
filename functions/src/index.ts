/**
 * Cloud Functions entry point.
 *
 * All function implementations live in sub-modules.
 * This file initialises the Admin SDK and re-exports every Cloud Function so
 * the Firebase Functions runtime can discover them by name.
 */

import * as admin from 'firebase-admin';

// Initialize the admin SDK once at module load.
admin.initializeApp();

// ─── Auth triggers ────────────────────────────────────────────────────────────

export { onUserCreated } from './auth/onUserCreated';
export { onRoleDocWritten } from './auth/onRoleDocWritten';

// ─── Auth callable functions ──────────────────────────────────────────────────

export { validateMx } from './auth/validateMx';

// ─── Application lifecycle callable functions ─────────────────────────────────

export { createApplication } from './applications/createApplication';
export { saveApplication } from './applications/saveApplication';
export { submitApplication } from './applications/submitApplication';
export { deleteApplication } from './applications/deleteApplication';
export { adminDeleteApplication } from './applications/adminDeleteApplication';
export { deleteMyData } from './applications/deleteMyData';
export { processDeleteRequest } from './applications/processDeleteRequest';
export { startReview } from './applications/startReview';
export { requestClarification } from './applications/requestClarification';
export { decideApplication } from './applications/decideApplication';
export { assignReviewer } from './applications/assignReviewer';

// ─── Admin callable functions ─────────────────────────────────────────────────

export { setUserRole } from './admin/setUserRole';
export { listReviewers } from './admin/listReviewers';

// ─── Firestore triggers (future) ─────────────────────────────────────────────

// onCommentCreated is reserved for Sub-Task 7 (email notifications on comments).
// Keeping a no-op export here avoids breaking the deployment config.
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

export const onCommentCreated = onDocumentCreated(
  {
    document: 'applications/{applicationId}/comments/{commentId}',
    region: 'us-east4',
  },
  async (_event) => {
    // TODO (Sub-Task 7): send email notifications for new comments.
  },
);
