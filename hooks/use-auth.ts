"use client"

/**
 * Single source of truth: Firebase + /auth/me session from AuthContext.
 * Previously this hook subscribed to authService (REST/localStorage), which never updated
 * after Firebase login — causing empty user in Morphic avatar and permission-gated UIs.
 */
import { useAuth as useAuthFromContext } from "@/contexts/AuthContext"

export function useAuth() {
  const ctx = useAuthFromContext()
  return {
    user: ctx.user,
    isAuthenticated: ctx.isAuthenticated,
    isLoading: ctx.loading,
    loading: ctx.loading,
    token: ctx.token,
    login: ctx.login,
    register: ctx.register,
    logout: ctx.logout,
    loginWithGoogle: ctx.loginWithGoogle,
    demoLogin: ctx.demoLogin,
    refreshUser: ctx.refreshUser,
    hasPermission: ctx.hasPermission,
    hasRole: ctx.hasRole,
  }
}
