import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useRouter } from 'next/navigation'

import { AuthProvider, useAuth } from '../AuthContext'
import type { User } from '@supabase/auth-js'
import type { SupabaseUserProfile } from '../../types/supabase'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

// Hoist mockSupabaseClient
const mockSupabaseClient = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}))

// Mock Supabase client
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: vi.fn(() => mockSupabaseClient)
}))

// Hoist mock services
const mockTokenRefreshService = vi.hoisted(() => ({
  refreshToken: vi.fn(),
  scheduleRefresh: vi.fn(),
  clearRefreshTimer: vi.fn(),
  isRefreshing: vi.fn(() => false),
  getTimeUntilRefresh: vi.fn(() => null)
}))

const mockRateLimitService = vi.hoisted(() => ({
  checkLimit: vi.fn(),
  recordAttempt: vi.fn(),
  resetLimit: vi.fn(),
  getStatus: vi.fn(),
  cleanup: vi.fn()
}))

const mockErrorHandlerService = vi.hoisted(() => ({
  handleAuthError: vi.fn(),
  handleRateLimitError: vi.fn(),
  logError: vi.fn(),
  categorizeError: vi.fn(),
  shouldRetry: vi.fn()
}))

const mockLoggerService = vi.hoisted(() => ({
  logAuthEvent: vi.fn(),
  logSecurityEvent: vi.fn(),
  logPerformanceMetric: vi.fn(),
  logError: vi.fn(),
  sanitizeData: vi.fn(),
  getAuthLogs: vi.fn()
}))

// Mock services
vi.mock('../../services', () => ({
  defaultTokenRefreshService: mockTokenRefreshService,
  rateLimitService: mockRateLimitService,
  defaultErrorHandlerService: mockErrorHandlerService,
  defaultLoggerService: mockLoggerService
}))

// Test component that uses the auth context
const TestComponent = () => {
  const { 
    user, 
    userProfile, 
    isLoading, 
    authError, 
    rateLimitInfo, 
    isAdmin, 
    isSuperAdmin, 
    signIn, 
    signOut, 
    clearError 
  } = useAuth()

  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="user-profile">{userProfile ? 'Has profile' : 'No profile'}</div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="auth-error">{authError ? authError.message : 'No error'}</div>
      <div data-testid="rate-limit">{rateLimitInfo ? 'Rate limited' : 'Not rate limited'}</div>
      <div data-testid="is-admin">{isAdmin ? 'Is admin' : 'Not admin'}</div>
      <div data-testid="is-super-admin">{isSuperAdmin ? 'Is super admin' : 'Not super admin'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={signOut}>Sign Out</button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  )
}

describe('AuthContext Integration Tests', () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn()
  }

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    user_metadata: { role: 'admin' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2023-01-01T00:00:00Z'
  }

  const mockUserProfile: SupabaseUserProfile = {
    id: '123',
    is_super_admin: true,
    created_at: '2023-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue(mockRouter)
    
    // Default mock implementations
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null } })
    mockSupabaseClient.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      }))
    })

    mockRateLimitService.checkLimit.mockResolvedValue({
      allowed: true,
      remainingAttempts: 5,
      resetTime: undefined,
      waitTime: undefined
    })
    mockRateLimitService.recordAttempt.mockResolvedValue(undefined)
    mockRateLimitService.resetLimit.mockResolvedValue(undefined)

    mockErrorHandlerService.handleAuthError.mockReturnValue({
      message: 'Authentication failed',
      canRetry: true
    })
    mockErrorHandlerService.handleRateLimitError.mockReturnValue({
      message: 'Too many attempts',
      canRetry: false,
      retryAfter: 300
    })

    mockLoggerService.logAuthEvent.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with no user and loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('user')).toHaveTextContent('No user')
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
  })

  it('should load user and profile data on initialization', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null })
        }))
      }))
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('user-profile')).toHaveTextContent('Has profile')
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      expect(screen.getByTestId('is-admin')).toHaveTextContent('Is admin')
      expect(screen.getByTestId('is-super-admin')).toHaveTextContent('Is super admin')
    })
  })

  it('should handle successful sign in with rate limiting check', async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null })
        }))
      }))
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signInButton = screen.getByText('Sign In')
    await act(async () => {
      await userEvent.click(signInButton)
    })

    await waitFor(() => {
      expect(mockRateLimitService.checkLimit).toHaveBeenCalledWith('test@example.com')
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
      expect(mockRateLimitService.recordAttempt).toHaveBeenCalledWith('test@example.com', true)
      expect(mockRateLimitService.resetLimit).toHaveBeenCalledWith('test@example.com')
      expect(mockLoggerService.logAuthEvent).toHaveBeenCalledWith({
        event_type: 'login_success',
        email_attempted: 'test@example.com',
        user_id: '123',
        success: true
      })
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should handle rate limiting during sign in', async () => {
    mockRateLimitService.checkLimit.mockResolvedValue({
      allowed: false,
      remainingAttempts: 0,
      resetTime: new Date(Date.now() + 300000),
      waitTime: 300
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signInButton = screen.getByText('Sign In')
    await act(async () => {
      await userEvent.click(signInButton)
    })

    await waitFor(() => {
      expect(mockRateLimitService.checkLimit).toHaveBeenCalledWith('test@example.com')
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
      expect(screen.getByTestId('rate-limit')).toHaveTextContent('Rate limited')
      expect(mockLoggerService.logAuthEvent).toHaveBeenCalledWith({
        event_type: 'rate_limit_hit',
        email_attempted: 'test@example.com',
        success: false,
        failure_reason: 'Rate limit exceeded',
        rate_limit_info: {
          attempts: 0,
          reset_time: expect.any(Date)
        }
      })
    })
  })

  it('should handle authentication errors with user-friendly messages', async () => {
    const authError = new Error('Invalid credentials')
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: authError
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signInButton = screen.getByText('Sign In')
    await act(async () => {
      await userEvent.click(signInButton)
    })

    await waitFor(() => {
      expect(mockRateLimitService.recordAttempt).toHaveBeenCalledWith('test@example.com', false)
      expect(mockErrorHandlerService.handleAuthError).toHaveBeenCalled()
      expect(screen.getByTestId('auth-error')).toHaveTextContent('Authentication failed')
      expect(mockLoggerService.logAuthEvent).toHaveBeenCalledWith({
        event_type: 'login_attempt',
        email_attempted: 'test@example.com',
        success: false,
        failure_reason: 'Invalid credentials'
      })
    })
  })

  it('should handle sign out with logging', async () => {
    // Set up initial user state
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    const signOutButton = screen.getByText('Sign Out')
    await act(async () => {
      await userEvent.click(signOutButton)
    })

    await waitFor(() => {
      expect(mockLoggerService.logAuthEvent).toHaveBeenCalledWith({
        event_type: 'logout',
        user_id: '123',
        success: true
      })
      expect(mockTokenRefreshService.clearRefreshTimer).toHaveBeenCalled()
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('should schedule token refresh when user is authenticated', async () => {
    const mockSession = {
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      user: mockUser
    }

    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    mockSupabaseClient.auth.getSession.mockResolvedValue({ data: { session: mockSession } })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockTokenRefreshService.scheduleRefresh).toHaveBeenCalledWith(mockSession.expires_at)
    })
  })

  it('should clear errors when clearError is called', async () => {
    // Set up error state first
    mockRateLimitService.checkLimit.mockResolvedValue({
      allowed: false,
      remainingAttempts: 0,
      resetTime: new Date(Date.now() + 300000),
      waitTime: 300
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Trigger rate limit error
    const signInButton = screen.getByText('Sign In')
    await act(async () => {
      await userEvent.click(signInButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('rate-limit')).toHaveTextContent('Rate limited')
    })

    // Clear the error
    const clearErrorButton = screen.getByText('Clear Error')
    await act(async () => {
      await userEvent.click(clearErrorButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-error')).toHaveTextContent('No error')
      expect(screen.getByTestId('rate-limit')).toHaveTextContent('Not rate limited')
    })
  })

  it('should handle auth state changes and update user profile', async () => {
    let authStateCallback: any = null
    
    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null })
        }))
      }))
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
    })

    // Simulate auth state change
    await act(async () => {
      if (authStateCallback) {
        await authStateCallback('SIGNED_IN', { user: mockUser })
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('user-profile')).toHaveTextContent('Has profile')
    })
  })
})