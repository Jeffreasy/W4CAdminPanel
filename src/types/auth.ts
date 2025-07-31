import type { User, Session } from '@supabase/auth-js'

// Authentication Events
export type AuthEventType = 
  | 'login_attempt' 
  | 'login_success' 
  | 'logout' 
  | 'token_refresh' 
  | 'rate_limit_hit'
  | 'session_expired'
  | 'password_reset_request'

export interface AuthEventLog {
  id: string
  timestamp: Date
  event_type: AuthEventType
  email_attempted?: string
  user_id?: string // References Supabase user IDs
  ip_address: string
  user_agent: string
  success: boolean
  failure_reason?: string
  rate_limit_info?: {
    attempts: number
    reset_time: Date
  }
  security_flags?: string[]
}

// Authentication Errors
export type AuthErrorType = 
  | 'invalid_credentials'
  | 'account_not_found'
  | 'account_disabled'
  | 'token_expired'
  | 'invalid_refresh_token'
  | 'token_refresh_failed'
  | 'rate_limited'
  | 'network_error'
  | 'server_error'
  | 'session_expired'

export interface AuthError extends Error {
  type: AuthErrorType
  code?: string
  details?: Record<string, any>
}

export interface UserFriendlyError {
  message: string
  canRetry: boolean
  retryAfter?: number // seconds
  actionRequired?: 'login' | 'wait' | 'contact_support'
}

// Enhanced Session Management
export interface EnhancedSession {
  user: User
  access_token: string
  refresh_token: string
  expires_at: number
  refresh_scheduled: boolean
  last_refresh: Date
}

export interface RefreshResult {
  success: boolean
  error?: AuthError
  newSession?: Session
}

// Authentication Context Types
export interface AuthContextType {
  user: User | null
  userProfile: SupabaseUserProfile | null
  isLoading: boolean
  authError: AuthError | null
  rateLimitInfo: RateLimitInfo | null
  isAdmin: boolean
  isSuperAdmin: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  clearError: () => void
}

export interface SignInResult {
  success: boolean
  error?: AuthError
  rateLimited?: boolean
  waitTime?: number
}

// Rate Limiting Types
export interface RateLimitInfo {
  allowed: boolean
  remainingAttempts: number
  resetTime?: Date
  waitTime?: number // seconds
  isBlocked: boolean
}

export interface RateLimitState {
  identifier: string // IP or email
  attempts: number
  first_attempt: Date
  last_attempt: Date
  reset_time: Date
  is_blocked: boolean
}

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  resetTime?: Date
  waitTime?: number // seconds
}

// Error Context for logging
export interface ErrorContext {
  userId?: string
  email?: string
  ipAddress?: string
  userAgent?: string
  route?: string
  timestamp: Date
  errorCategory?: string
  additionalData?: Record<string, any>
}

// Import Supabase types for integration
import type { SupabaseUserProfile } from './supabase'

// Re-export for convenience
export type { SupabaseUserProfile } from './supabase'