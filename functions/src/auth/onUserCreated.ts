/**
 * onUserCreated — auth trigger that fires when a new Firebase Auth user is created.
 *
 * Responsibilities:
 * - For Google sign-ins, reject accounts from outside ORG_DOMAIN by deleting them.
 * - Set custom claim { role: "submitter" } on every accepted new user.
 * - Write an initial /roles/{uid} document.
 */

import * as admin from 'firebase-admin';
import { auth } from 'firebase-functions/v1';
import { ORG_DOMAIN } from '../config';
import { ROLE } from '../constants';

export const onUserCreated = auth.user().onCreate(async (user) => {
  const { uid, email, providerData } = user;

  // Determine whether this is a Google sign-in.
  const isGoogle = providerData.some((p) => p.providerId === 'google.com');

  if (isGoogle) {
    const domain = email ? email.split('@')[1] : '';
    const orgDomain = ORG_DOMAIN.value();

    if (domain !== orgDomain) {
      // Reject: delete the account and bail out.
      await admin.auth().deleteUser(uid);
      return;
    }
  }

  // Assign default submitter role via custom claim.
  await admin.auth().setCustomUserClaims(uid, { role: ROLE.SUBMITTER });

  // Persist role document in Firestore.
  await admin.firestore().collection('roles').doc(uid).set({
    uid,
    role: ROLE.SUBMITTER,
    email: email ?? '',
  });
});
