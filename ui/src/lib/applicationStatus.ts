/**
 * Canonical application status values — single source of truth for the UI.
 *
 * These values must match the ApplicationStatus type in functions/src/types.ts.
 * Using a const object means TypeScript will catch any callsite that references
 * a value that no longer exists whenever this file is updated.
 */

export const APPLICATION_STATUS = {
  DRAFT:                   "Draft",
  SUBMITTED:               "Submitted",
  UNDER_REVIEW:            "Under Review",
  CLARIFICATION_REQUESTED: "Clarification Requested",
  CLARIFICATION_RECEIVED:  "Clarification Received",
  APPROVED:                "Approved",
  REJECTED:                "Rejected",
} as const

export type ApplicationStatus =
  (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS]
