/**
 * Shared TypeScript types for the adoption portal.
 * Used by both Cloud Functions and (via a path alias or copy) the React UI.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ─── Status enum ──────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Clarification Requested'
  | 'Clarification Received'
  | 'Approved'
  | 'Rejected';

// ─── User role ────────────────────────────────────────────────────────────────

export type UserRole = 'submitter' | 'reviewer' | 'admin';

// ─── Application document (Firestore: /applications/{id}) ────────────────────

export interface Application {
  id: string;

  // Identity
  submitterId: string;
  submitterEmail: string;

  // Workflow
  status: ApplicationStatus;
  submittedAt: Timestamp | null;
  lastEditedAt: Timestamp;
  resubmitCount: number;
  assignedReviewerUid: string | null;
  assignedReviewerEmail: string | null;
  decisionAt: Timestamp | null;
  decisionBy: string | null;
  decisionReason: string | null;

  // Section 1 — Personal information
  applicantName: string;
  coApplicantName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;

  // Section 2 — Housing
  homeType: 'house' | 'condo' | 'apartment' | 'other';
  homeOwnership: 'own' | 'rent';
  landlordContact: string;
  hasYard: boolean;
  yardFenced: boolean;
  fenceHeight: string;

  // Section 3 — Household
  adultsInHome: number;
  childrenInHome: number;
  childrenAges: string;

  // Section 4 — Existing pets
  currentPets: string;
  previousPets: string;

  // Section 5 — Veterinary
  vetName: string;
  vetClinic: string;
  vetPhone: string;

  // Section 6 — Lifestyle
  hoursAlonePerDay: number;
  dogSleepLocation: string;
  dogDayLocation: string;
  exercisePlan: string;
  dogExperience: string;

  // Section 7 — Adoption
  adoptionReason: string;
  specificDogRequested: string;

  // Section 8 — Agreement
  agreeToHomeVisit: boolean;
  signatureAcknowledgment: boolean;
  signatureDate: Timestamp | null;
}

// ─── Comment document (Firestore: /applications/{id}/comments/{id}) ──────────

export type CommentType =
  | 'internal_note'
  | 'clarification_request'
  | 'submitter_reply';

export interface Comment {
  id: string;
  type: CommentType;
  text: string;
  authorUid: string;
  authorName: string;
  authorRole: 'reviewer' | 'admin' | 'submitter';
  createdAt: Timestamp;
  isResolved: boolean;
}

// ─── Changelog entry (Firestore: /applications/{id}/changelog/{id}) ──────────

export type ChangeLogReason =
  | 'submitter_edit'
  | 'resubmission'
  | 'reviewer_status_change';

export interface ChangeLogEntry {
  id: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;       // UID
  changedByEmail: string;
  changedAt: Timestamp;
  reason: ChangeLogReason;
}

// ─── Role document (Firestore: /roles/{uid}) ─────────────────────────────────

export interface RoleDoc {
  uid: string;
  role: UserRole;
  email: string;
}
