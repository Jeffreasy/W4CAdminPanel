import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenRefreshServiceImpl, createTokenRefreshService } from '../tokenRefreshService'
import { AUTH_ERROR_TYPES, TOKEN_REFRESH } from '../../constants/auth'
import type { RefreshResult } from '../../types/services'

// Mock Supabase auth helpers
const mockRefreshSession = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: vi.fn(() => ({
    auth: {
      refreshSession: mockRefreshSession,
      getSession: mockGetSession,
    }
  }))
}))

describe('TokenRefreshService', () => {
  let service: TokenRefreshServiceImpl

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    service = new TokenRefreshServiceImpl()
  })

  afterEach(() => {
    service.cleanup()
    vi.useRealTimers()
  })

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-123', email: 'test@example.com' }
      }

      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const result = await service.refreshToken()

      expect(result.success).toBe(true)
      expect(result.newSession).toEqual(mockSession)
      expect(result.error).toBeUndefined()
      expect(mockRefreshSession).toHaveBeenCalledTimes(1)
    })

    it('should handle refresh failure with Supabase error', async () => {
      const mockError = {
        message: 'refresh_token_not_found',
        status: 400
      }

      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: mockError
      })

      const result = await service.refreshToken()

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe(AUTH_ERROR_TYPES.INVALID_REFRESH_TOKEN)
      expect(result.error?.message).toBe('refresh_token_not_found')
      expect(result.newSession).toBeUndefined()
    })

    it('should handle network errors during refresh', async () => {
      mockRefreshSession.mockRejectedValue(new Error('Network error'))

      const promise = service.refreshToken()
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe(AUTH_ERROR_TYPES.NETWORK_ERROR)
      expect(result.error?.message).toBe('Network error')
    })

    it('should handle missing session in successful response', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const promise = service.refreshToken()
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe(AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED)
      expect(result.error?.message).toBe('No session returned from refresh')
    })
  })

  describe('scheduleRefresh', () => {
    it('should schedule refresh before token expiration', () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const eventSpy = vi.fn()
      
      service.addEventListener('refresh_scheduled', eventSpy)
      service.scheduleRefresh(expiresAt)

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refresh_scheduled',
          data: expect.objectContaining({
            expiresAt,
            delay: expect.any(Number)
          })
        })
      )
    })

    it('should trigger immediate refresh for soon-to-expire tokens', () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 60 // 1 minute from now (less than threshold)
      const eventSpy = vi.fn()
      
      service.addEventListener('refresh_needed_immediately', eventSpy)
      service.scheduleRefresh(expiresAt)

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refresh_needed_immediately',
          data: expect.objectContaining({
            expiresAt,
            now: expect.any(Number)
          })
        })
      )
    })

    it('should clear existing timer when scheduling new refresh', () => {
      const expiresAt1 = Math.floor(Date.now() / 1000) + 3600
      const expiresAt2 = Math.floor(Date.now() / 1000) + 7200
      
      const clearEventSpy = vi.fn()
      const scheduleEventSpy = vi.fn()
      
      service.addEventListener('refresh_timer_cleared', clearEventSpy)
      service.addEventListener('refresh_scheduled', scheduleEventSpy)

      service.scheduleRefresh(expiresAt1)
      service.scheduleRefresh(expiresAt2)

      expect(clearEventSpy).toHaveBeenCalledTimes(1)
      expect(scheduleEventSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearRefreshTimer', () => {
    it('should clear scheduled refresh timer', () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      const eventSpy = vi.fn()
      
      service.addEventListener('refresh_timer_cleared', eventSpy)
      
      service.scheduleRefresh(expiresAt)
      service.clearRefreshTimer()

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refresh_timer_cleared',
          data: {}
        })
      )
    })

    it('should not emit event if no timer exists', () => {
      const eventSpy = vi.fn()
      
      service.addEventListener('refresh_timer_cleared', eventSpy)
      service.clearRefreshTimer()

      expect(eventSpy).not.toHaveBeenCalled()
    })
  })

  describe('isRefreshing', () => {
    it('should return false when no refresh is in progress', () => {
      expect(service.isRefreshing()).toBe(false)
    })
  })

  describe('event system', () => {
    it('should add and remove event listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      service.addEventListener('test_event', listener1)
      service.addEventListener('test_event', listener2)

      // Emit event to test listeners are added
      ;(service as any).emitEvent('test_event', { test: 'data' })

      expect(listener1).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test_event',
          data: { test: 'data' },
          timestamp: expect.any(Date)
        })
      )
      expect(listener2).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test_event',
          data: { test: 'data' },
          timestamp: expect.any(Date)
        })
      )

      // Remove one listener
      service.removeEventListener('test_event', listener1)
      
      ;(service as any).emitEvent('test_event', { test: 'data2' })

      expect(listener1).toHaveBeenCalledTimes(1) // Not called again
      expect(listener2).toHaveBeenCalledTimes(2) // Called again
    })

    it('should handle errors in event listeners gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const faultyListener = vi.fn(() => { throw new Error('Listener error') })
      const goodListener = vi.fn()

      service.addEventListener('test_event', faultyListener)
      service.addEventListener('test_event', goodListener)

      ;(service as any).emitEvent('test_event', { test: 'data' })

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in event listener for test_event:',
        expect.any(Error)
      )
      expect(goodListener).toHaveBeenCalled() // Should still be called

      consoleSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('should clear all timers and listeners', () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      const listener = vi.fn()
      
      service.addEventListener('test_event', listener)
      service.scheduleRefresh(expiresAt)
      
      expect(service.isRefreshing()).toBe(false)
      
      service.cleanup()
      
      // Emit event to verify listeners are cleared
      ;(service as any).emitEvent('test_event', { test: 'data' })
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('factory function', () => {
    it('should create service with default config', () => {
      const service = createTokenRefreshService()
      expect(service).toBeInstanceOf(TokenRefreshServiceImpl)
    })

    it('should create service with custom config', () => {
      const customConfig = {
        thresholdMinutes: 10,
        maxRetryAttempts: 5
      }
      
      const service = createTokenRefreshService(customConfig)
      expect(service).toBeInstanceOf(TokenRefreshServiceImpl)
      
      // Test that custom config is applied
      expect((service as any).config.thresholdMinutes).toBe(10)
      expect((service as any).config.maxRetryAttempts).toBe(5)
    })
  })

  describe('error mapping', () => {
    it('should map Supabase refresh_token_not_found error', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'refresh_token_not_found' }
      })

      const result = await service.refreshToken()

      expect(result.error?.type).toBe(AUTH_ERROR_TYPES.INVALID_REFRESH_TOKEN)
    })

    it('should map Supabase jwt expired error', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'jwt expired' }
      })

      const promise = service.refreshToken()
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.error?.type).toBe(AUTH_ERROR_TYPES.TOKEN_EXPIRED)
    })

    it('should map network errors', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'network error occurred' }
      })

      const promise = service.refreshToken()
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.error?.type).toBe(AUTH_ERROR_TYPES.NETWORK_ERROR)
    })

    it('should default to token_refresh_failed for unknown errors', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'unknown error' }
      })

      const promise = service.refreshToken()
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.error?.type).toBe(AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED)
    })
  })

  describe('retry logic - basic tests', () => {
    it('should not retry non-retryable errors', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'invalid_refresh_token' }
      })

      const result = await service.refreshToken()

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe(AUTH_ERROR_TYPES.INVALID_REFRESH_TOKEN)
      expect(mockRefreshSession).toHaveBeenCalledTimes(1) // No retries
    })

    it('should eventually succeed after retries', async () => {
      // First attempt fails, second succeeds
      mockRefreshSession
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { 
            session: {
              access_token: 'new-token',
              refresh_token: 'new-refresh',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              user: { id: 'user-123' }
            }
          },
          error: null
        })

      const promise = service.refreshToken()
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(true)
      expect(mockRefreshSession).toHaveBeenCalledTimes(2)
    })
  })
})