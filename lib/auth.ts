import { apiClient } from "./api"
import { sql } from '@vercel/postgres';
import { CacheService } from './kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SESSION_TTL = 86400; // 24 hours in seconds
const PASSWORD_MIN_LENGTH = 8;
const LOGIN_RATE_LIMIT = 5; // 5 attempts
const LOGIN_RATE_WINDOW = 300; // 5 minutes in seconds

// Types
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

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, boolean>;
  mfa_enabled?: boolean;
  mfa_verified?: boolean;
}

// Server-side authentication functions
export async function authenticateUser(email: string, password: string) {
  try {
    // Check rate limiting
    const ipKey = `ratelimit:login:${email}`;
    const withinLimit = await CacheService.rateLimit(ipKey, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW);
    
    if (!withinLimit) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    // Query user from database
    const { rows } = await sql`
      SELECT id, email, password_hash, name, role, permissions, mfa_enabled
      FROM users 
      WHERE email = ${email} AND is_active = true
    `;

    if (rows.length === 0) {
      // Use constant-time comparison to prevent timing attacks
      // Even though we didn't find a user, we still do a password comparison
      // with a dummy hash to ensure consistent timing
      await comparePasswords(password, '$2a$10$DUMMY_HASH_FOR_TIMING_ATTACK_PREVENTION');
      throw new Error('Invalid credentials');
    }

    const user = rows[0];
    const isValid = await comparePasswords(password, user.password_hash);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      mfa_enabled: user.mfa_enabled || false,
      mfa_verified: false
    };

    // Store in KV with 24 hour expiry
    await CacheService.setSession(sessionId, sessionData, SESSION_TTL);

    // Create JWT token
    const token = jwt.sign(
      { sessionId, userId: user.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { 
      token, 
      user: sessionData,
      requiresMfa: user.mfa_enabled && !sessionData.mfa_verified
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

export async function validateSession(token: string) {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (!decoded || !decoded.sessionId) {
      throw new Error('Invalid token');
    }
    
    // Get session from KV store
    const sessionData = await CacheService.getSession<SessionData>(decoded.sessionId);
    
    if (!sessionData) {
      throw new Error('Session expired');
    }

    // If MFA is enabled but not verified, require MFA verification
    if (sessionData.mfa_enabled && !sessionData.mfa_verified) {
      return { 
        isValid: false, 
        requiresMfa: true,
        sessionId: decoded.sessionId
      };
    }

    return { 
      isValid: true, 
      user: sessionData,
      sessionId: decoded.sessionId
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { isValid: false };
  }
}

export async function refreshSession(sessionId: string) {
  try {
    // Get current session
    const sessionData = await CacheService.getSession<SessionData>(sessionId);
    
    if (!sessionData) {
      throw new Error('Session not found');
    }

    // Extend session TTL
    await CacheService.setSession(sessionId, sessionData, SESSION_TTL);

    // Create new JWT token
    const token = jwt.sign(
      { sessionId, userId: sessionData.userId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { token, user: sessionData };
  } catch (error) {
    console.error('Session refresh error:', error);
    throw error;
  }
}

export async function revokeSession(sessionId: string) {
  try {
    await CacheService.deleteSession(sessionId);
    return { success: true };
  } catch (error) {
    console.error('Session revocation error:', error);
    throw error;
  }
}

export async function verifyMfaCode(sessionId: string, code: string) {
  try {
    // Get session
    const sessionData = await CacheService.getSession<SessionData>(sessionId);
    
    if (!sessionData) {
      throw new Error('Session not found');
    }

    // In a real implementation, you would verify the MFA code here
    // For this example, we'll just check if the code is '123456'
    const isValidCode = code === '123456';
    
    if (!isValidCode) {
      throw new Error('Invalid MFA code');
    }

    // Update session with MFA verified
    sessionData.mfa_verified = true;
    await CacheService.setSession(sessionId, sessionData, SESSION_TTL);

    // Create new JWT token
    const token = jwt.sign(
      { sessionId, userId: sessionData.userId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { token, user: sessionData };
  } catch (error) {
    console.error('MFA verification error:', error);
    throw error;
  }
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` 
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one uppercase letter' 
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one lowercase letter' 
    };
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one number' 
    };
  }

  // Check for at least one special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one special character' 
    };
  }

  return { isValid: true };
}

// Client-side authentication service
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