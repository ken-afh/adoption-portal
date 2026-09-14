import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_CONFIG, type FirestoreApplication } from "@/components/ApplicationCard"
import { APPLICATION_STATUS } from "@/lib/applicationStatus"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return "—"
  return ts.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ReviewQueueCardProps {
  application: FirestoreApplication
}

export function ReviewQueueCard({ application }: ReviewQueueCardProps) {
  const navigate = useNavigate()
  const config = STATUS_CONFIG[application.status] ?? STATUS_CONFIG[APPLICATION_STATUS.SUBMITTED]
  const displayName = application.applicantName?.trim() || "—"

  const resubmitCount = (application as unknown as Record<string, unknown>)
    .resubmitCount as number | undefined

  return (
    <button
      type="button"
      className="flex w-full items-center gap-4 rounded-lg border bg-card px-4 py-4 text-left transition-colors hover:bg-accent/50 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => navigate(`/review/${application.id}`)}
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
          {/* Resubmit count badge */}
          {resubmitCount != null && resubmitCount > 0 && (
            <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
              Resubmit ×{resubmitCount}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span>Submitted {formatDate(application.submittedAt)}</span>
          {application.assignedReviewerEmail ? (
            <span>{application.assignedReviewerEmail}</span>
          ) : (
            <span className="italic">Unassigned</span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
