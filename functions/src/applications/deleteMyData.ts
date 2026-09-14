/**
 * deleteMyData — HTTPS callable that immediately deletes the calling user's
 * data (GDPR / CCPA right to erasure).
 *
 * Steps:
 *   1. Delete all of the user's applications and their subcollections.
 *   2. Delete the user's /roles/{uid} document.
 *   3. Delete the Firebase Auth account.
 *   4. Send a notification email to every admin-role user and to NOTIFY_EMAIL.
 *
 * The function must complete before signing the user out on the client, so it
 * is synchronous (no background queue).
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { SMTP_PASSWORD, APP_BASE_URL, getNotifyEmail } from '../config';
import { sendEmail } from '../email/sendEmail';
import { dataErasureNotificationEmail } from '../email/templates';

async function deleteSubcollection(
  db: admin.firestore.Firestore,
  collRef: admin.firestore.CollectionReference,
) {
  const snap = await collRef.get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export const deleteMyData = onCall(
  { region: 'us-east4', secrets: [SMTP_PASSWORD] },
  async (request): Promise<{ success: true }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.auth.uid;
    const email = (request.auth.token['email'] as string) ?? '';
    const displayName = (request.auth.token['name'] as string) ?? email;
    const db = admin.firestore();

    // 1. Delete all applications + subcollections.
    const appsSnap = await db
      .collection('applications')
      .where('submitterId', '==', uid)
      .get();

    for (const appDoc of appsSnap.docs) {
      await deleteSubcollection(db, appDoc.ref.collection('comments'));
      await deleteSubcollection(db, appDoc.ref.collection('changelog'));
      await appDoc.ref.delete();
    }

    // 2. Delete role document.
    await db.collection('roles').doc(uid).delete();

    // 3. Delete /deleteRequests entry if one exists (clean up any old queue entry).
    await db.collection('deleteRequests').doc(uid).delete().catch(() => undefined);

    // 4. Delete the Firebase Auth account.
    try {
      await admin.auth().deleteUser(uid);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/user-not-found') throw err;
    }

    // 5. Notify: collect admin email addresses from /roles collection.
    const adminEmails: string[] = [];
    try {
      const adminSnap = await db
        .collection('roles')
        .where('role', '==', 'admin')
        .get();
      adminSnap.docs.forEach((d) => {
        const e = d.data()['email'] as string | undefined;
        if (e) adminEmails.push(e);
      });
    } catch {
      // Non-fatal — proceed without admin recipients.
    }

    // Deduplicate: include the effective notify email, filter out empty strings.
    const notifyAddress = await getNotifyEmail();
    const recipients = [...new Set([notifyAddress, ...adminEmails])].filter(Boolean);

    try {
      const template = dataErasureNotificationEmail(displayName, email, appsSnap.size, APP_BASE_URL.value());
      await sendEmail({ to: recipients.join(', '), subject: template.subject, html: template.html });
    } catch {
      // Non-fatal — the data is already deleted; a failed email must not
      // cause the function to throw (which would confuse the client).
    }

    return { success: true };
  },
);
