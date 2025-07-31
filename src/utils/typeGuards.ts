// Type guards and validation utilities for Enhanced Authentication System

import type { 
  AuthError, 
  AuthEventType, 
  AuthErrorType,
  RateLimitResult,
  RefreshResult
} from '../types/auth'

import type {
  SupabaseUser,
  SupabaseUserProfile,
  LoginAttemptRecord,
  AuthEventRecord
} from '../types/supabase'
import { AUTH_EVENTS, AUTH_ERROR_TYPES } from '../constants/auth'

// Type Guards for Authentication Types
export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    typeof (error as AuthError).type === 'string' &&
    typeof (error as AuthError).message === 'string'
  )
}

export function isAuthEventType(value: unknown): value is AuthEventType {
  return typeof value === 'string' && Object.values(AUTH_EVENTS).includes(value as AuthEventType)
}

export function isAuthErrorType(value: unknown): value is AuthErrorType {
  return typeof value === 'string' && Object.values(AUTH_ERROR_TYPES).includes(value as AuthErrorType)
}

export function isRateLimitResult(value: unknown): value is RateLimitResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'allowed' in value &&
    'remainingAttempts' in value &&
    typeof (value as RateLimitResult).allowed === 'boolean' &&
    typeof (value as RateLimitResult).remainingAttempts === 'number'
  )
}

export function isRefreshResult(value: unknown): value is RefreshResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as RefreshResult).success === 'boolean'
  )
}

export function isSupabaseUser(value: unknown): value is SupabaseUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'role' in value &&
    typeof (value as SupabaseUser).id === 'string' &&
    typeof (value as SupabaseUser).email === 'string' &&
    ['admin', 'editor'].includes((value as SupabaseUser).role)
  )
}

export function isSupabaseUserProfile(value: unknown): value is SupabaseUserProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'is_super_admin' in value &&
    typeof (value as SupabaseUserProfile).id === 'string' &&
    typeof (value as SupabaseUserProfile).is_super_admin === 'boolean'
  )
}

// Validation Functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateLoginAttemptRecord(record: unknown): record is LoginAttemptRecord {
  if (typeof record !== 'object' || record === null) {
    return false
  }
  
  const r = record as LoginAttemptRecord
  
  return (
    typeof r.email_attempted === 'string' &&
    typeof r.is_successful === 'boolean' &&
    typeof r.ip_address === 'string' &&
    validateEmail(r.email_attempted)
  )
}

export function validateAuthEventRecord(record: unknown): record is AuthEventRecord {
  if (typeof record !== 'object' || record === null) {
    return false
  }
  
  const r = record as AuthEventRecord
  
  return (
    isAuthEventType(r.event_type) &&
    typeof r.ip_address === 'string' &&
    typeof r.success === 'boolean'
  )
}

// Sanitization Functions
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function sanitizeIpAddress(ip: string): string {
  // Remove any potential injection attempts and normalize
  return ip.replace(/[^0-9a-fA-F:.]/g, '').substring(0, 45) // Max IPv6 length
}

export function sanitizeUserAgent(userAgent: string): string {
  // Limit length and remove potentially dangerous characters
  return userAgent.replace(/[<>\"']/g, '').substring(0, 500)
}

// Data Validation Helpers
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function isValidTimestamp(timestamp: unknown): boolean {
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp)
    return !isNaN(date.getTime())
  }
  
  if (typeof timestamp === 'number') {
    return timestamp > 0 && timestamp < Date.now() + (365 * 24 * 60 * 60 * 1000) // Within a year from now
  }
  
  return timestamp instanceof Date && !isNaN(timestamp.getTime())
}

export function isValidRole(role: unknown): role is 'admin' | 'editor' {
  return typeof role === 'string' && ['admin', 'editor'].includes(role)
}

// Error Validation
export function createAuthError(type: AuthErrorType, message: string, details?: Record<string, any>): AuthError {
  const error = new Error(message) as AuthError
  error.name = 'AuthError'
  error.type = type
  error.code = details?.code
  error.details = details || {}
  return error
}

export function isRetryableError(error: AuthError): boolean {
  const retryableTypes: AuthErrorType[] = [
    'network_error',
    'server_error',
    'token_refresh_failed'
  ]
  
  return retryableTypes.includes(error.type)
}

export function isSecurityError(error: AuthError): boolean {
  const securityTypes: AuthErrorType[] = [
    'invalid_credentials',
    'account_disabled',
    'rate_limited'
  ]
  
  return securityTypes.includes(error.type)
}