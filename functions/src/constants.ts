/**
 * Canonical constant values for the adoption portal.
 *
 * All Cloud Function files must import status strings and role strings from
 * here rather than inlining literals. This ensures a single source of truth:
 * changing a value here is the only change needed — TypeScript catches every
 * callsite that no longer compiles.
 */

import type { ApplicationStatus, UserRole } from './types';

// ─── Application statuses ─────────────────────────────────────────────────────

export const STATUS = {
  DRAFT:                   'Draft',
  SUBMITTED:               'Submitted',
  UNDER_REVIEW:            'Under Review',
  CLARIFICATION_REQUESTED: 'Clarification Requested',
  CLARIFICATION_RECEIVED:  'Clarification Received',
  APPROVED:                'Approved',
  REJECTED:                'Rejected',
} as const satisfies Record<string, ApplicationStatus>;

// ─── User roles ───────────────────────────────────────────────────────────────

export const ROLE = {
  SUBMITTER: 'submitter',
  REVIEWER:  'reviewer',
  ADMIN:     'admin',
} as const satisfies Record<string, UserRole>;
