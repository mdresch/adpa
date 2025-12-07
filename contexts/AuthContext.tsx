"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { apiClient, User } from "@/lib/api"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, redirect?: string) => Promise<void>
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  // Check if user is authenticated
  const isAuthenticated = !!user

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false
    return user.permissions[permission] === true
  }

  // Check if user has specific role(s)
  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }

  // Helper function to validate JWT token format
  const isValidTokenFormat = (token: string): boolean => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return false
    }
    const parts = token.trim().split(".")
    return parts.length === 3 && parts.every(part => part.length > 0)
  }

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        if (token) {
          // Validate token format before using it
          if (!isValidTokenFormat(token)) {
            console.warn("Invalid token format in localStorage, clearing it")
            localStorage.removeItem("auth_token")
            apiClient.clearToken()
            setToken(null)
            setLoading(false)
            return
          }
          
          apiClient.setToken(token)
          setToken(token)
          try {
            const currentUser = await apiClient.getCurrentUser()
            setUser(currentUser)
          } catch (userError) {
            console.error("Failed to get current user:", userError)
            // Clear invalid token
            localStorage.removeItem("auth_token")
            apiClient.clearToken()
            setToken(null)
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error)
        // Clear invalid token
        localStorage.removeItem("auth_token")
        apiClient.clearToken()
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  // Login function
  const login = async (email: string, password: string, redirect?: string) => {
    try {
      setLoading(true)
      const { user: loggedInUser, token } = await apiClient.login(email, password)
      setUser(loggedInUser)
  setToken(token)
      
      // Connect WebSocket after successful login
      apiClient.connectWebSocket()
      
      toast.success("Login successful!")
      
      // Use provided redirect, or default to home
      const redirectPath = redirect || "/"
      router.push(redirectPath)
    } catch (error) {
      console.error("Login failed:", error)
      toast.error(error instanceof Error ? error.message : "Login failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Register function
  const register = async (userData: { email: string; password: string; name: string; role?: string; companyName?: string }, options?: { redirect?: string | false }) => {
    try {
      setLoading(true)
      const { user: newUser, token, company } = await apiClient.register(userData)
      setUser(newUser)
  setToken(token)
      
      // Connect WebSocket after successful registration
      apiClient.connectWebSocket()
      
      // Show success message with company info if company was created
      if (company) {
        toast.success(`Account and company "${company.name}" created successfully!`)
      } else {
        toast.success("Registration successful!")
      }
      
      // Only redirect if not explicitly disabled
      if (options?.redirect !== false) {
        router.push(options?.redirect || "/")
      }
    } catch (error) {
      console.error("Registration failed:", error)
      toast.error(error instanceof Error ? error.message : "Registration failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await apiClient.logout()
      setUser(null)
  setToken(null)
      toast.success("Logged out successfully")
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout failed:", error)
      // Force logout even if API call fails
      setUser(null)
      apiClient.clearToken()
  setToken(null)
      router.push("/auth/login")
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    try {
      if (isAuthenticated) {
        const currentUser = await apiClient.getCurrentUser()
        setUser(currentUser)
      }
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
      setUser(loggedInUser)
      setToken(token)
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
    loading,
    login,
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
