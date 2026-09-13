/**
 * Frontend TypeScript types mirroring the Firestore data model.
 */

// ─── Roles ────────────────────────────────────────────────────────────────────

export type UserRole = "submitter" | "reviewer" | "admin"

// ─── Application Status ───────────────────────────────────────────────────────

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "withdrawn"

// ─── Application ──────────────────────────────────────────────────────────────

export interface Application {
  id: string
  submitterId: string
  submitterEmail: string
  submitterName: string
  status: ApplicationStatus
  // Dog info
  dogName: string
  dogBreed: string
  dogAge: number
  // Applicant info
  address: string
  phone: string
  hasYard: boolean
  hasPets: boolean
  petDetails: string
  experience: string
  reason: string
  // Metadata
  assignedReviewerId: string | null
  createdAt: Date | null
  updatedAt: Date | null
  submittedAt: Date | null
  reviewedAt: Date | null
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  applicationId: string
  authorId: string
  authorEmail: string
  authorRole: UserRole
  body: string
  createdAt: Date | null
  // Whether visible to the submitter
  internal: boolean
}

// ─── Changelog entry ─────────────────────────────────────────────────────────

export interface ChangeLogEntry {
  id: string
  applicationId: string
  actorId: string
  actorEmail: string
  action: string
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus | null
  note: string
  createdAt: Date | null
}
