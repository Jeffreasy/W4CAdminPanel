import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimitServiceImpl } from '../rateLimitService'
import { RATE_LIMIT, AUTH_EVENTS } from '../../constants/auth'

describe('RateLimitService Integration Tests', () => {
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

  describe('realistic authentication flow scenarios', () => {
    it('should handle typical failed login sequence', async () => {
      const userEmail = 'user@example.com'
      const userIP = '192.168.1.100'
      
      // User tries wrong password 3 times
      for (let i = 0; i < 3; i++) {
        const limitCheck = await service.checkLimit(userEmail)
        expect(limitCheck.allowed).toBe(true)
        
        await service.recordAttempt(userEmail, false)
        await service.recordAttempt(userIP, false)
      }
      
      // Check remaining attempts
      let emailStatus = await service.getStatus(userEmail)
      let ipStatus = await service.getStatus(userIP)
      
      expect(emailStatus.remainingAttempts).toBe(2)
      expect(ipStatus.remainingAttempts).toBe(2)
      
      // User tries 2 more times and gets blocked
      for (let i = 0; i < 2; i++) {
        await service.recordAttempt(userEmail, false)
        await service.recordAttempt(userIP, false)
      }
      
      emailStatus = await service.getStatus(userEmail)
      ipStatus = await service.getStatus(userIP)
      
      expect(emailStatus.allowed).toBe(false)
      expect(ipStatus.allowed).toBe(false)
      expect(emailStatus.waitTime).toBe(60) // First progressive delay
      expect(ipStatus.waitTime).toBe(60)
    })

    it('should handle successful login after failed attempts', async () => {
      const userEmail = 'user@example.com'
      
      // User fails 3 times
      for (let i = 0; i < 3; i++) {
        await service.recordAttempt(userEmail, false)
      }
      
      let status = await service.getStatus(userEmail)
      expect(status.remainingAttempts).toBe(2)
      
      // User succeeds on 4th attempt
      await service.recordAttempt(userEmail, true)
      
      status = await service.getStatus(userEmail)
      expect(status.allowed).toBe(true)
      expect(status.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
    })

    it('should handle password reset bypass during rate limiting', async () => {
      const userEmail = 'user@example.com'
      
      // Block user with failed attempts
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt(userEmail, false)
      }
      
      const status = await service.getStatus(userEmail)
      expect(status.allowed).toBe(false)
      
      // Password reset should bypass rate limiting
      const shouldBypass = service.shouldBypassRateLimit(userEmail, AUTH_EVENTS.PASSWORD_RESET_REQUEST)
      expect(shouldBypass).toBe(true)
      
      // Regular login should still be blocked
      const shouldBypassLogin = service.shouldBypassRateLimit(userEmail, AUTH_EVENTS.LOGIN_ATTEMPT)
      expect(shouldBypassLogin).toBe(false)
    })

    it('should handle multiple users with different rate limit states', async () => {
      const users = [
        { email: 'user1@example.com', ip: '192.168.1.1' },
        { email: 'user2@example.com', ip: '192.168.1.2' },
        { email: 'user3@example.com', ip: '192.168.1.3' },
      ]
      
      // User 1: Block completely
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt(users[0].email, false)
      }
      
      // User 2: Partial attempts
      for (let i = 0; i < 2; i++) {
        await service.recordAttempt(users[1].email, false)
      }
      
      // User 3: No attempts yet
      
      // Check states
      const user1Status = await service.getStatus(users[0].email)
      const user2Status = await service.getStatus(users[1].email)
      const user3Status = await service.getStatus(users[2].email)
      
      expect(user1Status.allowed).toBe(false)
      expect(user2Status.allowed).toBe(true)
      expect(user2Status.remainingAttempts).toBe(3)
      expect(user3Status.allowed).toBe(true)
      expect(user3Status.remainingAttempts).toBe(5)
    })
  })

  describe('progressive delay scenarios', () => {
    it('should escalate delays for persistent attacker', async () => {
      const attackerIP = '10.0.0.1'
      
      // First violation - should get first delay (60 seconds)
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt(attackerIP, false)
      }
      
      let status = await service.getStatus(attackerIP)
      expect(status.allowed).toBe(false)
      expect(status.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[0]) // 60 seconds
      
      // Second violation - should get second delay (300 seconds)
      await service.recordAttempt(attackerIP, false)
      status = await service.getStatus(attackerIP)
      expect(status.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[1]) // 300 seconds
      
      // Third violation - should get third delay (900 seconds)
      await service.recordAttempt(attackerIP, false)
      status = await service.getStatus(attackerIP)
      expect(status.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[2]) // 900 seconds
      
      // Fourth violation - should get fourth delay (1800 seconds)
      await service.recordAttempt(attackerIP, false)
      status = await service.getStatus(attackerIP)
      expect(status.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[3]) // 1800 seconds
      
      // Fifth violation - should get max delay (3600 seconds)
      await service.recordAttempt(attackerIP, false)
      status = await service.getStatus(attackerIP)
      expect(status.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[4]) // 3600 seconds
      
      // Further violations should stay at max delay
      await service.recordAttempt(attackerIP, false)
      status = await service.getStatus(attackerIP)
      expect(status.waitTime).toBe(RATE_LIMIT.PROGRESSIVE_DELAYS[4]) // Still 3600 seconds
    })

    it('should handle delay expiration and reset correctly', async () => {
      const userEmail = 'user@example.com'
      
      // Block user
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt(userEmail, false)
      }
      
      let status = await service.getStatus(userEmail)
      expect(status.allowed).toBe(false)
      expect(status.waitTime).toBe(60)
      
      // Wait for delay to expire
      vi.advanceTimersByTime(61 * 1000)
      
      status = await service.getStatus(userEmail)
      expect(status.allowed).toBe(true)
      expect(status.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
    })
  })

  describe('cleanup and memory management', () => {
    it('should automatically clean up expired entries', async () => {
      const identifiers = ['user1@example.com', 'user2@example.com', '192.168.1.1', '192.168.1.2']
      
      // Create rate limit entries for all identifiers
      for (const identifier of identifiers) {
        await service.recordAttempt(identifier, false)
      }
      
      let stats = service.getStatistics()
      expect(stats.totalTrackedIdentifiers).toBe(4)
      
      // Fast forward past expiration time
      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS + 1000)
      
      // Manually trigger cleanup since we're using fake timers
      await service.cleanup()
      
      // Cleanup should have removed expired entries
      stats = service.getStatistics()
      expect(stats.totalTrackedIdentifiers).toBe(0)
    })

    it('should handle mixed expired and active entries during cleanup', async () => {
      // Create some entries that will expire
      await service.recordAttempt('old-user@example.com', false)
      await service.recordAttempt('192.168.1.1', false)
      
      // Fast forward to make them expire
      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS + 1000)
      
      // Create new entries that won't expire
      await service.recordAttempt('new-user@example.com', false)
      await service.recordAttempt('192.168.1.2', false)
      
      // Run cleanup
      await service.cleanup()
      
      const stats = service.getStatistics()
      expect(stats.totalTrackedIdentifiers).toBe(2)
      
      // Verify the right entries remain
      const newUserStatus = await service.getStatus('new-user@example.com')
      const newIPStatus = await service.getStatus('192.168.1.2')
      const oldUserStatus = await service.getStatus('old-user@example.com')
      
      expect(newUserStatus.remainingAttempts).toBe(4) // Has 1 attempt recorded
      expect(newIPStatus.remainingAttempts).toBe(4)
      expect(oldUserStatus.remainingAttempts).toBe(5) // Should be reset
    })
  })

  describe('security scenarios', () => {
    it('should handle distributed attack from multiple IPs', async () => {
      const baseIP = '10.0.0.'
      const attackerIPs = Array.from({ length: 10 }, (_, i) => `${baseIP}${i + 1}`)
      
      // Each IP makes maximum attempts
      for (const ip of attackerIPs) {
        for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
          await service.recordAttempt(ip, false)
        }
      }
      
      // All IPs should be blocked
      for (const ip of attackerIPs) {
        const status = await service.getStatus(ip)
        expect(status.allowed).toBe(false)
      }
      
      const stats = service.getStatistics()
      expect(stats.totalTrackedIdentifiers).toBe(10)
      expect(stats.blockedIdentifiers).toBe(10)
    })

    it('should handle manual blocking for security incidents', async () => {
      const suspiciousIP = '10.0.0.100'
      
      // Manually block for 1 hour due to security incident
      await service.blockIdentifier(suspiciousIP, 3600)
      
      const status = await service.getStatus(suspiciousIP)
      expect(status.allowed).toBe(false)
      expect(status.waitTime).toBe(3600)
      
      // Should remain blocked even after normal rate limit window
      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS + 1000)
      
      const statusAfterWindow = await service.getStatus(suspiciousIP)
      expect(statusAfterWindow.allowed).toBe(false)
      
      // Should be unblocked after manual block duration
      vi.advanceTimersByTime(3600 * 1000)
      
      const statusAfterBlock = await service.getStatus(suspiciousIP)
      expect(statusAfterBlock.allowed).toBe(true)
    })

    it('should track both email and IP independently', async () => {
      const userEmail = 'user@example.com'
      const userIP = '192.168.1.100'
      
      // Block by email
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt(userEmail, false)
      }
      
      // Email should be blocked, IP should be allowed
      const emailStatus = await service.getStatus(userEmail)
      const ipStatus = await service.getStatus(userIP)
      
      expect(emailStatus.allowed).toBe(false)
      expect(ipStatus.allowed).toBe(true)
      
      // Now block by IP
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; i++) {
        await service.recordAttempt(userIP, false)
      }
      
      const ipStatusAfter = await service.getStatus(userIP)
      expect(ipStatusAfter.allowed).toBe(false)
    })
  })

  describe('performance and scalability', () => {
    it('should handle high volume of requests efficiently', async () => {
      const startTime = Date.now()
      
      // Simulate high volume of requests
      const promises = []
      for (let i = 0; i < 1000; i++) {
        const identifier = `user${i % 100}@example.com` // 100 unique users
        promises.push(service.recordAttempt(identifier, i % 10 === 0)) // 10% success rate
      }
      
      await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000) // 1 second
      
      const stats = service.getStatistics()
      expect(stats.totalTrackedIdentifiers).toBeLessThanOrEqual(100)
    })

    it('should maintain consistent performance with many blocked identifiers', async () => {
      // Create many blocked identifiers
      for (let i = 0; i < 100; i++) {
        const identifier = `blocked-user-${i}@example.com`
        for (let j = 0; j < RATE_LIMIT.DEFAULT_MAX_ATTEMPTS; j++) {
          await service.recordAttempt(identifier, false)
        }
      }
      
      const stats = service.getStatistics()
      expect(stats.totalTrackedIdentifiers).toBe(100)
      expect(stats.blockedIdentifiers).toBe(100)
      
      // Check performance of status checks
      const startTime = Date.now()
      
      for (let i = 0; i < 100; i++) {
        await service.getStatus(`blocked-user-${i}@example.com`)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should maintain good performance even with many blocked identifiers
      expect(duration).toBeLessThan(100) // 100ms for 100 checks
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle service restart gracefully', () => {
      // Create a service with some state
      const service1 = new RateLimitServiceImpl()
      
      // Add some rate limit data
      service1.recordAttempt('user@example.com', false)
      
      // Stop the service
      service1.stopCleanupTimer()
      
      // Create new service (simulating restart)
      const service2 = new RateLimitServiceImpl()
      
      // New service should start fresh
      const stats = service2.getStatistics()
      expect(stats.totalTrackedIdentifiers).toBe(0)
      
      service2.stopCleanupTimer()
    })

    it('should handle concurrent access to same identifier safely', async () => {
      const identifier = 'concurrent-user@example.com'
      
      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(async () => {
        await service.recordAttempt(identifier, false)
        return service.getStatus(identifier)
      })
      
      const results = await Promise.all(promises)
      
      // All results should be consistent
      const finalStatus = await service.getStatus(identifier)
      expect(finalStatus.remainingAttempts).toBeGreaterThanOrEqual(0)
      expect(finalStatus.remainingAttempts).toBeLessThanOrEqual(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS)
      
      // Should have recorded all attempts - if over max, should be blocked
      if (finalStatus.remainingAttempts === 0) {
        expect(finalStatus.allowed).toBe(false)
      } else {
        expect(finalStatus.remainingAttempts).toBe(RATE_LIMIT.DEFAULT_MAX_ATTEMPTS - 10)
      }
    })
  })
})