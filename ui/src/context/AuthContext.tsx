import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/firebase"
import type { UserRole } from "@/types"

interface AuthContextValue {
  user: User | null
  role: UserRole
  loading: boolean
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: "submitter",
  loading: true,
  refreshRole: async () => undefined,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>("submitter")
  const [loading, setLoading] = useState(true)

  const extractRole = useCallback(async (u: User, forceRefresh = false): Promise<void> => {
    const idTokenResult = await u.getIdTokenResult(forceRefresh)
    const claim = idTokenResult.claims["role"]
    if (claim === "submitter" || claim === "reviewer" || claim === "admin") {
      setRole(claim)
    } else {
      // No role claim yet (e.g. onUserCreated function hasn't run yet,
      // or claim hasn't propagated). Default to submitter — the safest
      // fallback: submitters can only see their own data.
      setRole("submitter")
    }
  }, [])

  const refreshRole = useCallback(async (): Promise<void> => {
    if (user) {
      await extractRole(user, true)
    }
  }, [user, extractRole])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await extractRole(firebaseUser)
      } else {
        setRole("submitter")
      }
      setLoading(false)
    })

    return unsubscribe
  }, [extractRole])

  return (
    <AuthContext.Provider value={{ user, role, loading, refreshRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
