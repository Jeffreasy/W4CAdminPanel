import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LoggerServiceImpl } from '../loggerService'
import type { LoggerConfig } from '../../types/config'
import type { AuthEventLog } from '../../types/services'

// Integration test to verify logger service works with existing database structure
describe('LoggerService Integration', () => {
  let loggerService: LoggerServiceImpl
  let mockConfig: LoggerConfig

  beforeEach(() => {
    mockConfig = {
      enableStructuredLogging: true,
      logLevel: 'info',
      enableSecurityEventDetection: true,
      enablePerformanceMetrics: false,
      sanitizeSensitiveData: true,
      maxLogRetentionDays: 90
    }

    loggerService = new LoggerServiceImpl(mockConfig)
  })

  afterEach(() => {
    loggerService.destroy()
  })

  describe('compatibility with existing login_attempts table', () => {
    it('should format events compatible with existing database schema', async () => {
      const authEvent: Partial<AuthEventLog> = {
        event_type: 'login_attempt',
        email_attempted: 'user@example.com',
        user_id: '968f5317-f0ba-4c5f-86f2-71612af0cc43',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        success: false,
        failure_reason: 'Invalid credentials',
        rate_limit_info: {
          attempts: 3,
          reset_time: new Date('2024-01-01T12:00:00Z')
        }
      }

      // Test the internal formatting method
      const service = loggerService as any
      const formatted = service.formatStructuredEvent(authEvent)

      // Verify it matches the expected database structure
      expect(formatted).toMatchObject({
        timestamp: expect.any(String),
        event_type: 'login_attempt',
        email_attempted: 'us***@example.com', // Should be sanitized
        user_id: '968f5317-f0ba-4c5f-86f2-71612af0cc43',
        ip_address: '192.168.1.xxx', // Should be sanitized
        user_agent: 'Mozilla/x.x (Windows NT x.x; Win64; x64)', // Should be sanitized
        success: false,
        failure_reason: 'Invalid credentials',
        rate_limit_info: {
          attempts: 3,
          reset_time: '2024-01-01T12:00:00.000Z'
        },
        security_flags: expect.arrayContaining(['suspicious_ip'])
      })
    })

    it('should handle successful login events', async () => {
      const successEvent: Partial<AuthEventLog> = {
        event_type: 'login_success',
        email_attempted: 'admin@example.com',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        ip_address: '203.0.113.1',
        user_agent: 'Mozilla/5.0',
        success: true
      }

      const service = loggerService as any
      const formatted = service.formatStructuredEvent(successEvent)

      expect(formatted).toMatchObject({
        event_type: 'login_success',
        success: true,
        failure_reason: null,
        rate_limit_info: null
      })
    })

    it('should handle rate limiting events', async () => {
      const rateLimitEvent: Partial<AuthEventLog> = {
        event_type: 'rate_limit_hit',
        email_attempted: 'attacker@suspicious.com',
        ip_address: '10.0.0.1',
        user_agent: 'curl/7.68.0',
        success: false,
        failure_reason: 'Rate limit exceeded',
        rate_limit_info: {
          attempts: 10,
          reset_time: new Date()
        }
      }

      const service = loggerService as any
      const formatted = service.formatStructuredEvent(rateLimitEvent)

      expect(formatted.security_flags).toEqual(
        expect.arrayContaining([
          'suspicious_ip',
          'suspicious_user_agent'
        ])
      )
    })
  })

  describe('data mapping from database records', () => {
    it('should correctly map database records to AuthEventLog format', () => {
      const databaseRecords = [
        {
          id: '1',
          created_at: '2024-01-01T10:00:00Z',
          event_type: 'login_attempt',
          email_attempted: 'test@example.com',
          user_id: 'user-123',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          is_successful: false,
          failure_reason: 'Invalid password',
          rate_limit_info: {
            attempts: 2,
            reset_time: '2024-01-01T10:15:00Z'
          },
          security_flags: ['suspicious_activity']
        }
      ]

      const service = loggerService as any
      const mapped = service.mapDatabaseRecordsToAuthEvents(databaseRecords)

      expect(mapped).toHaveLength(1)
      expect(mapped[0]).toMatchObject({
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        event_type: 'login_attempt',
        email_attempted: 'test@example.com',
        user_id: 'user-123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        success: false,
        failure_reason: 'Invalid password',
        rate_limit_info: {
          attempts: 2,
          reset_time: new Date('2024-01-01T10:15:00Z')
        },
        security_flags: ['suspicious_activity']
      })
    })

    it('should handle records with missing optional fields', () => {
      const minimalRecord = [
        {
          id: '2',
          created_at: '2024-01-01T11:00:00Z',
          ip_address: '192.168.1.2',
          is_successful: true,
          user_agent: null,
          failure_reason: null,
          rate_limit_info: null,
          security_flags: null
        }
      ]

      const service = loggerService as any
      const mapped = service.mapDatabaseRecordsToAuthEvents(minimalRecord)

      expect(mapped[0]).toMatchObject({
        id: '2',
        event_type: 'login_attempt', // Default value
        success: true,
        user_agent: null,
        failure_reason: null,
        rate_limit_info: undefined,
        security_flags: null
      })
    })
  })

  describe('privacy compliance', () => {
    it('should sanitize PII in authentication events', () => {
      const sensitiveEvent: Partial<AuthEventLog> = {
        event_type: 'login_attempt',
        email_attempted: 'john.doe.personal@company.com',
        ip_address: '192.168.1.123',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        success: false
      }

      const service = loggerService as any
      const sanitized = service.sanitizeAuthEvent(sensitiveEvent)

      // Email should be partially masked
      expect(sanitized.email_attempted).toBe('jo***@company.com')
      
      // IP should be partially masked
      expect(sanitized.ip_address).toBe('192.168.1.xxx')
      
      // User agent should have version numbers masked
      expect(sanitized.user_agent).not.toContain('91.0.4472.124')
      expect(sanitized.user_agent).toContain('x.x.x')
    })

    it('should handle edge cases in data sanitization', () => {
      const edgeCaseData = {
        email_attempted: 'a@b.c', // Very short email
        ip_address: 'unknown',
        user_agent: '',
        password: 'secret123',
        token: 'jwt-token-here',
        normalField: 'keep-this'
      }

      const sanitized = loggerService.sanitizeData(edgeCaseData)

      expect(sanitized.email_attempted).toBe('a@b.c') // Too short to mask meaningfully
      expect(sanitized.ip_address).toBe('unknown') // Non-IP format preserved
      expect(sanitized.user_agent).toBe('')
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.normalField).toBe('keep-this')
    })
  })

  describe('security event detection', () => {
    it('should detect and flag multiple security indicators', () => {
      const suspiciousEvent: Partial<AuthEventLog> = {
        event_type: 'login_attempt',
        email_attempted: 'test+spam+more+stuff@example.com',
        ip_address: '10.0.0.1',
        user_agent: 'python-requests/2.25.1',
        success: false,
        failure_reason: 'rate_limit_exceeded'
      }

      const service = loggerService as any
      const flags = service.detectSecurityFlags(suspiciousEvent)

      expect(flags).toEqual(
        expect.arrayContaining([
          'rate_limit_triggered',
          'suspicious_ip',
          'suspicious_user_agent',
          'suspicious_email_pattern'
        ])
      )
    })

    it('should not flag legitimate user activity', () => {
      const legitimateEvent: Partial<AuthEventLog> = {
        event_type: 'login_success',
        email_attempted: 'user@example.com',
        ip_address: '203.0.113.1', // Public IP
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        success: true
      }

      const service = loggerService as any
      const flags = service.detectSecurityFlags(legitimateEvent)

      expect(flags).toHaveLength(0)
    })
  })
})