import { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from "firebase/auth"
import { auth } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PawPrint } from "lucide-react"

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type FormValues = z.infer<typeof schema>

// ─── Firebase error messages ──────────────────────────────────────────────────

function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password."
    case "auth/user-disabled":
      return "This account has been disabled."
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later."
    default:
      return "Something went wrong. Please try again."
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? "/dashboard"

  const [generalError, setGeneralError] = useState<string | null>(null)
  const [resetEmail, setResetEmail] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // ── Email / password sign-in ────────────────────────────────────────────────

  const onSubmit = async (values: FormValues) => {
    setGeneralError(null)
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : ""
      setGeneralError(friendlyAuthError(code))
    }
  }

  // ── Google sign-in ──────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    setGeneralError(null)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : ""
      if (code !== "auth/popup-closed-by-user") {
        setGeneralError(friendlyAuthError(code))
      }
    }
  }

  // ── Forgot password ─────────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    setResetError(null)
    setResetSent(false)
    const email = resetEmail || getValues("email")
    if (!email) {
      setResetError("Enter your email address above first.")
      return
    }
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : ""
      if (code === "auth/user-not-found") {
        // Don't reveal whether the account exists
        setResetSent(true)
      } else {
        setResetError("Could not send reset email. Please try again.")
      }
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <PawPrint className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your adoption account
          </p>
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              {...register("email", {
                onChange: (e) => setResetEmail(e.target.value),
              })}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-xs text-primary underline underline-offset-4"
                onClick={() => setShowReset((v) => !v)}
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Forgot password panel */}
          {showReset && (
            <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-2">
              <p className="text-sm font-medium">Reset your password</p>
              <Input
                type="email"
                placeholder="Email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
              />
              {resetSent ? (
                <p className="text-xs text-green-700">
                  ✓ If an account exists, a reset link has been sent.
                </p>
              ) : (
                <>
                  {resetError && (
                    <p className="text-xs text-destructive">{resetError}</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={resetLoading}
                    onClick={handleForgotPassword}
                  >
                    {resetLoading ? "Sending…" : "Send reset link"}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* General error */}
          {generalError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {generalError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Google sign-in */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={handleGoogleSignIn}
        >
          {/* Simple Google "G" SVG */}
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-primary underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
