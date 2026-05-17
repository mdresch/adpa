"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { apiClient, User } from "@/lib/api"
import { toast } from "@/lib/notify"
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  getIdToken,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { isPrivilegedAppRole, normalizeAppRole } from "@/lib/auth-roles"

/** Firebase account fields for UI when the ADPA profile API has not loaded yet (or failed). */
export type FirebaseSessionProfile = {
  email: string | null
  displayName: string | null
  photoURL: string | null
}

interface AuthContextType {
  user: User | null
  /** Present while Firebase has a session; use for display fallbacks when `user` is still null. */
  firebaseSession: FirebaseSessionProfile | null
  loading: boolean
  login: (email: string, password: string, redirect?: string) => Promise<void>
  loginWithGoogle: (redirect?: string) => Promise<void>
  register: (userData: { email: string; password: string; name: string; role?: string; companyName?: string }, options?: { redirect?: string | false }) => Promise<void>
  demoLogin: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
  token: string | null
  hasPermission: (permission: string) => boolean
  hasRole: (roles: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

const FIREBASE_AUTH_NOT_CONFIGURED_MESSAGE =
  "Firebase auth is not configured in this local environment. Use Demo Login or set NEXT_PUBLIC_FIREBASE_* variables."

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseSession, setFirebaseSession] = useState<FirebaseSessionProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  const syncFirebaseSessionProfile = (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setFirebaseSession(null)
      return
    }
    setFirebaseSession({
      email: firebaseUser.email ?? null,
      displayName: firebaseUser.displayName ?? null,
      photoURL: firebaseUser.photoURL ?? null,
    })
  }

  // True when ADPA profile is loaded, or a valid API token is present while profile restoration is in flight.
  const isAuthenticated = !!user || (!loading && !!token)

  const restoreStoredSession = useCallback(async () => {
    if (typeof window === 'undefined') {
      return false
    }

    const storedToken = localStorage.getItem('auth_token')
    if (!storedToken || !isValidTokenFormat(storedToken)) {
      return false
    }

    try {
      apiClient.setToken(storedToken)
      setToken(storedToken)
      setCookie('auth_token', storedToken, 1)
      const currentUser = await apiClient.getCurrentUser()
      setUser(currentUser)
      apiClient.connectWebSocket()
      return true
    } catch (error) {
      console.warn('[Auth] Stored token restoration failed, clearing local auth state.')
      apiClient.clearToken()
      removeCookie('auth_token')
      setToken(null)
      setUser(null)
      return false
    }
  }, [])

  // Align with server `requirePermission`: admins implicitly have all permissions (UI only; API still enforces).
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false
    if (isPrivilegedAppRole(user.role)) return true
    if (!user.permissions) return false
    return user.permissions[permission] === true
  }, [user])

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user) return false
    const r = normalizeAppRole(user.role)
    const roleArray = (Array.isArray(roles) ? roles : [roles]).map((x) => normalizeAppRole(x))
    return roleArray.includes(r)
  }, [user])

  // Helper function to validate JWT token format
  const isValidTokenFormat = (token: string): boolean => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return false
    }
    const parts = token.trim().split(".")
    return parts.length === 3 && parts.every(part => part.length > 0)
  }

  // Initialize auth state using Firebase
  useEffect(() => {
    // Safety check for build-time or missing Firebase config
    if (!auth || !auth.app) {
      console.warn("🔐 AuthProvider: Skipping registration (invalid Auth object).");
      void restoreStoredSession().finally(() => setLoading(false))
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        syncFirebaseSessionProfile(firebaseUser)
        try {
          // Get the ID token from Firebase
          const idToken = await getIdToken(firebaseUser)
          
          if (idToken) {
            // Set the token in the API client for all subsequent requests
            apiClient.setToken(idToken)
            setToken(idToken)
            
            // Set auth cookie for server-side access (middleware, etc.)
            setCookie('auth_token', idToken, 1)

            // Fetch the full ADPA user profile from the Azure backend
            try {
              const currentUser = await apiClient.getCurrentUser()
              setUser(currentUser)
              
              // Connect WebSocket after successful profile fetch
              apiClient.connectWebSocket()
            } catch (profileError: any) {
              // If the backend is down (500/502), silently clear state so the user
              // lands on a clean login page rather than seeing a confusing error toast.
              // This handles cases where the browser has a cached Firebase session
              // but the backend is temporarily unavailable or being redeployed.
              const status = profileError?.status || profileError?.response?.status
              if (status === 503) {
                console.warn(
                  "[Auth] Backend temporarily unavailable (503) during session restore; keeping Firebase session."
                )
              } else if (status >= 500 || !status) {
                console.warn("[Auth] Backend unavailable during session restore, clearing auth state silently.")
                apiClient.clearToken()
                removeCookie('auth_token')
                // Don't setUser — leave it as null so the app shows the login page
              } else {
                console.error("Failed to fetch ADPA user profile:", profileError)
                toast.error("Authenticated but failed to load user profile.")
              }
            }
          }
        } catch (tokenError) {
          console.error("Failed to get Firebase ID token:", tokenError)
        }
      } else {
        syncFirebaseSessionProfile(null)

        const restored = await restoreStoredSession()
        if (!restored) {
          setUser(null)
          setToken(null)
          apiClient.clearToken()
          removeCookie('auth_token')
        }
      }
      
      setLoading(false)
    })

    // Cleanup subscription
    return () => unsubscribe()
  }, [restoreStoredSession])

  // If Firebase + API token exist but `/auth/me` failed transiently, retry so role/permissions populate (sidebar, analytics).
  useEffect(() => {
    if (!auth?.app) return
    if (loading) return
    if (user) return
    if (!token || !firebaseSession) return

    let cancelled = false
    let attempt = 0
    const maxAttempts = 8

    const schedule = () => {
      if (cancelled || attempt >= maxAttempts) return
      const delay = Math.min(3500 * (attempt + 1), 20000)
      setTimeout(async () => {
        if (cancelled) return
        attempt += 1
        try {
          const u = await apiClient.getCurrentUser()
          if (!cancelled) {
            setUser(u)
            apiClient.connectWebSocket()
          }
        } catch {
          if (!cancelled) schedule()
        }
      }, delay)
    }

    schedule()
    return () => {
      cancelled = true
    }
  }, [loading, user, token, firebaseSession])

  // Helper to set cookie
  const setCookie = (name: string, value: string, days: number) => {
    if (typeof document === 'undefined') return
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`
  }

  // Helper to remove cookie
  const removeCookie = (name: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
  }

  // Login function utilizing Firebase
  const login = async (email: string, password: string, redirect?: string) => {
    try {
      setLoading(true)

      if (!auth || !auth.app) {
        throw new Error(FIREBASE_AUTH_NOT_CONFIGURED_MESSAGE)
      }
      
      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      
      // 2. Get the ID token
      const idToken = await getIdToken(firebaseUser)
      
      // 3. Update the API client immediately
      apiClient.setToken(idToken)
      setToken(idToken)
      setCookie('auth_token', idToken, 1)

      // 4. Fetch ADPA profile from Azure backend
      const adpaUser = await apiClient.getCurrentUser()
      setUser(adpaUser)
      
      // 5. Setup extra services
      apiClient.connectWebSocket()

      toast.success("Login successful!")

      // 6. Navigation
      const redirectPath = redirect || "/"
      router.push(redirectPath)
    } catch (error) {
      console.error("Firebase Login failed:", error)
      toast.error(error instanceof Error ? error.message : "Login failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Google Login function
  const loginWithGoogle = async (redirect?: string) => {
    try {
      setLoading(true)

      if (!auth || !auth.app) {
        throw new Error(FIREBASE_AUTH_NOT_CONFIGURED_MESSAGE)
      }

      const provider = new GoogleAuthProvider()
      
      // 1. Sign in with Google Popup
      const userCredential = await signInWithPopup(auth, provider)
      const firebaseUser = userCredential.user
      
      // 2. Token extraction & sync
      const idToken = await getIdToken(firebaseUser)
      apiClient.setToken(idToken)
      setToken(idToken)
      setCookie('auth_token', idToken, 1)

      // 3. ADPA Backend fetch
      const adpaUser = await apiClient.getCurrentUser()
      setUser(adpaUser)
      apiClient.connectWebSocket()

      toast.success("Google Login successful!")
      router.push(redirect || "/")
    } catch (error) {
      console.error("Google Login failed:", error)
      toast.error(error instanceof Error ? error.message : "Google Login failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Register function utilizing Firebase
  const register = async (userData: { email: string; password: string; name: string; role?: string; companyName?: string }, options?: { redirect?: string | false }) => {
    try {
      setLoading(true)

      if (!auth || !auth.app) {
        throw new Error(FIREBASE_AUTH_NOT_CONFIGURED_MESSAGE)
      }
      
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
      const firebaseUser = userCredential.user
      
      // 2. Get the ID token
      const idToken = await getIdToken(firebaseUser)
      
      // 3. Initialize API client
      apiClient.setToken(idToken)
      setToken(idToken)
      setCookie('auth_token', idToken, 1)

      // 4. Create user record in ADPA backend (Azure) 
      // We pass the full userData so the backend can create the profile/company linked to this Firebase ID
      const { user: adpaUser, company } = await apiClient.register(userData)
      setUser(adpaUser)

      apiClient.connectWebSocket()

      if (company) {
        toast.success(`Account and company "${company.name}" created successfully!`)
      } else {
        toast.success("Registration successful!")
      }

      if (options?.redirect !== false) {
        router.push(options?.redirect || "/")
      }
    } catch (error) {
      console.error("Firebase Registration failed:", error)
      toast.error(error instanceof Error ? error.message : "Registration failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Logout function utilizing Firebase
  const logout = async () => {
    try {
      if (auth?.app) {
        await signOut(auth)
      }
      
      // Local state cleanup (also handled by onAuthStateChanged, but good to be explicit)
      setUser(null)
      setFirebaseSession(null)
      setToken(null)
      apiClient.clearToken()
      removeCookie('auth_token')
      
      toast.success("Logged out successfully")
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout failed:", error)
      setUser(null)
      setFirebaseSession(null)
      setToken(null)
      apiClient.clearToken()
      removeCookie('auth_token')
      router.push("/auth/login")
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    try {
      if (!token) return
      const currentUser = await apiClient.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error("Failed to refresh user:", error)
      // If refresh fails, user might be logged out
      if (error instanceof Error && error.message.includes("401")) {
        await logout()
      }
    }
  }

  // Demo login (dev only)
  const demoLogin = async () => {
    try {
      setLoading(true)
      const { user: loggedInUser, token } = await apiClient.demoLogin()
      apiClient.setToken(token)
      setUser(loggedInUser)
      setToken(token)
      setCookie('auth_token', token, 1)
      apiClient.connectWebSocket()
      toast.success("Demo login successful")
      router.push("/")
    } catch (error) {
      console.error("Demo login failed:", error)
      toast.error("Demo login failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    firebaseSession,
    loading,
    login,
    loginWithGoogle,
    register,
    demoLogin,
    logout,
    refreshUser,
    isAuthenticated,
    token,
    hasPermission,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.push("/auth/login")
      }
    }, [isAuthenticated, loading, router])

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return null
    }

    return <Component {...props} />
  }
}

// Hook for role-based access control
export function useRoleGuard(requiredRoles: string | string[]) {
  const { hasRole, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !hasRole(requiredRoles)) {
      toast.error("Access denied: Insufficient permissions")
      router.push("/")
    }
  }, [user, hasRole, requiredRoles, router])

  return hasRole(requiredRoles)
}

// Hook for permission-based access control
export function usePermissionGuard(requiredPermissions: string | string[]) {
  const { hasPermission, user } = useAuth()
  const router = useRouter()

  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
  const hasAllPermissions = permissions.every(permission => hasPermission(permission))

  useEffect(() => {
    if (user && !hasAllPermissions) {
      toast.error("Access denied: Insufficient permissions")
      router.push("/")
    }
  }, [user, hasAllPermissions, router])

  return hasAllPermissions
}
