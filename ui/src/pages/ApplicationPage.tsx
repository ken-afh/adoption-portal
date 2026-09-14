import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { db, functions } from "@/firebase"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { FullPageSpinner } from "@/components/ui/spinner"
import { Loader2, Check, AlertCircle, Trash2 } from "lucide-react"
import { STATUS_CONFIG, type FirestoreApplication } from "@/components/ApplicationCard"
import { useApplication } from "@/hooks/useApplication"
import { APPLICATION_STATUS } from "@/lib/applicationStatus"
import { FormStepper } from "@/components/form/FormStepper"
import { Section1Applicant } from "@/components/form/sections/Section1Applicant"
import { Section2Home } from "@/components/form/sections/Section2Home"
import { Section3Household } from "@/components/form/sections/Section3Household"
import { Section4Pets } from "@/components/form/sections/Section4Pets"
import { Section5Vet } from "@/components/form/sections/Section5Vet"
import { Section6DogCare } from "@/components/form/sections/Section6DogCare"
import { Section7AboutYou } from "@/components/form/sections/Section7AboutYou"
import { Section8Agreement } from "@/components/form/sections/Section8Agreement"

// ─── Comment type ─────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return "—"
  return ts.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const EDITABLE_STATUSES: FirestoreApplication["status"][] = [
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.CLARIFICATION_REQUESTED,
  APPLICATION_STATUS.REJECTED,
]

const TOTAL_SECTIONS = 8

// ─── Section titles (for desktop anchors) ────────────────────────────────────

const SECTION_LABELS = [
  "Applicant Info",
  "Home & Living",
  "Household",
  "Pets",
  "Veterinarian",
  "Dog Care Plan",
  "About You",
  "Agreement",
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusCard({ application }: { application: FirestoreApplication }) {
  const config = STATUS_CONFIG[application.status] ?? STATUS_CONFIG[APPLICATION_STATUS.DRAFT]

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${config.className}`}
        >
          {config.label}
        </span>
      </div>
      <dl className="grid gap-1 text-sm">
        {application.submittedAt && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Submitted:</dt>
            <dd>{formatDate(application.submittedAt)}</dd>
          </div>
        )}
        {application.assignedReviewerEmail && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Reviewer:</dt>
            <dd>{application.assignedReviewerEmail}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function ClarificationBanner({ request }: { request: AppComment }) {
  return (
    <div className="rounded-lg border-l-4 border-orange-400 bg-orange-50 p-4">
      <h3 className="mb-1 font-semibold text-orange-800">
        A reviewer needs clarification:
      </h3>
      <p className="text-sm text-orange-900 whitespace-pre-wrap">{request.text}</p>
    </div>
  )
}

function RejectionBanner({ reason }: { reason: string | null }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4">
      <h3 className="mb-1 font-semibold text-red-800">Application not approved</h3>
      {reason && (
        <p className="text-sm text-red-900 whitespace-pre-wrap">{reason}</p>
      )}
      <p className="mt-2 text-sm text-red-700">
        Review the reason above, make any necessary changes, and resubmit.
      </p>
    </div>
  )
}

function ApprovalCard() {
  return (
    <div className="rounded-lg border border-green-300 bg-green-50 p-5">
      <h3 className="mb-2 font-semibold text-green-800 text-lg">
        🎉 Congratulations!
      </h3>
      <p className="text-sm text-green-900">
        Your application has been approved. We'll be in touch soon about next steps.
      </p>
    </div>
  )
}

function RejectionCard({ reason }: { reason: string | null }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-5">
      <h3 className="mb-2 font-semibold text-red-800">Application not approved</h3>
      {reason && (
        <p className="mb-4 text-sm text-red-900 whitespace-pre-wrap">{reason}</p>
      )}
    </div>
  )
}

function CommentThread({ comments }: { comments: AppComment[] }) {
  if (comments.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="mb-3 font-semibold text-base">Messages</h3>
      <div className="space-y-3">
        {comments.map((c) => {
          const isReviewer = c.authorRole === "reviewer"
          return (
            <div
              key={c.id}
              className={`rounded-lg border p-4 ${
                isReviewer
                  ? "border-orange-200 bg-orange-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {isReviewer ? "Reviewer" : "You"}
                  {c.authorName ? ` · ${c.authorName}` : ""}
                </span>
                {c.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Saving indicator (shown in header area) ─────────────────────────────────

function SavingIndicator({
  isSaving,
  isDirty,
  saveError,
}: {
  isSaving: boolean
  isDirty: boolean
  saveError: string | null
}) {
  if (saveError) {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        Save failed
      </span>
    )
  }
  if (isSaving) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    )
  }
  if (!isDirty) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Check className="h-3 w-3" />
        Saved
      </span>
    )
  }
  return null
}

// ─── Confirm submit dialog (simple inline) ────────────────────────────────────

function SubmitConfirmDialog({
  open,
  onConfirm,
  onCancel,
  isSubmitting,
  isResubmit,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
  isResubmit: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg space-y-4">
        <h2 className="font-semibold text-base">
          {isResubmit ? "Resubmit Application?" : "Submit Application?"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isResubmit
            ? "Your application will be sent back to the reviewer. Make sure your changes are complete."
            : "Once submitted, you won't be able to edit your application unless a reviewer requests clarification."}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Submitting…
              </span>
            ) : isResubmit ? (
              "Resubmit"
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Section for stepper (only one at a time) ─────────────────────────────────

function StepSection({
  index,
  formData,
  setField,
  canEdit,
}: {
  index: number
  formData: ReturnType<typeof useApplication>["formData"]
  setField: ReturnType<typeof useApplication>["setField"]
  canEdit: boolean
}) {
  const props = { formData, setField, canEdit }
  switch (index) {
    case 0: return <Section1Applicant {...props} />
    case 1: return <Section2Home {...props} />
    case 2: return <Section3Household {...props} />
    case 3: return <Section4Pets {...props} />
    case 4: return <Section5Vet {...props} />
    case 5: return <Section6DogCare {...props} />
    case 6: return <Section7AboutYou {...props} />
    case 7: return <Section8Agreement {...props} />
    default: return null
  }
}

// ─── Editable form view ───────────────────────────────────────────────────────

function EditableForm({
  applicationId,
  initialApplication,
  comments,
}: {
  applicationId: string
  initialApplication: FirestoreApplication
  comments: AppComment[]
}) {
  const navigate = useNavigate()
  const {
    application,
    formData,
    setField,
    isDirty,
    isSaving,
    saveError,
    canEdit,
    submit,
    isSubmitting,
  } = useApplication(applicationId)

  const app = application ?? initialApplication
  const [currentSection, setCurrentSection] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isResubmit = app.status === APPLICATION_STATUS.REJECTED

  const clarificationRequest = [...comments]
    .reverse()
    .find((c) => c.type === "clarification_request")

  async function handleSubmit() {
    try {
      await submit()
      setConfirmOpen(false)
      toast({ title: "Application submitted!", description: "We'll be in touch soon." })
      navigate(`/application/${applicationId}`)
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      {/* ── Status + banners ──────────────────────────────────────────── */}
      <div className="space-y-3 mb-4">
        <StatusCard application={app} />
        {app.status === APPLICATION_STATUS.CLARIFICATION_REQUESTED && clarificationRequest && (
          <ClarificationBanner request={clarificationRequest} />
        )}
        {app.status === APPLICATION_STATUS.REJECTED && (
          <RejectionBanner reason={app.decisionReason} />
        )}
      </div>

      {/* ── MOBILE: stepper (hidden on md+) ──────────────────────────── */}
      <div className="md:hidden">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            {SECTION_LABELS[currentSection]}
          </h3>
          <StepSection
            index={currentSection}
            formData={formData}
            setField={setField}
            canEdit={canEdit}
          />
        </div>

        {/* Submit button on last step */}
        {currentSection === TOTAL_SECTIONS - 1 && canEdit && (
          <div className="mt-4 mb-20">
            <Button
              className="w-full"
              onClick={() => setConfirmOpen(true)}
              disabled={isSubmitting}
            >
              {isResubmit ? "Resubmit Application" : "Submit Application"}
            </Button>
          </div>
        )}

        <FormStepper
          currentSection={currentSection}
          totalSections={TOTAL_SECTIONS}
          onNext={() => {
            if (currentSection === TOTAL_SECTIONS - 1) {
              setConfirmOpen(true)
            } else {
              setCurrentSection((s) => s + 1)
            }
          }}
          onBack={() => setCurrentSection((s) => Math.max(0, s - 1))}
          isSaving={isSaving}
          isDirty={isDirty}
        />
      </div>

      {/* ── DESKTOP: all sections (hidden on mobile) ─────────────────── */}
      <div className="hidden md:block space-y-10">
        {/* Saving indicator + section nav */}
        <div className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur border-b py-2 -mx-4 px-4">
          <nav className="flex flex-wrap gap-3">
            {SECTION_LABELS.map((label, i) => (
              <a
                key={i}
                href={`#section-${i}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <SavingIndicator isSaving={isSaving} isDirty={isDirty} saveError={saveError} />
        </div>

        {/* Section anchors */}
        {[
          <Section1Applicant key={0} formData={formData} setField={setField} canEdit={canEdit} />,
          <Section2Home key={1} formData={formData} setField={setField} canEdit={canEdit} />,
          <Section3Household key={2} formData={formData} setField={setField} canEdit={canEdit} />,
          <Section4Pets key={3} formData={formData} setField={setField} canEdit={canEdit} />,
          <Section5Vet key={4} formData={formData} setField={setField} canEdit={canEdit} />,
          <Section6DogCare key={5} formData={formData} setField={setField} canEdit={canEdit} />,
          <Section7AboutYou key={6} formData={formData} setField={setField} canEdit={canEdit} />,
          <Section8Agreement key={7} formData={formData} setField={setField} canEdit={canEdit} />,
        ].map((section, i) => (
          <div key={i} id={`section-${i}`} className="scroll-mt-16">
            {section}
          </div>
        ))}

        {/* Desktop sticky submit bar */}
        {canEdit && (
          <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur -mx-4 px-4 py-3 flex items-center justify-between">
            <SavingIndicator isSaving={isSaving} isDirty={isDirty} saveError={saveError} />
            <Button onClick={() => setConfirmOpen(true)} disabled={isSubmitting}>
              {isResubmit ? "Resubmit Application" : "Submit Application"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Comments ──────────────────────────────────────────────────── */}
      <CommentThread comments={comments} />

      {/* ── Confirm submit dialog ─────────────────────────────────────── */}
      <SubmitConfirmDialog
        open={confirmOpen}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
        isSubmitting={isSubmitting}
        isResubmit={isResubmit}
      />
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [application, setApplication] = useState<FirestoreApplication | null>(null)
  const [loadingApp, setLoadingApp] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [comments, setComments] = useState<AppComment[]>([])
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm("Delete this application? This cannot be undone.")) return
    setDeleting(true)
    try {
      await httpsCallable(functions, "deleteApplication")({ applicationId: id })
      toast({ title: "Application deleted" })
      navigate("/dashboard", { replace: true })
    } catch {
      toast({ title: "Could not delete application", variant: "destructive" })
      setDeleting(false)
    }
  }

  // Fetch application document (one-time to get initial state + drive branch)
  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoadingApp(false)
      return
    }

    const unsubscribe = onSnapshot(
      doc(db, "applications", id),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true)
        } else {
          setApplication({
            id: snap.id,
            ...(snap.data() as Omit<FirestoreApplication, "id">),
          })
        }
        setLoadingApp(false)
      },
      () => {
        setNotFound(true)
        setLoadingApp(false)
      }
    )

    return unsubscribe
  }, [id])

  // Real-time comment listener
  useEffect(() => {
    if (!id) return

    const q = query(
      collection(db, "applications", id, "comments"),
      where("type", "in", ["clarification_request", "submitter_reply"]),
      orderBy("createdAt", "asc")
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AppComment, "id">),
        }))
      )
    })

    return unsubscribe
  }, [id])

  // ── Loading / not found states ─────────────────────────────────────────────

  if (loadingApp) return <FullPageSpinner />

  if (notFound || !application || !id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="mb-4 text-muted-foreground">Application not found.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  const isEditable = EDITABLE_STATUSES.includes(application.status)

  // ── Editable form view ─────────────────────────────────────────────────────

  if (isEditable) {
    return (
      <div className="max-w-2xl pb-24 md:pb-4">
        <EditableForm
          applicationId={id}
          initialApplication={application}
          comments={comments}
        />
        {/* Delete — shown below the form for draft/rejected */}
        <div className="mt-8 border-t pt-6">
          <p className="mb-3 text-sm text-muted-foreground">
            No longer interested? You can delete this application permanently.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete application"}
          </Button>
        </div>
      </div>
    )
  }

  // ── Read-only status view ──────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-4">
      <StatusCard application={application} />
      {application.status === APPLICATION_STATUS.APPROVED && <ApprovalCard />}
      {application.status === APPLICATION_STATUS.REJECTED && (
        <>
          <RejectionCard reason={application.decisionReason} />
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              You may delete this application instead of resubmitting.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete application"}
            </Button>
          </div>
        </>
      )}
      <CommentThread comments={comments} />
    </div>
  )
}
