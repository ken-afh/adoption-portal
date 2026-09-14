import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { db, functions } from "@/firebase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { FullPageSpinner } from "@/components/ui/spinner"
import { STATUS_CONFIG, type FirestoreApplication } from "@/components/ApplicationCard"
import { cn } from "@/lib/utils"
import type { ApplicationFields } from "@/hooks/useApplication"
import { APPLICATION_STATUS } from "@/lib/applicationStatus"

// ─── Comment type (matches Firestore schema) ──────────────────────────────────

interface AppComment {
  id: string
  type: "internal_note" | "clarification_request" | "submitter_reply"
  text: string
  authorUid: string
  authorName: string
  authorRole: "reviewer" | "submitter"
  createdAt: Timestamp | null
  isResolved: boolean
}

// ─── Changelog entry type ─────────────────────────────────────────────────────

interface ChangeLogEntry {
  id: string
  fieldName: string
  oldValue: unknown
  newValue: unknown
  changedAt: Timestamp | null
  reason: string | null
  resubmitCount: number
}

// ─── Field label map ──────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  applicantName: "Applicant Name",
  coApplicantName: "Co-Applicant Name",
  address: "Address",
  city: "City",
  state: "State",
  zip: "ZIP",
  phone: "Phone",
  homeType: "Home Type",
  homeOwnership: "Own or Rent",
  landlordContact: "Landlord Contact",
  hasYard: "Has Yard",
  yardFenced: "Yard Fenced",
  fenceHeight: "Fence Height",
  adultsInHome: "Adults in Home",
  childrenInHome: "Children in Home",
  childrenAges: "Children's Ages",
  currentPets: "Current Pets",
  previousPets: "Previous Pets",
  vetName: "Veterinarian Name",
  vetClinic: "Vet Clinic",
  vetPhone: "Vet Phone",
  hoursAlonePerDay: "Hours Alone Per Day",
  dogSleepLocation: "Dog Sleep Location",
  dogDayLocation: "Dog Day Location",
  exercisePlan: "Exercise Plan",
  dogExperience: "Dog Experience",
  adoptionReason: "Reason for Adopting",
  specificDogRequested: "Specific Dog Requested",
  agreeToHomeVisit: "Agreed to Home Visit",
  signatureAcknowledgment: "Signature Acknowledged",
  status: "Status",
}

// ─── Section definitions (8 sections matching the applicant form) ─────────────

interface AnswerSection {
  title: string
  fields: { key: keyof ApplicationFields; label: string; boolean?: boolean }[]
}

const ANSWER_SECTIONS: AnswerSection[] = [
  {
    title: "Applicant Information",
    fields: [
      { key: "applicantName", label: "Full Name" },
      { key: "coApplicantName", label: "Co-Applicant Name" },
      { key: "address", label: "Street Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip", label: "ZIP" },
      { key: "phone", label: "Phone" },
    ],
  },
  {
    title: "Home & Living Situation",
    fields: [
      { key: "homeType", label: "Home Type" },
      { key: "homeOwnership", label: "Own or Rent" },
      { key: "landlordContact", label: "Landlord Contact" },
      { key: "hasYard", label: "Has Yard", boolean: true },
      { key: "yardFenced", label: "Yard Fenced", boolean: true },
      { key: "fenceHeight", label: "Fence Height" },
    ],
  },
  {
    title: "Household",
    fields: [
      { key: "adultsInHome", label: "Adults in Home" },
      { key: "childrenInHome", label: "Children in Home" },
      { key: "childrenAges", label: "Children's Ages" },
    ],
  },
  {
    title: "Pets",
    fields: [
      { key: "currentPets", label: "Current Pets" },
      { key: "previousPets", label: "Previous Pets" },
    ],
  },
  {
    title: "Veterinarian",
    fields: [
      { key: "vetName", label: "Veterinarian Name" },
      { key: "vetClinic", label: "Vet Clinic" },
      { key: "vetPhone", label: "Vet Phone" },
    ],
  },
  {
    title: "Dog Care Plan",
    fields: [
      { key: "hoursAlonePerDay", label: "Hours Alone Per Day" },
      { key: "dogSleepLocation", label: "Dog Sleep Location" },
      { key: "dogDayLocation", label: "Dog Day Location" },
      { key: "exercisePlan", label: "Exercise Plan" },
    ],
  },
  {
    title: "About You",
    fields: [
      { key: "dogExperience", label: "Dog Experience" },
      { key: "adoptionReason", label: "Reason for Adopting" },
      { key: "specificDogRequested", label: "Specific Dog Requested" },
      { key: "specificDogName", label: "Specific Dog Name" },
    ],
  },
  {
    title: "Agreement",
    fields: [
      { key: "agreeToHomeVisit", label: "Agreed to Home Visit", boolean: true },
      { key: "signatureAcknowledgment", label: "Signature Acknowledged", boolean: true },
      { key: "signatureName", label: "Signature Name" },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(ts: Timestamp | null | undefined): string {
  if (!ts) return "—"
  return ts.toDate().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function displayValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—"
  if (typeof val === "boolean") return val ? "Yes" : "No"
  return String(val)
}

// ─── Answers tab ─────────────────────────────────────────────────────────────

function AnswersTab({ application }: { application: FirestoreApplication }) {
  const data = application as unknown as ApplicationFields & Record<string, unknown>

  return (
    <div className="space-y-6">
      {ANSWER_SECTIONS.map((section) => (
        <div key={section.title} className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 font-semibold text-base">{section.title}</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {section.fields.map(({ key, label }) => {
              const raw = data[key as string]
              const val = displayValue(raw)
              const isEmpty = val === "—"
              return (
                <div key={key} className="space-y-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                  <dd
                    className={cn(
                      "text-sm",
                      isEmpty && "text-muted-foreground italic"
                    )}
                  >
                    {val}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      ))}
    </div>
  )
}

// ─── Comments tab ─────────────────────────────────────────────────────────────

function CommentsTab({
  applicationId,
  comments,
  onRequestClarification,
}: {
  applicationId: string
  comments: AppComment[]
  onRequestClarification: () => void
}) {
  const { user } = useAuth()
  const [noteText, setNoteText] = useState("")
  const [noteOpen, setNoteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleAddNote() {
    if (!noteText.trim() || !user) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, "applications", applicationId, "comments"), {
        type: "internal_note",
        text: noteText.trim(),
        authorUid: user.uid,
        authorName: user.displayName ?? user.email ?? "Reviewer",
        authorRole: "reviewer",
        createdAt: serverTimestamp(),
        isResolved: false,
      })
      setNoteText("")
      setNoteOpen(false)
      toast({ title: "Note added" })
    } catch {
      toast({ title: "Failed to add note", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const COMMENT_STYLES = {
    internal_note: {
      wrapper: "border-blue-200 bg-blue-50",
      badge: "bg-blue-100 text-blue-700",
      label: "Internal Note",
    },
    clarification_request: {
      wrapper: "border-orange-200 bg-orange-50",
      badge: "bg-orange-100 text-orange-700",
      label: "Clarification Request",
    },
    submitter_reply: {
      wrapper: "border-green-200 bg-green-50",
      badge: "bg-green-100 text-green-700",
      label: "Submitter Reply",
    },
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setNoteOpen((o) => !o)}
        >
          Add Internal Note
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRequestClarification}
        >
          Request Clarification
        </Button>
      </div>

      {/* Inline note composer */}
      {noteOpen && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">New Internal Note</p>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={3}
            placeholder="Write an internal note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setNoteOpen(false); setNoteText("") }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!noteText.trim() || submitting}
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add Note"}
            </Button>
          </div>
        </div>
      )}

      {/* Comment thread */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No comments yet.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const style = COMMENT_STYLES[c.type] ?? COMMENT_STYLES.internal_note
            return (
              <div
                key={c.id}
                className={cn("rounded-lg border p-4", style.wrapper)}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      style.badge
                    )}
                  >
                    {style.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.authorName || c.authorRole}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.text}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Change Log tab ───────────────────────────────────────────────────────────

function ChangeLogTab({ changelog }: { changelog: ChangeLogEntry[] }) {
  if (changelog.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No changes recorded yet.
      </p>
    )
  }

  // Group by resubmitCount
  const groups = new Map<number, ChangeLogEntry[]>()
  for (const entry of changelog) {
    const count = entry.resubmitCount ?? 0
    if (!groups.has(count)) groups.set(count, [])
    groups.get(count)!.push(entry)
  }

  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => b - a)

  return (
    <div className="space-y-6">
      {sortedGroups.map(([resubmitCount, entries]) => (
        <div key={resubmitCount}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {resubmitCount === 0 ? "Initial Submission" : `Resubmission #${resubmitCount}`}
          </h3>
          <div className="space-y-2">
            {entries.map((entry) => {
              const label = FIELD_LABELS[entry.fieldName] ?? entry.fieldName
              return (
                <div
                  key={entry.id}
                  className="rounded-lg border bg-card px-4 py-3 text-sm"
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.changedAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through">
                      {displayValue(entry.oldValue)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">
                      {displayValue(entry.newValue)}
                    </span>
                    {entry.reason && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                        {entry.reason}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Confirm dialog (generic) ─────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  busy,
  confirmLabel = "Confirm",
  destructive = false,
  children,
}: {
  open: boolean
  title: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
  confirmLabel?: string
  destructive?: boolean
  children?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg space-y-4">
        <h2 className="font-semibold text-base">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {children}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Text sheet (shared by clarification request and reject reason) ───────────

function TextSheet({
  open,
  title,
  placeholder,
  onConfirm,
  onCancel,
  busy,
  confirmLabel,
  required = true,
}: {
  open: boolean
  title: string
  placeholder: string
  onConfirm: (text: string) => void
  onCancel: () => void
  busy: boolean
  confirmLabel: string
  required?: boolean
}) {
  const [text, setText] = useState("")

  // Reset when closed
  useEffect(() => {
    if (!open) setText("")
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg space-y-4">
        <h2 className="font-semibold text-base">{title}</h2>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          rows={4}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(text.trim())}
            disabled={busy || (required && !text.trim())}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Action bar ───────────────────────────────────────────────────────────────

type ActionDialog =
  | { type: "clarification" }
  | { type: "approve" }
  | { type: "reject" }
  | { type: "delete" }
  | null

function ActionBar({
  application,
  applicationId,
}: {
  application: FirestoreApplication
  applicationId: string
}) {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<ActionDialog>(null)

  const status = application.status
  const assignedUid = application.assignedReviewerUid

  async function callFn<T>(name: string, payload: T) {
    setBusy(true)
    try {
      await httpsCallable(functions, name)(payload)
    } finally {
      setBusy(false)
    }
  }

  async function handleAssign() {
    if (!user) return
    try {
      await callFn("assignReviewer", {
        applicationId,
        reviewerUid: user.uid,
        reviewerEmail: user.email,
      })
      toast({ title: "Assigned to you" })
    } catch {
      toast({ title: "Failed to assign", variant: "destructive" })
    }
  }

  async function handleStartReview() {
    try {
      await callFn("startReview", { applicationId })
      toast({ title: "Review started" })
    } catch {
      toast({ title: "Failed to start review", variant: "destructive" })
    }
  }

  async function handleClarification(message: string) {
    try {
      await callFn("requestClarification", { applicationId, message })
      setDialog(null)
      toast({ title: "Clarification requested" })
    } catch {
      toast({ title: "Failed to request clarification", variant: "destructive" })
    }
  }

  async function handleApprove() {
    try {
      await callFn("decideApplication", { applicationId, decision: "approved" })
      setDialog(null)
      toast({ title: "Application approved 🎉" })
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" })
    }
  }

  async function handleReject(reason: string) {
    try {
      await callFn("decideApplication", {
        applicationId,
        decision: "rejected",
        reason,
      })
      setDialog(null)
      toast({ title: "Application rejected" })
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" })
    }
  }

  async function handleDelete() {
    try {
      await callFn("adminDeleteApplication", { applicationId })
      setDialog(null)
      toast({ title: "Application deleted" })
      navigate("/review")
    } catch {
      toast({ title: "Failed to delete application", variant: "destructive" })
    }
  }

  const isAdmin = role === "admin"
  const showAssign = !assignedUid || assignedUid !== user?.uid
  const showStart = status === APPLICATION_STATUS.SUBMITTED
  const showClarification = status === APPLICATION_STATUS.UNDER_REVIEW
  const showDecide =
    status === APPLICATION_STATUS.UNDER_REVIEW ||
    status === APPLICATION_STATUS.CLARIFICATION_RECEIVED

  const hasActions = showAssign || showStart || showClarification || showDecide || isAdmin

  if (!hasActions) return null

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <div className="flex flex-wrap gap-2">
          {showAssign && (
            <Button size="sm" variant="outline" onClick={handleAssign} disabled={busy}>
              Assign to Me
            </Button>
          )}
          {showStart && (
            <Button size="sm" onClick={handleStartReview} disabled={busy}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Start Review
            </Button>
          )}
          {showClarification && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialog({ type: "clarification" })}
              disabled={busy}
            >
              Request Clarification
            </Button>
          )}
          {showDecide && (
            <>
              <Button
                size="sm"
                onClick={() => setDialog({ type: "approve" })}
                disabled={busy}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDialog({ type: "reject" })}
                disabled={busy}
              >
                Reject
              </Button>
            </>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDialog({ type: "delete" })}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Desktop: inline bar (rendered by parent header area) */}
      <div className="hidden md:flex flex-wrap gap-2">
          {showAssign && (
            <Button size="sm" variant="outline" onClick={handleAssign} disabled={busy}>
              Assign to Me
            </Button>
          )}
          {showStart && (
            <Button size="sm" onClick={handleStartReview} disabled={busy}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Start Review
            </Button>
          )}
          {showClarification && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialog({ type: "clarification" })}
              disabled={busy}
            >
              Request Clarification
            </Button>
          )}
          {showDecide && (
            <>
              <Button
                size="sm"
                onClick={() => setDialog({ type: "approve" })}
                disabled={busy}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDialog({ type: "reject" })}
                disabled={busy}
              >
                Reject
              </Button>
            </>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDialog({ type: "delete" })}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>

      {/* Clarification sheet */}
      <TextSheet
        open={dialog?.type === "clarification"}
        title="Request Clarification"
        placeholder="Describe what information you need from the applicant…"
        confirmLabel="Send Request"
        busy={busy}
        onConfirm={handleClarification}
        onCancel={() => setDialog(null)}
      />

      {/* Approve confirm */}
      <ConfirmDialog
        open={dialog?.type === "approve"}
        title="Approve Application?"
        description="This will mark the application as approved and notify the applicant."
        confirmLabel="Approve"
        busy={busy}
        onConfirm={handleApprove}
        onCancel={() => setDialog(null)}
      />

      {/* Reject sheet */}
      <TextSheet
        open={dialog?.type === "reject"}
        title="Reject Application"
        placeholder="Provide a reason for rejection (required)…"
        confirmLabel="Reject"
        busy={busy}
        required
        onConfirm={handleReject}
        onCancel={() => setDialog(null)}
      />

      {/* Admin delete confirm */}
      <ConfirmDialog
        open={dialog?.type === "delete"}
        title="Delete Application?"
        description="This will permanently delete the application and all its comments and history. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDialog(null)}
      />
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabKey = "answers" | "comments" | "changelog"

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const applicationId = id ?? ""

  const [application, setApplication] = useState<FirestoreApplication | null>(null)
  const [appLoading, setAppLoading] = useState(true)

  const [comments, setComments] = useState<AppComment[]>([])
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([])

  const [activeTab, setActiveTab] = useState<TabKey>("answers")

  // ── Application snapshot ───────────────────────────────────────────────────
  useEffect(() => {
    if (!applicationId) return
    const unsubscribe = onSnapshot(
      doc(db, "applications", applicationId),
      (snap) => {
        if (snap.exists()) {
          setApplication({ id: snap.id, ...(snap.data() as Omit<FirestoreApplication, "id">) })
        }
        setAppLoading(false)
      },
      () => setAppLoading(false)
    )
    return unsubscribe
  }, [applicationId])

  // ── Comments snapshot ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!applicationId) return
    const q = query(
      collection(db, "applications", applicationId, "comments"),
      orderBy("createdAt", "asc")
    )
    return onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppComment, "id">) }))
      )
    })
  }, [applicationId])

  // ── Changelog snapshot ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!applicationId) return
    const q = query(
      collection(db, "applications", applicationId, "changelog"),
      orderBy("changedAt", "desc")
    )
    return onSnapshot(q, (snap) => {
      setChangelog(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChangeLogEntry, "id">) }))
      )
    })
  }, [applicationId])

  if (appLoading) return <FullPageSpinner />

  if (!application) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Application not found.
      </div>
    )
  }

  const config = STATUS_CONFIG[application.status] ?? STATUS_CONFIG[APPLICATION_STATUS.SUBMITTED]
  const displayName = application.applicantName?.trim() || "—"

  const TABS: { key: TabKey; label: string }[] = [
    { key: "answers", label: "Answers" },
    { key: "comments", label: `Comments${comments.length > 0 ? ` (${comments.length})` : ""}` },
    { key: "changelog", label: "Change Log" },
  ]

  return (
    // Extra bottom padding on mobile to clear the fixed action bar
    <div className="pb-24 md:pb-0">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-start gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate("/review")}
            className="mt-0.5 rounded-md p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back to queue"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Name + status */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{displayName}</span>
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                config.className
              )}
            >
              {config.label}
            </span>
            {/* Reviewer chip */}
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground whitespace-nowrap">
              {application.assignedReviewerEmail ?? (
                <span className="italic">Unassigned</span>
              )}
            </span>
          </div>

          {/* Desktop action buttons inline in header */}
          <ActionBar application={application} applicationId={applicationId} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b -mx-4 px-4">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none",
                activeTab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === "answers" && (
          <AnswersTab application={application} />
        )}
        {activeTab === "comments" && (
          <CommentsTab
            applicationId={applicationId}
            comments={comments}
            onRequestClarification={() => {
              // Switch to the action bar's clarification flow
              // The ActionBar renders its own dialog; we trigger it via a custom event
              // for simplicity we just navigate focus to the bottom bar button.
              // For a clean implementation, we lift clarification state here.
              toast({
                title: "Use the action bar",
                description: "Tap 'Request Clarification' in the action bar above or below.",
              })
            }}
          />
        )}
        {activeTab === "changelog" && (
          <ChangeLogTab changelog={changelog} />
        )}
      </div>

      {/* Mobile-only action bar is rendered inside ActionBar (fixed position) */}
    </div>
  )
}
