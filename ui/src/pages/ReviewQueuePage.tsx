import { useEffect, useState } from "react"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/firebase"
import { cn } from "@/lib/utils"
import { type FirestoreApplication } from "@/components/ApplicationCard"
import { ReviewQueueCard } from "@/components/ReviewQueueCard"

// ─── Filter chip config ───────────────────────────────────────────────────────

type FilterKey =
  | "all"
  | "unassigned"
  | "submitted"
  | "under_review"
  | "clarification_received"
  | "approved"
  | "rejected"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unassigned", label: "Unassigned" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "clarification_received", label: "Clarification Received" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex w-full animate-pulse items-center gap-4 rounded-lg border bg-card px-4 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-5 w-24 rounded-full bg-muted" />
        </div>
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
      <div className="h-4 w-4 rounded bg-muted" />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  const [applications, setApplications] = useState<FirestoreApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")

  // Real-time listener — all non-draft applications ordered by submittedAt desc
  useEffect(() => {
    const q = query(
      collection(db, "applications"),
      where("status", "!=", "draft"),
      orderBy("status"),          // required by Firestore when using != with orderBy
      orderBy("submittedAt", "desc")
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<FirestoreApplication, "id">),
        }))
        setApplications(docs)
        setLoading(false)
      },
      () => {
        setLoading(false)
      }
    )

    return unsubscribe
  }, [])

  // Filter the list client-side
  const filtered = applications.filter((app) => {
    if (activeFilter === "all") return true
    if (activeFilter === "unassigned")
      return app.assignedReviewerUid == null || app.assignedReviewerUid === ""
    return app.status === activeFilter
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          All pending adoption applications
        </p>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur-sm">
        <div className="flex gap-2 min-w-max">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeFilter === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mx-auto w-full max-w-[720px] space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl">
            📋
          </div>
          <h2 className="mb-1 text-lg font-semibold">No applications</h2>
          <p className="text-sm text-muted-foreground">
            {activeFilter === "all"
              ? "No submitted applications yet."
              : `No applications matching "${FILTERS.find((f) => f.key === activeFilter)?.label}".`}
          </p>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[720px] space-y-3">
          {filtered.map((app) => (
            <ReviewQueueCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  )
}
