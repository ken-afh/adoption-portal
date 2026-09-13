/**
 * createApplication — HTTPS callable that creates a new draft application
 * in Firestore with all fields initialized to empty/default values.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { requireRole } from '../utils/requireRole';

export const createApplication = onCall(
  { region: 'us-central1' },
  async (request): Promise<{ id: string }> => {
    requireRole(request, 'submitter');

    const uid = request.auth!.uid;
    const email = (request.auth!.token['email'] as string) ?? '';

    const newDoc = {
      // Identity
      submitterId: uid,
      submitterEmail: email,

      // Workflow
      status: 'Draft',
      submittedAt: null,
      lastEditedAt: FieldValue.serverTimestamp(),
      resubmitCount: 0,
      assignedReviewerUid: null,
      assignedReviewerEmail: null,
      decisionAt: null,
      decisionBy: null,
      decisionReason: null,

      // Section 1 — Personal information
      applicantName: '',
      coApplicantName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',

      // Section 2 — Housing
      homeType: '',
      homeOwnership: '',
      landlordContact: '',
      hasYard: false,
      yardFenced: false,
      fenceHeight: '',

      // Section 3 — Household
      adultsInHome: 0,
      childrenInHome: 0,
      childrenAges: '',

      // Section 4 — Existing pets
      currentPets: '',
      previousPets: '',

      // Section 5 — Veterinary
      vetName: '',
      vetClinic: '',
      vetPhone: '',

      // Section 6 — Lifestyle
      hoursAlonePerDay: 0,
      dogSleepLocation: '',
      dogDayLocation: '',
      exercisePlan: '',
      dogExperience: '',

      // Section 7 — Adoption
      adoptionReason: '',
      specificDogRequested: '',

      // Section 8 — Agreement
      agreeToHomeVisit: false,
      signatureAcknowledgment: false,
      signatureDate: null,
    };

    const ref = await admin.firestore().collection('applications').add(newDoc);
    return { id: ref.id };
  },
);
