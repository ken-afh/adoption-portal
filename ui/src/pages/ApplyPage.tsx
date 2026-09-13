import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/firebase"
import { Button } from "@/components/ui/button"
import { FullPageSpinner } from "@/components/ui/spinner"

export default function ApplyPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function create() {
      setError(null)
      try {
        const createApplication = httpsCallable<void, { applicationId: string }>(
          functions,
          "createApplication"
        )
        const result = await createApplication()
        if (!cancelled) {
          navigate(`/application/${result.data.applicationId}`, { replace: true })
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not create application. Please try again."
          )
        }
      }
    }

    create()
    return () => { cancelled = true }
  }, [navigate, retryKey])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4 px-4">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => setRetryKey((k) => k + 1)}>Try Again</Button>
      </div>
    )
  }

  return <FullPageSpinner />
}
