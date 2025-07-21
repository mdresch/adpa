import { apiClient } from "./api"

export interface User {
  id: string
  name: string
  email: string
  role: string
  avatar_url?: string
  permissions: Record<string, boolean>
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = []
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  }

  constructor() {
    this.initializeAuth()
  }

  private async initializeAuth() {
    try {
      const token = localStorage.getItem("auth_token")
      if (token) {
        apiClient.setToken(token)
        const user = await apiClient.getCurrentUser()
        this.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        this.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error("Auth initialization failed:", error)
      this.logout()
    }
  }

  private setState(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState }
    this.listeners.forEach((listener) => listener(this.state))
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  getState() {
    return this.state
  }

  async login(email: string, password: string) {
    try {
      this.setState({ isLoading: true })
      const response = await apiClient.login(email, password)

      apiClient.setToken(response.token)
      this.setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })

      return response
    } catch (error) {
      this.setState({ isLoading: false })
      throw error
    }
  }

  async register(userData: { name: string; email: string; password: string }) {
    try {
      this.setState({ isLoading: true })
      const response = await apiClient.register(userData)

      apiClient.setToken(response.token)
      this.setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })

      return response
    } catch (error) {
      this.setState({ isLoading: false })
      throw error
    }
  }

  logout() {
    apiClient.clearToken()
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  hasPermission(permission: string): boolean {
    return this.state.user?.permissions?.[permission] || false
  }

  hasRole(role: string): boolean {
    return this.state.user?.role === role
  }
}

export const authService = new AuthService()
export default authService
