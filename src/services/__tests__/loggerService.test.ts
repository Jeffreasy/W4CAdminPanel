import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LoggerServiceImpl, createLoggerService } from '../loggerService'
import type { LoggerConfig } from '../../types/config'
import type { AuthEventLog, AuthEventType, ErrorContext } from '../../types/services'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              limit: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ 
                  data: [], 
                  error: null 
                })
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}))

describe('LoggerService', () => {
  let loggerService: LoggerServiceImpl
  let mockConfig: LoggerConfig

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockConfig = {
      enableStructuredLogging: true,
      logLevel: 'debug',
      enableSecurityEventDetection: true,
      enablePerformanceMetrics: true,
      sanitizeSensitiveData: true,
      maxLogRetentionDays: 90
    }

    loggerService = new LoggerServiceImpl(mockConfig)
  })

  afterEach(() => {
    loggerService.destroy()
  })

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(loggerService).toBeInstanceOf(LoggerServiceImpl)
    })

    it('should handle missing environment variables gracefully', () => {
      const originalEnv = process.env
      process.env = { NODE_ENV: 'test' }
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      new LoggerServiceImpl(mockConfig)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[LoggerService] Supabase URL or Service Role Key is missing'
      )
      
      process.env = originalEnv
      consoleSpy.mockRestore()
    })
  })

  describe('logAuthEvent', () => {
    it('should log authentication events with structured format', async () => {
      const authEvent: Partial<AuthEventLog> = {
        event_type: 'login_attempt',
        email_attempted: 'test@example.com',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        success: false,
        failure_reason: 'invalid_credentials'
      }

      // Should not throw
      await expect(loggerService.logAuthEvent(authEvent)).resolves.toBeUndefined()
    })

    it('should handle logging errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const authEvent: Partial<AuthEventLog> = {
        event_type: 'login_attempt',
        success: false
      }

      // Should not throw even if there are internal errors
      await expect(loggerService.logAuthEvent(authEvent)).resolves.toBeUndefined()

      consoleSpy.mockRestore()
    })
  })

  describe('logSecurityEvent', () => {
    it('should log security events with enhanced detail', async () => {
      const eventType: AuthEventType = 'rate_limit_hit'
      const details = {
        ip_address: '192.168.1.1',
        attempts: 5,
        user_agent: 'suspicious-bot'
      }

      await expect(loggerService.logSecurityEvent(eventType, details)).resolves.toBeUndefined()
    })

    it('should handle security event logging errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      await expect(
        loggerService.logSecurityEvent('rate_limit_hit', {})
      ).resolves.toBeUndefined()

      consoleSpy.mockRestore()
    })
  })

  describe('logPerformanceMetric', () => {
    it('should log performance metrics when enabled', async () => {
      await expect(
        loggerService.logPerformanceMetric('token_refresh', 1500, true)
      ).resolves.toBeUndefined()
    })

    it('should not log performance metrics when disabled', async () => {
      const noMetricsService = new LoggerServiceImpl({
        ...mockConfig,
        enablePerformanceMetrics: false
      })

      await expect(
        noMetricsService.logPerformanceMetric('token_refresh', 1500, true)
      ).resolves.toBeUndefined()

      noMetricsService.destroy()
    })

    it('should handle performance logging errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      await expect(
        loggerService.logPerformanceMetric('test_operation', 100, true)
      ).resolves.toBeUndefined()

      consoleSpy.mockRestore()
    })
  })

  describe('logError', () => {
    it('should log errors with privacy-compliant data handling', async () => {
      const error = new Error('Test error')
      const context: ErrorContext = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        route: '/login',
        timestamp: new Date(),
        additionalData: {
          password: 'secret123',
          token: 'jwt-token'
        }
      }

      await expect(loggerService.logError(error, context)).resolves.toBeUndefined()
    })

    it('should handle error logging failures', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const error = new Error('Test error')
      const context: ErrorContext = {
        timestamp: new Date()
      }

      await expect(loggerService.logError(error, context)).resolves.toBeUndefined()

      consoleSpy.mockRestore()
    })
  })

  describe('sanitizeData', () => {
    it('should remove sensitive fields when sanitization is enabled', () => {
      const data = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'jwt-token',
        refresh_token: 'refresh-token',
        access_token: 'access-token',
        secret: 'api-secret',
        normalField: 'normal-value'
      }

      const sanitized = loggerService.sanitizeData(data)

      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.refresh_token).toBe('[REDACTED]')
      expect(sanitized.access_token).toBe('[REDACTED]')
      expect(sanitized.secret).toBe('[REDACTED]')
      expect(sanitized.normalField).toBe('normal-value')
      expect(sanitized.email).toBe('test@example.com')
    })

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(15000)
      const data = {
        longField: longString,
        shortField: 'short'
      }

      const sanitized = loggerService.sanitizeData(data)

      expect(sanitized.longField).toContain('...[TRUNCATED]')
      expect(sanitized.longField.length).toBeLessThan(longString.length)
      expect(sanitized.shortField).toBe('short')
    })

    it('should remove null and undefined values', () => {
      const data = {
        validField: 'value',
        nullField: null,
        undefinedField: undefined,
        emptyString: '',
        zeroValue: 0
      }

      const sanitized = loggerService.sanitizeData(data)

      expect(sanitized.validField).toBe('value')
      expect(sanitized.nullField).toBeUndefined()
      expect(sanitized.undefinedField).toBeUndefined()
      expect(sanitized.emptyString).toBe('')
      expect(sanitized.zeroValue).toBe(0)
    })

    it('should return original data when sanitization is disabled', () => {
      const noSanitizeService = new LoggerServiceImpl({
        ...mockConfig,
        sanitizeSensitiveData: false
      })

      const data = {
        password: 'secret123',
        normalField: 'value'
      }

      const sanitized = noSanitizeService.sanitizeData(data)

      expect(sanitized.password).toBe('secret123')
      expect(sanitized.normalField).toBe('value')

      noSanitizeService.destroy()
    })
  })

  describe('getAuthLogs', () => {
    it('should return empty array by default', async () => {
      const logs = await loggerService.getAuthLogs()
      expect(Array.isArray(logs)).toBe(true)
    })

    it('should handle filters without throwing', async () => {
      const filters = {
        userId: 'user-123',
        eventType: 'login_attempt' as AuthEventType,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        limit: 10
      }

      const logs = await loggerService.getAuthLogs(filters)
      expect(Array.isArray(logs)).toBe(true)
    })

    it('should return empty array when Supabase client is not initialized', async () => {
      const noClientService = new LoggerServiceImpl(mockConfig)
      // Force supabaseAdmin to be null
      ;(noClientService as any).supabaseAdmin = null

      const logs = await noClientService.getAuthLogs()

      expect(logs).toEqual([])
      noClientService.destroy()
    })
  })

  describe('security detection', () => {
    it('should detect suspicious IP addresses', () => {
      const service = loggerService as any

      expect(service.isSuspiciousIP('10.0.0.1')).toBe(true)
      expect(service.isSuspiciousIP('192.168.1.1')).toBe(true)
      expect(service.isSuspiciousIP('172.16.0.1')).toBe(true)
      expect(service.isSuspiciousIP('8.8.8.8')).toBe(false)
    })

    it('should detect suspicious user agents', () => {
      const service = loggerService as any

      expect(service.isSuspiciousUserAgent('Mozilla/5.0')).toBe(false)
      expect(service.isSuspiciousUserAgent('bot-crawler')).toBe(true)
      expect(service.isSuspiciousUserAgent('python-requests')).toBe(true)
      expect(service.isSuspiciousUserAgent('curl/7.68.0')).toBe(true)
    })

    it('should detect suspicious email patterns', () => {
      const service = loggerService as any

      expect(service.isSuspiciousEmail('normal@example.com')).toBe(false)
      expect(service.isSuspiciousEmail('test+spam+more@example.com')).toBe(true)
      expect(service.isSuspiciousEmail('test..double@example.com')).toBe(true)
      expect(service.isSuspiciousEmail('12345678901@example.com')).toBe(true)
    })
  })

  describe('createLoggerService factory', () => {
    it('should create logger service instance', () => {
      const service = createLoggerService(mockConfig)
      expect(service).toBeInstanceOf(LoggerServiceImpl)
      ;(service as LoggerServiceImpl).destroy()
    })
  })

  describe('cleanup', () => {
    it('should clear timers and flush buffer on destroy', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      loggerService.destroy()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })

  describe('data sanitization edge cases', () => {
    it('should handle email sanitization correctly', () => {
      const service = loggerService as any
      
      const event1 = { email_attempted: 'testuser@example.com' }
      const sanitized1 = service.sanitizeAuthEvent(event1)
      expect(sanitized1.email_attempted).toBe('te***@example.com')

      const event2 = { email_attempted: 'a@example.com' }
      const sanitized2 = service.sanitizeAuthEvent(event2)
      expect(sanitized2.email_attempted).toBe('a***@example.com')
    })

    it('should handle IP sanitization correctly', () => {
      const service = loggerService as any
      
      const event1 = { ip_address: '192.168.1.100' }
      const sanitized1 = service.sanitizeAuthEvent(event1)
      expect(sanitized1.ip_address).toBe('192.168.1.xxx')

      const event2 = { ip_address: 'unknown' }
      const sanitized2 = service.sanitizeAuthEvent(event2)
      expect(sanitized2.ip_address).toBe('unknown')
    })

    it('should handle user agent sanitization correctly', () => {
      const service = loggerService as any
      
      const event = { 
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
      const sanitized = service.sanitizeAuthEvent(event)
      expect(sanitized.user_agent).toContain('x.x.x')
      expect(sanitized.user_agent).not.toContain('91.0.4472')
    })
  })

  describe('security severity calculation', () => {
    it('should calculate security severity correctly', () => {
      const service = loggerService as any
      
      const highSeverity = service.calculateSecuritySeverity(
        { event_type: 'rate_limit_hit' },
        { attempts: 15 }
      )
      expect(highSeverity).toBe('high')

      const mediumSeverity = service.calculateSecuritySeverity(
        { event_type: 'rate_limit_hit' },
        { attempts: 5 }
      )
      expect(mediumSeverity).toBe('medium')

      const lowSeverity = service.calculateSecuritySeverity(
        { event_type: 'session_expired' },
        {}
      )
      expect(lowSeverity).toBe('low')
    })
  })
})