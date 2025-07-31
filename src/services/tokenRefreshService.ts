import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Session } from '@supabase/auth-js'
import type { TokenRefreshService, RefreshResult, AuthError } from '../types/services'
import type { AuthErrorType } from '../types/auth'
import { TOKEN_REFRESH, AUTH_ERROR_TYPES, PERFORMANCE } from '../constants/auth'
import { createAuthError } from '../utils/typeGuards'

/**
 * Token Refresh Service Implementation
 * 
 * Handles automatic token refresh with proactive scheduling, retry logic,
 * and secure session state management. Integrates with Supabase auth system.
 */
export class TokenRefreshServiceImpl implements TokenRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null
  private isCurrentlyRefreshing = false
  private refreshPromise: Promise<RefreshResult> | null = null
  private eventListeners: Map<string, ((event: any) => void)[]> = new Map()
  private supabase = createClientComponentClient()
  
  // Configuration
  private readonly config: {
    thresholdMinutes: number
    maxRetryAttempts: number
    baseRetryDelay: number
    maxRetryDelay: number
    exponentialBackoffFactor: number
    refreshBuffer: number
  }

  constructor(config?: Partial<{
    thresholdMinutes: number
    maxRetryAttempts: number
    baseRetryDelay: number
    maxRetryDelay: number
    exponentialBackoffFactor: number
    refreshBuffer: number
  }>) {
    this.config = {
      thresholdMinutes: TOKEN_REFRESH.DEFAULT_THRESHOLD_MINUTES,
      maxRetryAttempts: TOKEN_REFRESH.MAX_RETRY_ATTEMPTS,
      baseRetryDelay: TOKEN_REFRESH.BASE_RETRY_DELAY_MS,
      maxRetryDelay: TOKEN_REFRESH.MAX_RETRY_DELAY_MS,
      exponentialBackoffFactor: TOKEN_REFRESH.EXPONENTIAL_BACKOFF_FACTOR,
      refreshBuffer: PERFORMANCE.TOKEN_REFRESH_BUFFER_MS,
      ...config
    }
  }

  /**
   * Attempts to refresh the current authentication token
   */
  async refreshToken(): Promise<RefreshResult> {
    // If already refreshing, return the existing promise
    if (this.isCurrentlyRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    // Start new refresh process
    this.isCurrentlyRefreshing = true
    this.refreshPromise = this.performRefreshWithRetry()

    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.isCurrentlyRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * Schedules automatic token refresh before expiration
   */
  scheduleRefresh(expiresAt: number): void {
    this.clearRefreshTimer()

    const now = Date.now()
    const expirationTime = expiresAt * 1000 // Convert to milliseconds
    const thresholdTime = this.config.thresholdMinutes * 60 * 1000
    const refreshTime = expirationTime - thresholdTime - this.config.refreshBuffer

    // Don't schedule if token expires too soon
    if (refreshTime <= now) {
      this.emitEvent('refresh_needed_immediately', { expiresAt, now })
      return
    }

    const delay = refreshTime - now
    
    this.refreshTimer = setTimeout(async () => {
      try {
        this.emitEvent('scheduled_refresh_started', { expiresAt })
        const result = await this.refreshToken()
        
        if (result.success && result.newSession) {
          this.emitEvent('scheduled_refresh_success', { 
            newExpiresAt: result.newSession.expires_at 
          })
          // Schedule next refresh
          if (result.newSession.expires_at) {
            this.scheduleRefresh(result.newSession.expires_at)
          }
        } else {
          this.emitEvent('scheduled_refresh_failed', { 
            error: result.error,
            expiresAt 
          })
        }
      } catch (error) {
        this.emitEvent('scheduled_refresh_error', { error, expiresAt })
      }
    }, delay)

    this.emitEvent('refresh_scheduled', { 
      expiresAt, 
      refreshTime: new Date(refreshTime),
      delay 
    })
  }

  /**
   * Clears any scheduled refresh timers
   */
  clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
      this.emitEvent('refresh_timer_cleared', {})
    }
  }

  /**
   * Checks if a token refresh is currently in progress
   */
  isRefreshing(): boolean {
    return this.isCurrentlyRefreshing
  }

  /**
   * Gets the time until next scheduled refresh
   */
  getTimeUntilRefresh(): number | null {
    if (!this.refreshTimer) {
      return null
    }

    // Note: This is an approximation since we can't get exact timer remaining time
    // In a production environment, you might want to store the scheduled time
    return null
  }

  /**
   * Adds an event listener for authentication state changes
   */
  addEventListener(event: string, listener: (event: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(listener)
  }

  /**
   * Removes an event listener
   */
  removeEventListener(event: string, listener: (event: any) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Cleans up all timers and listeners
   */
  cleanup(): void {
    this.clearRefreshTimer()
    this.eventListeners.clear()
    this.isCurrentlyRefreshing = false
    this.refreshPromise = null
  }

  /**
   * Performs token refresh with retry logic and exponential backoff
   */
  private async performRefreshWithRetry(): Promise<RefreshResult> {
    let lastError: AuthError | null = null
    
    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        this.emitEvent('refresh_attempt_started', { attempt })
        
        const result = await this.performSingleRefresh()
        
        if (result.success) {
          this.emitEvent('refresh_attempt_success', { attempt, result })
          return result
        }

        lastError = result.error || createAuthError(
          AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED,
          'Token refresh failed without specific error'
        )

        this.emitEvent('refresh_attempt_failed', { 
          attempt, 
          error: lastError,
          willRetry: attempt < this.config.maxRetryAttempts 
        })

        // Don't retry for certain error types
        if (lastError && !this.shouldRetryError(lastError)) {
          break
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.config.maxRetryAttempts) {
          const delay = this.calculateRetryDelay(attempt)
          await this.sleep(delay)
        }

      } catch (error) {
        lastError = createAuthError(
          AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED,
          error instanceof Error ? error.message : 'Unknown refresh error'
        )
        
        this.emitEvent('refresh_attempt_error', { 
          attempt, 
          error: lastError,
          willRetry: attempt < this.config.maxRetryAttempts 
        })

        if (attempt === this.config.maxRetryAttempts) {
          break
        }

        const delay = this.calculateRetryDelay(attempt)
        await this.sleep(delay)
      }
    }

    // All attempts failed
    const finalError = lastError || createAuthError(
      AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED,
      'All refresh attempts failed'
    )

    this.emitEvent('refresh_failed_final', { error: finalError })

    return {
      success: false,
      error: finalError
    }
  }

  /**
   * Performs a single token refresh attempt
   */
  private async performSingleRefresh(): Promise<RefreshResult> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()

      if (error) {
        const authError = this.mapSupabaseError(error)
        return {
          success: false,
          error: authError
        }
      }

      if (!data.session) {
        return {
          success: false,
          error: createAuthError(
            AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED,
            'No session returned from refresh'
          )
        }
      }

      return {
        success: true,
        newSession: data.session
      }

    } catch (error) {
      return {
        success: false,
        error: createAuthError(
          AUTH_ERROR_TYPES.NETWORK_ERROR,
          error instanceof Error ? error.message : 'Network error during refresh'
        )
      }
    }
  }

  /**
   * Maps Supabase auth errors to our AuthError type
   */
  private mapSupabaseError(error: any): AuthError {
    // Map common Supabase auth error messages to our error types
    const message = error.message?.toLowerCase() || ''
    
    if (message.includes('refresh_token_not_found') || 
        message.includes('invalid_refresh_token')) {
      return createAuthError(AUTH_ERROR_TYPES.INVALID_REFRESH_TOKEN, error.message)
    }
    
    if (message.includes('token_expired') || 
        message.includes('jwt expired')) {
      return createAuthError(AUTH_ERROR_TYPES.TOKEN_EXPIRED, error.message)
    }
    
    if (message.includes('network') || 
        message.includes('fetch')) {
      return createAuthError(AUTH_ERROR_TYPES.NETWORK_ERROR, error.message)
    }

    // Default to token refresh failed
    return createAuthError(AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED, error.message)
  }

  /**
   * Determines if an error should trigger a retry
   */
  private shouldRetryError(error: AuthError): boolean {
    // Don't retry for these error types
    const nonRetryableErrors: AuthErrorType[] = [
      AUTH_ERROR_TYPES.INVALID_REFRESH_TOKEN,
      AUTH_ERROR_TYPES.ACCOUNT_DISABLED,
      AUTH_ERROR_TYPES.ACCOUNT_NOT_FOUND
    ]

    return !nonRetryableErrors.includes(error.type)
  }

  /**
   * Calculates retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = this.config.baseRetryDelay * 
      Math.pow(this.config.exponentialBackoffFactor, attempt - 1)
    
    const cappedDelay = Math.min(exponentialDelay, this.config.maxRetryDelay)
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000 // 0-1000ms jitter
    
    return cappedDelay + jitter
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Emits events to registered listeners
   */
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener({ type: eventType, data, timestamp: new Date() })
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error)
        }
      })
    }
  }
}

// Factory function for creating token refresh service
export function createTokenRefreshService(
  config?: Partial<{
    thresholdMinutes: number
    maxRetryAttempts: number
    baseRetryDelay: number
    maxRetryDelay: number
    exponentialBackoffFactor: number
    refreshBuffer: number
  }>
): TokenRefreshService {
  return new TokenRefreshServiceImpl(config)
}

// Default instance for convenience
export const defaultTokenRefreshService = createTokenRefreshService()

// Export the service implementation
export { TokenRefreshServiceImpl as TokenRefreshService }