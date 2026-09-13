import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth"
import { httpsCallable } from "firebase/functions"
import { auth, functions } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PawPrint } from "lucide-react"

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

// ─── Firebase error messages ──────────────────────────────────────────────────

function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists."
    case "auth/weak-password":
      return "Password is too weak. Please choose a stronger password."
    case "auth/invalid-email":
      return "That email address is not valid."
    default:
      return "Something went wrong. Please try again."
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()
  const [mxError, setMxError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setMxError(null)
    setGeneralError(null)

    // 1. Validate MX record via Cloud Function
    try {
      const validateMx = httpsCallable<{ email: string }, { valid: boolean }>(
        functions,
        "validateMx"
      )
      const result = await validateMx({ email: values.email })
      if (!result.data.valid) {
        setMxError(
          "This email domain doesn't appear to be valid. Please use a working email address."
        )
        return
      }
    } catch {
      // If the function fails, fall through and let Firebase Auth handle it
    }

    // 2. Create account
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      )
      await sendEmailVerification(credential.user)
      navigate("/dashboard", { replace: true })
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : ""
      setGeneralError(friendlyAuthError(code))
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
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start your dog adoption application today
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!(errors.email || mxError)}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
            {mxError && (
              <p className="text-xs text-destructive">{mxError}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* General error */}
          {generalError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {generalError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
