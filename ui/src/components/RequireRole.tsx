import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { FullPageSpinner } from "@/components/ui/spinner"
import type { UserRole } from "@/types"

interface RequireRoleProps {
  allowedRoles: UserRole[]
}

export function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return <FullPageSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.includes(role)) {
    return <Outlet />
  }

  // Wrong role: reviewer/admin routes redirect submitters to dashboard;
  // submitter routes redirect reviewer/admin to their queue.
  if (role === "submitter") {
    return <Navigate to="/dashboard" replace />
  }
  return <Navigate to="/review" replace />
}
