import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore"
import { sendEmailVerification } from "firebase/auth"
import { httpsCallable } from "firebase/functions"
import { Plus, Trash2 } from "lucide-react"
import { db, auth, functions } from "@/firebase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { OrgLogoRound } from "@/components/OrgLogo"
import {
  ApplicationCard,
  type FirestoreApplication,
} from "@/components/ApplicationCard"

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex w-full animate-pulse items-center gap-4 rounded-lg border bg-card px-4 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-5 w-20 rounded-full bg-muted" />
        </div>
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
      <div className="h-4 w-4 rounded bg-muted" />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Delete data request dialog ───────────────────────────────────────────────

function DeleteDataDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function handleRequest() {
    setBusy(true)
    try {
      await httpsCallable(functions, "deleteMyData")({})
      toast({
        title: "Deletion request submitted",
        description:
          "An administrator will process your request and delete your data within 30 days.",
      })
      onClose()
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.includes("already-exists")
          ? "You already have a pending deletion request."
          : "Could not submit your request. Please try again."
      toast({ title: msg, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg space-y-4">
        <h2 className="font-semibold text-base">Request data deletion</h2>
        <p className="text-sm text-muted-foreground">
          Submitting this request asks an administrator to permanently delete your account
          and all associated applications. You will be notified when the deletion is
          complete. This satisfies GDPR / CCPA right-to-erasure requirements.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRequest}
            disabled={busy}
          >
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [applications, setApplications] = useState<FirestoreApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)

  // Real-time Firestore listener
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, "applications"),
      where("submitterId", "==", user.uid),
      orderBy("lastEditedAt", "desc")
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
        // On error, stop loading silently — user sees empty state
        setLoading(false)
      }
    )

    return unsubscribe
  }, [user])

  // Check whether user already has a pending delete request
  useEffect(() => {
    if (!user) return
    getDoc(doc(db, "deleteRequests", user.uid)).then((snap) => {
      setHasPendingRequest(snap.exists() && snap.data()?.["status"] === "pending")
    }).catch(() => { /* non-fatal */ })
  }, [user])

  const handleResendVerification = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return
    setResendDisabled(true)
    try {
      await sendEmailVerification(currentUser)
      toast({
        title: "Verification email sent",
        description: "Check your inbox for the verification link.",
      })
    } catch {
      toast({
        title: "Couldn't send email",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      })
      setResendDisabled(false)
    }
  }

  const emailVerified = user?.emailVerified ?? true

  return (
    <div className="relative">
      {/* Email verification banner */}
      {!emailVerified && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Verify your email.</span> Check your
            inbox for a verification link.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-yellow-400 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
            disabled={resendDisabled}
            onClick={handleResendVerification}
          >
            {resendDisabled ? "Email sent" : "Resend email"}
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">My Applications</h1>
        <p className="text-sm text-muted-foreground">
          Track the status of your adoption applications
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : applications.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4">
            <OrgLogoRound fallbackSize={80} />
          </div>
          <h2 className="mb-1 text-lg font-semibold">No applications yet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Start your adoption journey today
          </p>
          <Button onClick={() => navigate("/apply")}>
            Start your adoption journey
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onDeleted={(id) =>
                setApplications((prev) => prev.filter((a) => a.id !== id))
              }
            />
          ))}
        </div>
      )}

      {/* GDPR / data deletion */}
      <div className="mt-10 border-t pt-6">
        <p className="mb-2 text-sm font-medium">Privacy</p>
        {hasPendingRequest ? (
          <p className="text-sm text-muted-foreground">
            Your data deletion request is <strong>pending</strong> and will be processed by
            an administrator shortly.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              You can request permanent deletion of your account and all associated data
              (GDPR / CCPA right to erasure).
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Request data deletion
            </Button>
          </>
        )}
      </div>

      {/* Floating action button */}
      <button
        type="button"
        onClick={() => navigate("/apply")}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6"
        aria-label="New application"
      >
        <Plus className="h-5 w-5" />
        <span className="hidden text-sm font-medium md:inline">
          New Application
        </span>
      </button>

      <DeleteDataDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          // Re-check pending status after submitting
          if (user) {
            getDoc(doc(db, "deleteRequests", user.uid)).then((snap) => {
              setHasPendingRequest(snap.exists() && snap.data()?.["status"] === "pending")
            }).catch(() => { /* non-fatal */ })
          }
        }}
      />
    </div>
  )
}
