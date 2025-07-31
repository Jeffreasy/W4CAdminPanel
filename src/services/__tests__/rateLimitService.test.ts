import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimitServiceImpl } from '../rateLimitService'
import { RATE_LIMIT, AUTH_EVENTS } from '../../constants/auth'

describe('RateLimitService', () => {
  let service: RateLimitServiceImpl

  beforeEach(() => {
    service = new RateLimitServiceImpl()
    vi.useFakeTimers()
  })

  afterEach(() => {
    service.stopCleanupTimer()
    service.clearAll()
    vi.useRealTimers()
  })

  describe('checkLimit', () => {
    it('should allow requests for new identifiers', async () => {
      const result = await service.checkLimit('192.168.1.1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
      expect(result.resetTime).toBeUndefined()
      expect(result.waitTime).toBeUndefined()
    })

    it('should allow requests within attempt limit', async () => {
      // Record some failed attempts but stay under limit
      await service.recordAttempt('192.168.1.1', false)
      await service.recordAttempt('192.168.1.1', false)
      
      const result = await service.checkLimit('192.168.1.1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS - 2)
    })

    it('should block requests after max attempts exceeded', async () => {
      // Exceed max attempts
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt('192.168.1.1', false)
      }
      
      const result = await service.checkLimit('192.168.1.1')
      
      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
      expect(result.resetTime).toBeDefined()
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[0]) // First delay: 60 seconds
    })

    it('should apply progressive delays for repeated violations', async () => {
      // First violation - should get 60 second delay
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt('192.168.1.1', false)
      }
      
      let result = await service.checkLimit('192.168.1.1')
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[0]) // 60 seconds
      
      // Add more attempts to trigger longer delay
      await service.recordAttempt('192.168.1.1', false)
      result = await service.checkLimit('192.168.1.1')
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[1]) // 300 seconds
    })

    it('should reset after time window expires', async () => {
      // Block the identifier
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt('192.168.1.1', false)
      }
      
      // Fast forward past the reset time
      vi.advanceTimersByTime(RATE_LIMIT.PROGRESSIVE_DELAYS[0] * 1000 + 1000)
      
      const result = await service.checkLimit('192.168.1.1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
    })
  })

  describe('recordAttempt', () => {
    it('should reset rate limit on successful authentication', async () => {
      // Record some failed attempts
      await service.recordAttempt('192.168.1.1', false)
      await service.recordAttempt('192.168.1.1', false)
      
      // Successful attempt should reset
      await service.recordAttempt('192.168.1.1', true)
      
      const result = await service.checkLimit('192.168.1.1')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
    })

    it('should increment attempt counter on failed attempts', async () => {
      await service.recordAttempt('192.168.1.1', false)
      
      let result = await service.checkLimit('192.168.1.1')
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS - 1)
      
      await service.recordAttempt('192.168.1.1', false)
      
      result = await service.checkLimit('192.168.1.1')
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS - 2)
    })

    it('should block identifier after max attempts', async () => {
      // Record max attempts
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt('192.168.1.1', false)
      }
      
      const result = await service.checkLimit('192.168.1.1')
      expect(result.allowed).toBe(false)
    })

    it('should handle multiple identifiers independently', async () => {
      // Block first identifier
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt('192.168.1.1', false)
      }
      
      // Second identifier should still be allowed
      const result = await service.checkLimit('192.168.1.2')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
    })
  })

  describe('resetLimit', () => {
    it('should clear rate limit state for identifier', async () => {
      // Record some failed attempts
      await service.recordAttempt('192.168.1.1', false)
      await service.recordAttempt('192.168.1.1', false)
      
      // Reset the limit
      await service.resetLimit('192.168.1.1')
      
      const result = await service.checkLimit('192.168.1.1')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
    })

    it('should handle resetting non-existent identifier gracefully', async () => {
      await expect(service.resetLimit('non-existent')).resolves.not.toThrow()
    })
  })

  describe('getStatus', () => {
    it('should return same result as checkLimit', async () => {
      await service.recordAttempt('192.168.1.1', false)
      
      const checkResult = await service.checkLimit('192.168.1.1')
      const statusResult = await service.getStatus('192.168.1.1')
      
      expect(statusResult).toEqual(checkResult)
    })
  })

  describe('cleanup', () => {
    it('should remove expired rate limit entries', async () => {
      // Create rate limit entry
      await service.recordAttempt('192.168.1.1', false)
      
      // Fast forward past expiration
      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS + 1000)
      
      // Run cleanup
      await service.cleanup()
      
      // Should be cleaned up and allow new requests
      const result = await service.checkLimit('192.168.1.1')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
    })

    it('should not remove non-expired entries', async () => {
      await service.recordAttempt('192.168.1.1', false)
      
      // Run cleanup without advancing time
      await service.cleanup()
      
      const result = await service.checkLimit('192.168.1.1')
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS - 1)
    })
  })

  describe('shouldBypassRateLimit', () => {
    it('should bypass rate limiting for password reset requests', () => {
      const shouldBypass = service.shouldBypassRateLimit('192.168.1.1', AUTH_EVENTS.PASSWORD_RESET_REQUEST)
      expect(shouldBypass).toBe(true)
    })

    it('should not bypass rate limiting for login attempts', () => {
      const shouldBypass = service.shouldBypassRateLimit('192.168.1.1', AUTH_EVENTS.LOGIN_ATTEMPT)
      expect(shouldBypass).toBe(false)
    })

    it('should not bypass rate limiting for other request types', () => {
      const shouldBypass = service.shouldBypassRateLimit('192.168.1.1', 'unknown_request')
      expect(shouldBypass).toBe(false)
    })
  })

  describe('getStatistics', () => {
    it('should return correct statistics for empty state', () => {
      const stats = service.getStatistics()
      
      expect(stats.totalTrackedIdentifiers).toBe(0)
      expect(stats.blockedIdentifiers).toBe(0)
      expect(stats.averageAttempts).toBe(0)
    })

    it('should return correct statistics with tracked identifiers', async () => {
      // Add some attempts
      await service.recordAttempt('192.168.1.1', false)
      await service.recordAttempt('192.168.1.1', false)
      await service.recordAttempt('192.168.1.2', false)
      
      const stats = service.getStatistics()
      
      expect(stats.totalTrackedIdentifiers).toBe(2)
      expect(stats.blockedIdentifiers).toBe(0)
      expect(stats.averageAttempts).toBe(1.5) // (2 + 1) / 2
    })

    it('should count blocked identifiers correctly', async () => {
      // Block one identifier
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt('192.168.1.1', false)
      }
      
      // Add attempts to another identifier but don't block
      await service.recordAttempt('192.168.1.2', false)
      
      const stats = service.getStatistics()
      
      expect(stats.totalTrackedIdentifiers).toBe(2)
      expect(stats.blockedIdentifiers).toBe(1)
    })
  })

  describe('blockIdentifier', () => {
    it('should manually block an identifier for specified duration', async () => {
      await service.blockIdentifier('192.168.1.1', 300) // 5 minutes
      
      const result = await service.checkLimit('192.168.1.1')
      
      expect(result.allowed).toBe(false)
      expect(result.waitTime).toBe(300)
    })

    it('should unblock identifier after duration expires', async () => {
      await service.blockIdentifier('192.168.1.1', 60) // 1 minute
      
      // Fast forward past block duration
      vi.advanceTimersByTime(61 * 1000)
      
      const result = await service.checkLimit('192.168.1.1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('progressive delay algorithm', () => {
    it('should apply correct delays for multiple violations', async () => {
      const identifier = '192.168.1.1'
      
      // First violation - 60 seconds
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt(identifier, false)
      }
      let result = await service.checkLimit(identifier)
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[0])
      
      // Second violation - 300 seconds
      await service.recordAttempt(identifier, false)
      result = await service.checkLimit(identifier)
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[1])
      
      // Third violation - 900 seconds
      await service.recordAttempt(identifier, false)
      result = await service.checkLimit(identifier)
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[2])
      
      // Fourth violation - 1800 seconds
      await service.recordAttempt(identifier, false)
      result = await service.checkLimit(identifier)
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[3])
      
      // Fifth violation - 3600 seconds (max)
      await service.recordAttempt(identifier, false)
      result = await service.checkLimit(identifier)
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[4])
      
      // Further violations should stay at max delay
      await service.recordAttempt(identifier, false)
      result = await service.checkLimit(identifier)
      expect(result.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[4])
    })
  })

  describe('edge cases', () => {
    it('should handle concurrent requests for same identifier', async () => {
      const identifier = '192.168.1.1'
      
      // Simulate concurrent failed attempts
      const promises = Array(3).fill(null).map(() => 
        service.recordAttempt(identifier, false)
      )
      
      await Promise.all(promises)
      
      const result = await service.checkLimit(identifier)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS - 3)
    })

    it('should handle very long identifiers', async () => {
      const longIdentifier = 'a'.repeat(1000)
      
      await service.recordAttempt(longIdentifier, false)
      const result = await service.checkLimit(longIdentifier)
      
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS - 1)
    })

    it('should handle empty identifier gracefully', async () => {
      await expect(service.recordAttempt('', false)).resolves.not.toThrow()
      await expect(service.checkLimit('')).resolves.toBeDefined()
    })

    it('should handle cleanup timer correctly', () => {
      const service2 = new RateLimitServiceImpl()
      
      // Should start with timer
      expect(service2['cleanupTimer']).toBeDefined()
      
      // Should stop timer
      service2.stopCleanupTimer()
      expect(service2['cleanupTimer']).toBeNull()
      
      // Should handle stopping already stopped timer
      service2.stopCleanupTimer()
      expect(service2['cleanupTimer']).toBeNull()
    })
  })

  describe('memory management', () => {
    it('should not grow indefinitely with unique identifiers', async () => {
      // Add many unique identifiers
      for (let i = 0; i < 100; i++) {
        await service.recordAttempt(`192.168.1.${i}`, false)
      }
      
      const statsBefore = service.getStatistics()
      expect(statsBefore.totalTrackedIdentifiers).toBe(100)
      
      // Fast forward to expire all entries
      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS + 1000)
      await service.cleanup()
      
      const statsAfter = service.getStatistics()
      expect(statsAfter.totalTrackedIdentifiers).toBe(0)
    })
  })
})