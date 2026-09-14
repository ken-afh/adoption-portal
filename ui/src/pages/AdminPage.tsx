import { useEffect, useRef, useState } from "react"
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { db, functions } from "@/firebase"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { STATUS_CONFIG, type FirestoreApplication } from "@/components/ApplicationCard"
import { APPLICATION_STATUS } from "@/lib/applicationStatus"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reviewer {
  uid: string
  email: string
  role: string
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-lg border bg-card px-4 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-5 w-24 rounded-full bg-muted" />
        </div>
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
      <div className="h-8 w-24 rounded bg-muted" />
    </div>
  )
}

// ─── Assign popover ───────────────────────────────────────────────────────────

interface AssignPopoverProps {
  applicationId: string
  reviewers: Reviewer[]
  reviewersLoading: boolean
  onAssigned: () => void
}

function AssignPopover({
  applicationId,
  reviewers,
  reviewersLoading,
  onAssigned,
}: AssignPopoverProps) {
  const [open, setOpen] = useState(false)
  const [selectedUid, setSelectedUid] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function handleAssign() {
    if (!selectedUid) {
      setError("Please select a reviewer.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const reviewer = reviewers.find((r) => r.uid === selectedUid)
      const assignReviewer = httpsCallable<
        { applicationId: string; reviewerUid: string; reviewerEmail: string },
        { success: boolean }
      >(functions, "assignReviewer")
      await assignReviewer({
        applicationId,
        reviewerUid: selectedUid,
        reviewerEmail: reviewer?.email ?? "",
      })
      toast({
        title: "Reviewer assigned",
        description: `Assigned to ${reviewer?.email ?? selectedUid}.`,
      })
      setOpen(false)
      setSelectedUid("")
      onAssigned()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign reviewer."
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Assign
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border bg-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Select reviewer
          </p>

          {reviewersLoading ? (
            <div className="h-8 animate-pulse rounded bg-muted" />
          ) : reviewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviewers found.</p>
          ) : (
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
            >
              <option value="">— choose —</option>
              {reviewers.map((r) => (
                <option key={r.uid} value={r.uid}>
                  {r.email}{r.role === "admin" ? " (admin)" : ""}
                </option>
              ))}
            </select>
          )}

          {error && (
            <p className="mt-1.5 text-xs text-destructive">{error}</p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || reviewersLoading}
              onClick={handleAssign}
              className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Assign"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section 1 — Manage User Roles ───────────────────────────────────────────

function ManageRolesSection() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"reviewer" | "admin" | "submitter">("reviewer")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { toast } = useToast()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required.")
      return
    }
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const setUserRole = httpsCallable<
        { email: string; role: string },
        { success: boolean; uid: string }
      >(functions, "setUserRole")
      await setUserRole({ email: email.trim(), role })
      const msg = `Role updated for ${email.trim()}`
      setSuccess(msg)
      toast({ title: msg })
      setEmail("")
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err)
      // Surface a friendly message for the most common error
      if (raw.includes("not-found") || raw.includes("No user found")) {
        setError(
          "User not found. They must sign in at least once before you can assign a role."
        )
      } else {
        setError(raw)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold">Manage User Roles</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Grant reviewer or admin access to staff members by their email address.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Email */}
          <div>
            <label
              htmlFor="role-email"
              className="mb-1.5 block text-sm font-medium"
            >
              Email
            </label>
            <input
              id="role-email"
              type="email"
              autoComplete="off"
              placeholder="staff@aforeverhome.net"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
                setSuccess("")
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Role */}
          <div>
            <label
              htmlFor="role-select"
              className="mb-1.5 block text-sm font-medium"
            >
              Role
            </label>
            <select
              id="role-select"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "reviewer" | "admin" | "submitter")
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="reviewer">Reviewer</option>
              <option value="admin">Admin</option>
              <option value="submitter">Submitter</option>
            </select>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        Staff members must sign in with their @aforeverhome.net Google account before a
        role can be assigned.
      </p>
    </section>
  )
}

// ─── Section 2 — Unassigned Applications ─────────────────────────────────────

const UNASSIGNED_STATUSES = [
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.CLARIFICATION_REQUESTED,
  APPLICATION_STATUS.CLARIFICATION_RECEIVED,
] as const

function formatDate(ts: { toDate: () => Date } | null): string {
  if (!ts) return "—"
  return ts.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function UnassignedSection() {
  const [applications, setApplications] = useState<FirestoreApplication[]>([])
  const [appsLoading, setAppsLoading] = useState(true)

  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [reviewersLoading, setReviewersLoading] = useState(true)

  // Fetch reviewers once on mount
  useEffect(() => {
    async function fetchReviewers() {
      try {
        const fn = httpsCallable<Record<string, never>, { reviewers: Reviewer[] }>(
          functions,
          "listReviewers"
        )
        const result = await fn({})
        setReviewers(result.data.reviewers)
      } catch {
        // Non-fatal — the assign popover will show "No reviewers found"
      } finally {
        setReviewersLoading(false)
      }
    }
    fetchReviewers()
  }, [])

  // Real-time listener for unassigned applications
  useEffect(() => {
    const q = query(
      collection(db, "applications"),
      where("assignedReviewerUid", "==", null),
      where("status", "in", [...UNASSIGNED_STATUSES])
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<FirestoreApplication, "id">),
        }))
        setApplications(docs)
        setAppsLoading(false)
      },
      () => {
        setAppsLoading(false)
      }
    )

    return unsubscribe
  }, [])

  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold">Unassigned Applications</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Applications that have been submitted but have no assigned reviewer.
      </p>

      {appsLoading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : applications.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
          <span>✓</span>
          <span>All applications are assigned.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const config =
              STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG] ??
              STATUS_CONFIG[APPLICATION_STATUS.DRAFT]
            return (
              <div
                key={app.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border bg-background px-4 py-3"
              >
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">
                      {app.applicantName?.trim() || "—"}
                    </span>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                        config.className
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Submitted {formatDate(app.submittedAt)}
                  </p>
                </div>

                {/* Assign button */}
                <AssignPopover
                  applicationId={app.id}
                  reviewers={reviewers}
                  reviewersLoading={reviewersLoading}
                  onAssigned={() => {
                    /* onSnapshot will update the list automatically */
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ─── Section 3 — Delete Data Requests (GDPR) ─────────────────────────────────

interface DeleteRequest {
  uid: string
  email: string
  requestedAt: { toDate: () => Date } | null
  status: "pending" | "processed"
}

function DeleteRequestsSection() {
  const [requests, setRequests] = useState<DeleteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingUid, setProcessingUid] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const q = query(
      collection(db, "deleteRequests"),
      where("status", "==", "pending"),
      orderBy("requestedAt", "asc")
    )
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<DeleteRequest, "uid">) }))
        )
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsubscribe
  }, [])

  async function handleProcess(uid: string, email: string) {
    if (
      !window.confirm(
        `Permanently delete all data for ${email}?\n\nThis will remove all their applications, comments, and their account. This cannot be undone.`
      )
    )
      return

    setProcessingUid(uid)
    try {
      const fn = httpsCallable<{ requestUid: string }, { success: boolean }>(
        functions,
        "processDeleteRequest"
      )
      await fn({ requestUid: uid })
      toast({ title: "Data deleted", description: `${email}'s data has been permanently deleted.` })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process request."
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setProcessingUid(null)
    }
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold">Delete Data Requests</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Pending GDPR / CCPA right-to-erasure requests from users. Processing a request
        permanently deletes the user&rsquo;s account and all their data.
      </p>

      {loading ? (
        <div className="space-y-3">
          <SkeletonRow />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
          <span>✓</span>
          <span>No pending deletion requests.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.uid}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-background px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{req.email}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Requested{" "}
                  {req.requestedAt
                    ? req.requestedAt.toDate().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <button
                type="button"
                disabled={processingUid === req.uid}
                onClick={() => handleProcess(req.uid, req.email)}
                className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {processingUid === req.uid ? "Deleting…" : "Process & Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Section 4 — Bootstrap instructions ──────────────────────────────────────

function BootstrapSection() {
  return (
    <details className="rounded-xl border bg-card">
      <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold">
        First-time setup instructions
      </summary>
      <div className="border-t px-6 pb-6 pt-4">
        <p className="mb-3 text-sm text-muted-foreground">
          To create the first admin user:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Have the staff member sign in with their Google Workspace account at the app
            URL.
          </li>
          <li>
            In <strong>Firebase Console → Firestore → roles collection</strong>, create a
            document with <strong>ID = their Firebase UID</strong>, containing:
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
              {`{\n  uid: "...",\n  role: "admin",\n  email: "staff@aforeverhome.net"\n}`}
            </pre>
          </li>
          <li>
            They must <strong>sign out and sign back in</strong> for the role to take
            effect.
          </li>
        </ol>
      </div>
    </details>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">
          Manage user roles and reviewer assignments.
        </p>
      </div>

      <ManageRolesSection />
      <UnassignedSection />
      <DeleteRequestsSection />
      <BootstrapSection />
    </div>
  )
}
