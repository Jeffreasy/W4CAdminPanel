'use client'

import React from 'react'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/auth-js'

// Import enhanced types and services
import type { 
  AuthContextType, 
  SignInResult, 
  AuthError, 
  RateLimitInfo,
  SupabaseUserProfile 
} from '../types/auth'
import { 
  defaultTokenRefreshService,
  rateLimitService,
  defaultErrorHandlerService,
  defaultLoggerService
} from '../services'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<SupabaseUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<AuthError | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Helper methods for role-based access control
  const isAdmin = user?.user_metadata?.role === 'admin' || userProfile?.is_super_admin === true
  const isSuperAdmin = userProfile?.is_super_admin === true

  // Fetch user profile data from Supabase
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data as SupabaseUserProfile
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }, [supabase])

  // Clear error state
  const clearError = useCallback(() => {
    setAuthError(null)
    setRateLimitInfo(null)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        // Fetch user profile if user exists
        if (user) {
          const profile = await fetchUserProfile(user.id)
          setUserProfile(profile)
        } else {
          setUserProfile(null)
        }
      } catch (error) {
        console.error('Error getting user:', error)
        const authError: AuthError = {
          name: 'AuthError',
          message: 'Failed to get user session',
          type: 'session_expired'
        }
        setAuthError(authError)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        // Fetch user profile when user changes
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setUserProfile(profile)
        } else {
          setUserProfile(null)
        }
        
        setIsLoading(false)
        
        // Clear errors on successful auth state change
        if (session?.user) {
          clearError()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, fetchUserProfile, clearError])

  // Token refresh integration
  useEffect(() => {
    if (!user) {
      // Clear any existing refresh timers when user logs out
      defaultTokenRefreshService.clearRefreshTimer()
      return
    }

    // Get current session to check expiration
    const getSessionAndScheduleRefresh = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.expires_at) {
          // Schedule refresh 5 minutes before expiration
          const expiresAt = session.expires_at * 1000 // Convert to milliseconds
          defaultTokenRefreshService.scheduleRefresh(expiresAt)
        }
      } catch (error) {
        console.error('Error getting session for token refresh:', error)
      }
    }

    getSessionAndScheduleRefresh()

    // Clean up on unmount or user change
    return () => {
      defaultTokenRefreshService.clearRefreshTimer()
    }
  }, [user, supabase])

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    // Clear previous errors
    clearError()
    setIsLoading(true)

    try {
      // Get client IP for rate limiting (fallback to email if IP not available)
      const identifier = email // In a real app, you'd get the IP from headers

      // Check rate limiting first
      const rateLimitResult = await rateLimitService.checkLimit(identifier)
      if (!rateLimitResult.allowed) {
        const rateLimitError = defaultErrorHandlerService.handleRateLimitError(rateLimitResult)
        const authError: AuthError = {
          name: 'RateLimitError',
          message: rateLimitError.message,
          type: 'rate_limited'
        }
        
        setAuthError(authError)
        setRateLimitInfo({
          allowed: false,
          remainingAttempts: rateLimitResult.remainingAttempts,
          resetTime: rateLimitResult.resetTime,
          waitTime: rateLimitResult.waitTime,
          isBlocked: true
        })

        // Log the rate limit hit
        await defaultLoggerService.logAuthEvent({
          event_type: 'rate_limit_hit',
          email_attempted: email,
          success: false,
          failure_reason: 'Rate limit exceeded',
          rate_limit_info: {
            attempts: rateLimitResult.remainingAttempts,
            reset_time: rateLimitResult.resetTime || new Date()
          }
        })

        return {
          success: false,
          error: authError,
          rateLimited: true,
          waitTime: rateLimitResult.waitTime
        }
      }

      // Attempt authentication with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Record failed attempt
        await rateLimitService.recordAttempt(identifier, false)
        
        // Handle authentication error
        const authError: AuthError = {
          name: 'AuthError',
          message: error.message,
          type: 'invalid_credentials'
        }
        
        const userFriendlyError = defaultErrorHandlerService.handleAuthError(authError)
        const enhancedError: AuthError = {
          ...authError,
          message: userFriendlyError.message
        }
        
        setAuthError(enhancedError)

        // Log the failed attempt
        await defaultLoggerService.logAuthEvent({
          event_type: 'login_attempt',
          email_attempted: email,
          success: false,
          failure_reason: error.message
        })

        return {
          success: false,
          error: enhancedError
        }
      }

      // Authentication successful
      const user = data.user
      if (!user) {
        throw new Error('No user returned from successful authentication')
      }

      // Record successful attempt and reset rate limits
      await rateLimitService.recordAttempt(identifier, true)
      await rateLimitService.resetLimit(identifier)

      // Update user state immediately (optimistic update)
      setUser(user)
      
      // Fetch user profile
      const profile = await fetchUserProfile(user.id)
      setUserProfile(profile)

      // Log successful login
      await defaultLoggerService.logAuthEvent({
        event_type: 'login_success',
        email_attempted: email,
        user_id: user.id,
        success: true
      })

      // Navigate to dashboard
      router.push('/dashboard')
      router.refresh()

      return {
        success: true
      }

    } catch (error: any) {
      console.error('Sign in error:', error)
      
      const authError: AuthError = {
        name: 'AuthError',
        message: error.message || 'Unknown sign-in error',
        type: 'server_error'
      }
      
      const userFriendlyError = defaultErrorHandlerService.handleAuthError(authError)
      const enhancedError: AuthError = {
        ...authError,
        message: userFriendlyError.message
      }
      
      setAuthError(enhancedError)

      // Log the error
      await defaultLoggerService.logAuthEvent({
        event_type: 'login_attempt',
        email_attempted: email,
        success: false,
        failure_reason: error.message || 'Unknown error'
      })

      return {
        success: false,
        error: enhancedError
      }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      // Log logout event
      if (user) {
        await defaultLoggerService.logAuthEvent({
          event_type: 'logout',
          user_id: user.id,
          success: true
        })
      }

      // Clear token refresh timers
      defaultTokenRefreshService.clearRefreshTimer()

      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear local state
      setUser(null)
      setUserProfile(null)
      clearError()
      
      // Navigate to home
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
      // Even if logging fails, continue with sign out
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
      clearError()
      router.push('/')
      router.refresh()
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    isLoading,
    authError,
    rateLimitInfo,
    isAdmin,
    isSuperAdmin,
    signIn,
    signOut,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 