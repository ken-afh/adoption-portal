import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
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
      // Auth account is now deleted server-side; onAuthStateChanged will
      // sign the user out automatically. Just close the dialog.
      onClose()
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not delete your data. Please try again."
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg space-y-4">
        <h2 className="font-semibold text-base">Delete my data</h2>
        <p className="text-sm text-muted-foreground">
          This will <strong>immediately and permanently</strong> delete your account and
          all associated applications. This action cannot be undone and satisfies your
          GDPR / CCPA right-to-erasure.
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
            {busy ? "Deleting…" : "Delete my data"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, role } = useAuth()
  const navigate = useNavigate()

  // Org-domain bootstrap banner: shown when an @aforeverhome.net user is still
  // on the "submitter" role — they need to be promoted to admin or reviewer
  // via the Firebase Console first time, or by an existing admin.
  const isOrgUser = user?.email?.endsWith("@aforeverhome.net") ?? false
  const showOrgBanner = isOrgUser && role === "submitter"

  const [applications, setApplications] = useState<FirestoreApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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

      {/* Org-domain bootstrap banner */}
      {showOrgBanner && (
        <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          <p className="mb-2 font-semibold">
            👋 You&rsquo;re signed in as an A Forever Home staff account, but your
            role hasn&rsquo;t been configured yet.
          </p>
          <p className="mb-3 text-blue-800">
            To gain admin or reviewer access, an existing admin can go to the{" "}
            <strong>Admin Panel → Manage User Roles</strong> and assign your role.
          </p>
          <p className="mb-1 font-medium text-blue-800">
            Setting up the first admin (no existing admin yet):
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-blue-800">
            <li>
              Open{" "}
              <strong>Firebase Console → Firestore → roles collection</strong>.
            </li>
            <li>
              Create a document with <strong>ID = your Firebase UID</strong>{" "}
              <span className="font-mono text-xs">({user?.uid})</span>:
              <pre className="mt-1 overflow-x-auto rounded bg-blue-100 px-3 py-2 text-xs">
                {`{\n  "uid": "${user?.uid ?? "YOUR_UID"}",\n  "role": "admin",\n  "email": "${user?.email ?? "you@aforeverhome.net"}"\n}`}
              </pre>
            </li>
            <li>
              <strong>Sign out and sign back in</strong> for the role to take
              effect.
            </li>
          </ol>
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
        <p className="mb-3 text-sm text-muted-foreground">
          You can permanently delete your account and all associated data
          (GDPR / CCPA right to erasure). This is immediate and cannot be undone.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete my data
        </Button>
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
        onClose={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}
