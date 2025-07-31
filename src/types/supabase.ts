// Supabase Integration Types
// These types match the existing database schema

export interface SupabaseUser {
  id: string // UUID format like "968f5317-f0ba-4c5f-86f2-71612af0cc43"
  email: string
  role: 'admin' | 'editor'
  created_at: string
  updated_at: string
}

export interface SupabaseUserProfile {
  id: string // Same as user ID
  is_super_admin: boolean
  created_at: string
}

// Database table interfaces for authentication logging
export interface LoginAttemptRecord {
  id?: string
  email_attempted: string
  is_successful: boolean
  failure_reason?: string | null
  user_id?: string | null
  ip_address: string
  user_agent?: string | null
  created_at?: string
  rate_limit_info?: {
    attempts: number
    reset_time: string
  } | null
  security_flags?: string[] | null
}

// Enhanced authentication event log for future implementation
export interface AuthEventRecord {
  id?: string
  timestamp?: string
  event_type: 'login_attempt' | 'login_success' | 'logout' | 'token_refresh' | 'rate_limit_hit' | 'session_expired' | 'password_reset_request'
  email_attempted?: string | null
  user_id?: string | null
  ip_address: string
  user_agent?: string | null
  success: boolean
  failure_reason?: string | null
  rate_limit_info?: {
    attempts: number
    reset_time: string
  } | null
  security_flags?: string[] | null
  created_at?: string
}

// Rate limiting storage interface for database
export interface RateLimitRecord {
  id?: string
  identifier: string // IP or email
  attempts: number
  first_attempt: string
  last_attempt: string
  reset_time: string
  is_blocked: boolean
  created_at?: string
  updated_at?: string
}

// Supabase client configuration
export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string // Only for server-side operations
}

// Database query helpers
export interface DatabaseQueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  ascending?: boolean
}

// User profile with role information
export interface EnhancedUserProfile extends SupabaseUserProfile {
  user: SupabaseUser
  isAdmin: boolean
  isSuperAdmin: boolean
}

// Authentication session data from Supabase
export interface SupabaseSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: SupabaseUser
}