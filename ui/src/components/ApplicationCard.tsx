import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Firestore application shape (plan data model) ────────────────────────────

export interface FirestoreApplication {
  id: string
  submitterId: string
  submitterEmail: string
  status: ApplicationStatus
  applicantName: string
  lastEditedAt: { toDate: () => Date } | null
  submittedAt: { toDate: () => Date } | null
  assignedReviewerUid: string | null
  assignedReviewerEmail: string | null
  decisionReason: string | null
}

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "clarification_requested"
  | "clarification_received"
  | "approved"
  | "rejected"

// ─── Status badge config ──────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700",
  },
  under_review: {
    label: "Under Review",
    className: "bg-yellow-100 text-yellow-700",
  },
  clarification_requested: {
    label: "Clarification Requested",
    className: "bg-orange-100 text-orange-700",
  },
  clarification_received: {
    label: "Clarification Received",
    className: "bg-teal-100 text-teal-700",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: { toDate: () => Date } | null): string {
  if (!ts) return "—"
  return ts.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ApplicationCardProps {
  application: FirestoreApplication
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const navigate = useNavigate()
  const config = STATUS_CONFIG[application.status] ?? STATUS_CONFIG.draft
  const displayName = application.applicantName?.trim() || "Draft"

  return (
    <button
      type="button"
      className="flex w-full items-center gap-4 rounded-lg border bg-card px-4 py-4 text-left transition-colors hover:bg-accent/50 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => navigate(`/application/${application.id}`)}
    >
      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{displayName}</span>
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              config.className
            )}
          >
            {config.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Last edited {formatDate(application.lastEditedAt)}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
