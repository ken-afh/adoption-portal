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

  if (role && allowedRoles.includes(role)) {
    return <Outlet />
  }

  // Submitter trying to access reviewer/admin routes → back to dashboard
  // Any other mismatch → login
  return <Navigate to={user ? "/dashboard" : "/login"} replace />
}
