import type { RateLimitService, RateLimitResult } from '../types/services'
import type { RateLimitState } from '../types/auth'
import { RATE_LIMIT, AUTH_EVENTS } from '../constants/auth'

/**
 * Progressive Rate Limiting Service
 * 
 * Implements intelligent rate limiting with:
 * - Progressive delays for repeated failures
 * - IP and email-based tracking
 * - Automatic reset on successful authentication
 * - Bypass logic for password reset requests
 */
export class RateLimitServiceImpl implements RateLimitService {
  private rateLimitStore = new Map<string, RateLimitState>()
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanupTimer()
  }

  /**
   * Checks if a request is allowed based on current rate limits
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const state = this.rateLimitStore.get(identifier)
    
    if (!state) {
      return {
        allowed: true,
        remainingAttempts: RATE_LIMIT.DEFAULT_MAX_ATTEMPTS,
      }
    }

    const now = new Date()
    
    // Check if rate limit has expired
    if (now >= state.reset_time) {
      this.rateLimitStore.delete(identifier)
      return {
        allowed: true,
        remainingAttempts: RATE_LIMIT.DEFAULT_MAX_ATTEMPTS,
      }
    }

    // Check if currently blocked
    if (state.is_blocked) {
      const waitTime = Math.ceil((state.reset_time.getTime() - now.getTime()) / 1000)
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: state.reset_time,
        waitTime,
      }
    }

    // Check if max attempts reached
    if (state.attempts >= RATE_LIMIT.DEFAULT_MAX_ATTEMPTS) {
      // Block and set progressive delay
      const violationCount = state.attempts - RATE_LIMIT.DEFAULT_MAX_ATTEMPTS + 1
      const delayIndex = Math.min(violationCount - 1, RATE_LIMIT.PROGRESSIVE_DELAYS.length - 1)
      const delaySeconds = RATE_LIMIT.PROGRESSIVE_DELAYS[delayIndex]
      const resetTime = new Date(now.getTime() + delaySeconds * 1000)
      
      state.is_blocked = true
      state.reset_time = resetTime
      
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime,
        waitTime: delaySeconds,
      }
    }

    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT.DEFAULT_MAX_ATTEMPTS - state.attempts,
    }
  }

  /**
   * Records a login attempt and updates rate limit state
   */
  async recordAttempt(identifier: string, success: boolean): Promise<void> {
    const now = new Date()
    
    if (success) {
      // Reset rate limit on successful authentication
      await this.resetLimit(identifier)
      return
    }

    let state = this.rateLimitStore.get(identifier)
    
    if (!state) {
      // Create new rate limit state
      state = {
        identifier,
        attempts: 1,
        first_attempt: now,
        last_attempt: now,
        reset_time: new Date(now.getTime() + RATE_LIMIT.DEFAULT_WINDOW_MS),
        is_blocked: false,
      }
    } else {
      // Update existing state
      state.attempts += 1
      state.last_attempt = now
      
      // Apply progressive delay when attempts exceed max
      if (state.attempts >= RATE_LIMIT.DEFAULT_MAX_ATTEMPTS) {
        const violationCount = state.attempts - RATE_LIMIT.DEFAULT_MAX_ATTEMPTS + 1
        const delayIndex = Math.min(violationCount - 1, RATE_LIMIT.PROGRESSIVE_DELAYS.length - 1)
        const delaySeconds = RATE_LIMIT.PROGRESSIVE_DELAYS[delayIndex]
        state.reset_time = new Date(now.getTime() + delaySeconds * 1000)
        state.is_blocked = true
      }
    }
    
    this.rateLimitStore.set(identifier, state)
  }

  /**
   * Resets rate limit counter for successful authentication
   */
  async resetLimit(identifier: string): Promise<void> {
    this.rateLimitStore.delete(identifier)
  }

  /**
   * Gets current rate limit status for an identifier
   */
  async getStatus(identifier: string): Promise<RateLimitResult> {
    return this.checkLimit(identifier)
  }

  /**
   * Cleans up expired rate limit entries
   */
  async cleanup(): Promise<void> {
    const now = new Date()
    const expiredKeys: string[] = []
    
    this.rateLimitStore.forEach((state, key) => {
      if (now >= state.reset_time) {
        expiredKeys.push(key)
      }
    })
    
    for (const key of expiredKeys) {
      this.rateLimitStore.delete(key)
    }
  }

  /**
   * Checks if an identifier should bypass rate limiting (e.g., for password reset)
   */
  shouldBypassRateLimit(identifier: string, requestType: string): boolean {
    // Allow password reset requests to bypass rate limiting
    if (requestType === AUTH_EVENTS.PASSWORD_RESET_REQUEST) {
      return true
    }
    
    // Could add other bypass logic here (e.g., for admin users, trusted IPs, etc.)
    return false
  }

  /**
   * Gets rate limit statistics for monitoring
   */
  getStatistics(): {
    totalTrackedIdentifiers: number
    blockedIdentifiers: number
    averageAttempts: number
  } {
    const states: RateLimitState[] = []
    this.rateLimitStore.forEach((state) => {
      states.push(state)
    })
    
    const blockedCount = states.filter(state => state.is_blocked).length
    const totalAttempts = states.reduce((sum, state) => sum + state.attempts, 0)
    
    return {
      totalTrackedIdentifiers: states.length,
      blockedIdentifiers: blockedCount,
      averageAttempts: states.length > 0 ? totalAttempts / states.length : 0,
    }
  }

  /**
   * Manually blocks an identifier (for security purposes)
   */
  async blockIdentifier(identifier: string, durationSeconds: number): Promise<void> {
    const now = new Date()
    const resetTime = new Date(now.getTime() + durationSeconds * 1000)
    
    const state: RateLimitState = {
      identifier,
      attempts: RATE_LIMIT.DEFAULT_MAX_ATTEMPTS + 1,
      first_attempt: now,
      last_attempt: now,
      reset_time: resetTime,
      is_blocked: true,
    }
    
    this.rateLimitStore.set(identifier, state)
  }

  /**
   * Starts the cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(console.error)
    }, RATE_LIMIT.CLEANUP_INTERVAL_MS)
  }

  /**
   * Stops the cleanup timer (for testing or shutdown)
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Clears all rate limit data (for testing)
   */
  clearAll(): void {
    this.rateLimitStore.clear()
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitServiceImpl()