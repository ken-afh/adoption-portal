import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/firebase"
import type { UserRole } from "@/types"

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  loading: boolean
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  refreshRole: async () => undefined,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  const extractRole = useCallback(async (u: User, forceRefresh = false): Promise<void> => {
    const idTokenResult = await u.getIdTokenResult(forceRefresh)
    const claim = idTokenResult.claims["role"]
    if (claim === "submitter" || claim === "reviewer" || claim === "admin") {
      setRole(claim)
    } else {
      setRole(null)
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
        setRole(null)
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
