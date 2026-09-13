import React, { Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/context/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import { RequireAuth } from "@/components/RequireAuth"
import { RequireRole } from "@/components/RequireRole"
import { AppShell } from "@/components/layout/AppShell"
import { FullPageSpinner, Spinner } from "@/components/ui/spinner"

const LandingPage = React.lazy(() => import("@/pages/LandingPage"))
const RegisterPage = React.lazy(() => import("@/pages/RegisterPage"))
const LoginPage = React.lazy(() => import("@/pages/LoginPage"))
const DashboardPage = React.lazy(() => import("@/pages/DashboardPage"))
const ApplyPage = React.lazy(() => import("@/pages/ApplyPage"))
const ApplicationPage = React.lazy(() => import("@/pages/ApplicationPage"))
const ReviewQueuePage = React.lazy(() => import("@/pages/ReviewQueuePage"))
const ReviewDetailPage = React.lazy(() => import("@/pages/ReviewDetailPage"))
const AdminPage = React.lazy(() => import("@/pages/AdminPage"))
const NotFoundPage = React.lazy(() => import("@/pages/NotFoundPage"))

const PageFallback = (
  <div className="flex h-screen items-center justify-center">
    <Spinner />
  </div>
)

/**
 * Wrapper to redirect already-authenticated users away from auth pages.
 */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={PageFallback}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <RegisterPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />

        {/* Submitter routes */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allowedRoles={["submitter"]} />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/apply" element={<ApplyPage />} />
              <Route path="/application/:id" element={<ApplicationPage />} />
            </Route>
          </Route>

          {/* Reviewer + Admin routes */}
          <Route element={<RequireRole allowedRoles={["reviewer", "admin"]} />}>
            <Route element={<AppShell />}>
              <Route path="/review" element={<ReviewQueuePage />} />
              <Route path="/review/:id" element={<ReviewDetailPage />} />
            </Route>
          </Route>

          {/* Admin-only routes */}
          <Route element={<RequireRole allowedRoles={["admin"]} />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
