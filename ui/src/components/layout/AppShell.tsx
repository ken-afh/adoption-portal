import React from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import {
  FileText,
  Plus,
  Inbox,
  Settings,
  ChevronLeft,
  LogOut,
  User,
} from "lucide-react"
import { auth } from "@/firebase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Nav items ───────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

function useNavItems(): NavItem[] {
  const { role } = useAuth()

  if (role === "admin") {
    return [
      { label: "Queue", to: "/review", icon: <Inbox className="h-5 w-5" /> },
      { label: "Admin", to: "/admin", icon: <Settings className="h-5 w-5" /> },
    ]
  }

  if (role === "reviewer") {
    return [
      { label: "Queue", to: "/review", icon: <Inbox className="h-5 w-5" /> },
    ]
  }

  // submitter (default)
  return [
    {
      label: "My Applications",
      to: "/dashboard",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: "New Application",
      to: "/apply",
      icon: <Plus className="h-5 w-5" />,
    },
  ]
}

// ─── Top bar ─────────────────────────────────────────────────────────────────

function TopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?"

  const handleSignOut = async () => {
    await signOut(auth)
    navigate("/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4">
      {/* Back button — shown when not at a root nav destination */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mr-2 rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden"
        aria-label="Go back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Spacer so avatar sits on the right */}
      <div className="flex-1" />

      {/* Avatar + dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          aria-label="User menu"
          aria-expanded={dropdownOpen}
        >
          {initials}
        </button>

        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute right-0 top-10 z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md">
              <div className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                {user?.email}
              </div>
              <div className="my-1 h-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Desktop: show email */}
      <span className="ml-3 hidden text-sm text-muted-foreground md:block">
        {user?.email}
      </span>
    </header>
  )
}

// ─── Bottom nav (mobile) ─────────────────────────────────────────────────────

function BottomNav() {
  const navItems = useNavItems()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex h-14 border-t bg-background md:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

// ─── Left sidebar (desktop) ──────────────────────────────────────────────────

function Sidebar() {
  const navItems = useNavItems()

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-background">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <User className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Adoption Portal</span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

// ─── AppShell ────────────────────────────────────────────────────────────────

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
