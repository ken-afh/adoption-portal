import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { httpsCallable } from "firebase/functions"
import { ChevronRight, Trash2 } from "lucide-react"
import { functions } from "@/firebase"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import {
  APPLICATION_STATUS,
  type ApplicationStatus,
} from "@/lib/applicationStatus"

// ─── Firestore application shape (plan data model) ────────────────────────────

export type { ApplicationStatus }

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

// ─── Status badge config ──────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  [APPLICATION_STATUS.DRAFT]: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700",
  },
  [APPLICATION_STATUS.SUBMITTED]: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700",
  },
  [APPLICATION_STATUS.UNDER_REVIEW]: {
    label: "Under Review",
    className: "bg-yellow-100 text-yellow-700",
  },
  [APPLICATION_STATUS.CLARIFICATION_REQUESTED]: {
    label: "Clarification Requested",
    className: "bg-orange-100 text-orange-700",
  },
  [APPLICATION_STATUS.CLARIFICATION_RECEIVED]: {
    label: "Clarification Received",
    className: "bg-teal-100 text-teal-700",
  },
  [APPLICATION_STATUS.APPROVED]: {
    label: "Approved",
    className: "bg-green-100 text-green-700",
  },
  [APPLICATION_STATUS.REJECTED]: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
  },
}

// Statuses where the submitter may delete their own application
const DELETABLE_STATUSES: ApplicationStatus[] = [
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.REJECTED,
]

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
  /** Called after a successful delete so the parent can remove the card. */
  onDeleted?: (id: string) => void
}

export function ApplicationCard({ application, onDeleted }: ApplicationCardProps) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const config = STATUS_CONFIG[application.status] ?? STATUS_CONFIG["Draft"]
  const displayName = application.applicantName?.trim() || "Draft"
  const canDelete = DELETABLE_STATUSES.includes(application.status)

  async function handleDelete(e: React.MouseEvent) {
    // Stop the click from bubbling to the nav area
    e.stopPropagation()
    if (!window.confirm("Delete this application? This cannot be undone.")) return
    setDeleting(true)
    try {
      await httpsCallable(functions, "deleteApplication")({ applicationId: application.id })
      toast({ title: "Application deleted" })
      onDeleted?.(application.id)
    } catch {
      toast({ title: "Could not delete application", variant: "destructive" })
      setDeleting(false)
    }
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-lg border bg-card text-left">
      {/* Nav area — takes up all space except the delete button */}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/50 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
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

      {/* Inline delete — only shown for deletable statuses */}
      {canDelete && (
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          aria-label="Delete application"
          className="mr-2 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
