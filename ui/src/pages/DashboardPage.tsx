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
import { Plus } from "lucide-react"
import { db, auth } from "@/firebase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
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

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [applications, setApplications] = useState<FirestoreApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [resendDisabled, setResendDisabled] = useState(false)

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
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl">
            🐶
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
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}

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
    </div>
  )
}
