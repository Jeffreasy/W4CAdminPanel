import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorHandlerServiceImpl, createErrorHandlerService } from '../errorHandlerService'
import { LoggerServiceImpl } from '../loggerService'
import type { AuthError, ErrorContext, RateLimitResult } from '../../types/auth'
import type { LoggerConfig } from '../../types/config'
import { createAuthError } from '../../utils/typeGuards'

describe('ErrorHandlerService Integration', () => {
  let errorHandler: ErrorHandlerServiceImpl
  let logger: LoggerServiceImpl
  let mockConfig: LoggerConfig

  beforeEach(() => {
    mockConfig = {
      enableStructuredLogging: true,
      enableSecurityEventDetection: true,
      enablePerformanceMetrics: true,
      logLevel: 'info',
      sanitizeSensitiveData: true,
      maxLogRetentionDays: 30
    }
    
    logger = new LoggerServiceImpl(mockConfig)
    errorHandler = new ErrorHandlerServiceImpl(logger)
  })

  describe('Error handling with logging integration', () => {
    it('should handle auth error and log with proper context', async () => {
      const logSpy = vi.spyOn(logger, 'logError')
      
      const authError = createAuthError('invalid_credentials', 'Invalid email or password')

      const context: ErrorContext = {
        userId: 'user123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        additionalData: {
          attemptNumber: 3,
          password: 'secret123' // Should be sanitized
        }
      }

      // Handle the error
      const userFriendlyError = errorHandler.handleAuthError(authError)
      
      // Log the error
      errorHandler.logError(authError, context)

      // Verify user-friendly error
      expect(userFriendlyError).toEqual({
        message: 'Invalid email or password. Please check your credentials and try again.',
        canRetry: true,
        actionRequired: 'login'
      })

      // Verify logging was called with sanitized context
      expect(logSpy).toHaveBeenCalledWith(authError, expect.objectContaining({
        userId: 'user123',
        email: 'te***@example.com', // Should be masked
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        errorCategory: 'authentication',
        additionalData: {
          attemptNumber: 3
          // password should be removed
        }
      }))
    })

    it('should handle rate limit error with comprehensive logging', async () => {
      const logSpy = vi.spyOn(logger, 'logError')
      
      const rateLimitInfo: RateLimitResult = {
        allowed: false,
        remainingAttempts: 0,
        waitTime: 300, // 5 minutes
        resetTime: new Date(Date.now() + 300000)
      }

      const context: ErrorContext = {
        email: 'user@example.com',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/91.0',
        timestamp: new Date(),
        additionalData: {
          rateLimitInfo,
          previousAttempts: 5
        }
      }

      // Handle rate limit error
      const userFriendlyError = errorHandler.handleRateLimitError(rateLimitInfo)
      
      // Create a generic error for logging
      const rateLimitError = new Error('Rate limit exceeded')
      errorHandler.logError(rateLimitError, context)

      // Verify user-friendly error
      expect(userFriendlyError).toEqual({
        message: 'Too many login attempts. Please wait 5 minutes before trying again.',
        canRetry: true,
        retryAfter: 300,
        actionRequired: 'wait'
      })

      // Verify logging
      expect(logSpy).toHaveBeenCalledWith(rateLimitError, expect.objectContaining({
        email: 'us***@example.com',
        ipAddress: '192.168.1.100',
        errorCategory: 'unknown', // Generic error categorized as unknown
        additionalData: expect.objectContaining({
          rateLimitInfo,
          previousAttempts: 5
        })
      }))
    })

    it('should categorize and handle session errors properly', async () => {
      const logSpy = vi.spyOn(logger, 'logError')
      
      const sessionError = createAuthError('token_expired', 'Access token has expired', { code: 'TOKEN_EXPIRED' })

      const context: ErrorContext = {
        userId: 'user456',
        ipAddress: '10.0.0.1',
        timestamp: new Date(),
        additionalData: {
          tokenExpiresAt: new Date(Date.now() - 1000),
          refreshTokenAvailable: true
        }
      }

      // Handle auth error
      const userFriendlyError = errorHandler.handleAuthError(sessionError)
      
      // Log the error
      errorHandler.logError(sessionError, context)

      // Verify user-friendly error
      expect(userFriendlyError).toEqual({
        message: 'Your session has expired. Please log in again.',
        canRetry: true,
        actionRequired: 'login'
      })

      // Verify error categorization
      const category = errorHandler.categorizeError(sessionError)
      expect(category).toBe('session')

      // Verify retry logic
      const shouldRetry = errorHandler.shouldRetry(sessionError)
      expect(shouldRetry).toBe(true)

      // Verify logging
      expect(logSpy).toHaveBeenCalledWith(sessionError, expect.objectContaining({
        userId: 'user456',
        ipAddress: '10.0.0.1',
        errorCategory: 'session',
        additionalData: expect.objectContaining({
          tokenExpiresAt: expect.any(Date),
          refreshTokenAvailable: true
        })
      }))
    })

    it('should handle network errors with retry logic', () => {
      const networkError = createAuthError('network_error', 'Failed to fetch')

      const userFriendlyError = errorHandler.handleAuthError(networkError)
      const shouldRetry = errorHandler.shouldRetry(networkError)
      const category = errorHandler.categorizeError(networkError)

      expect(userFriendlyError).toEqual({
        message: 'Network connection error. Please check your internet connection and try again.',
        canRetry: true,
        actionRequired: 'login'
      })

      expect(shouldRetry).toBe(true)
      expect(category).toBe('network')
    })

    it('should handle server errors with appropriate retry delay', () => {
      const serverError = createAuthError('server_error', 'Internal server error')

      const userFriendlyError = errorHandler.handleAuthError(serverError)
      const shouldRetry = errorHandler.shouldRetry(serverError)
      const category = errorHandler.categorizeError(serverError)

      expect(userFriendlyError).toEqual({
        message: 'Server error occurred. Please try again in a few moments.',
        canRetry: true,
        retryAfter: 30,
        actionRequired: 'login'
      })

      expect(shouldRetry).toBe(true)
      expect(category).toBe('server')
    })

    it('should properly sanitize sensitive data in context', async () => {
      const logSpy = vi.spyOn(logger, 'logError')
      
      const error = new Error('Test error')
      const sensitiveContext: ErrorContext = {
        email: 'sensitive@example.com',
        timestamp: new Date(),
        additionalData: {
          password: 'super-secret-password',
          token: 'jwt-token-12345',
          refreshToken: 'refresh-token-67890',
          apiKey: 'api-key-abcdef',
          safeData: 'this is safe to log',
          userPreferences: { theme: 'dark' }
        }
      }

      errorHandler.logError(error, sensitiveContext)

      expect(logSpy).toHaveBeenCalledWith(error, expect.objectContaining({
        email: 'se***@example.com',
        additionalData: {
          apiKey: 'api-key-abcdef', // Non-auth sensitive data preserved
          safeData: 'this is safe to log',
          userPreferences: { theme: 'dark' }
          // password, token, refreshToken should be removed
        }
      }))

      // Verify sensitive auth data was removed
      const loggedContext = logSpy.mock.calls[0][1] as ErrorContext
      expect(loggedContext.additionalData).not.toHaveProperty('password')
      expect(loggedContext.additionalData).not.toHaveProperty('token')
      expect(loggedContext.additionalData).not.toHaveProperty('refreshToken')
    })
  })

  describe('Factory function integration', () => {
    it('should create error handler with logger integration', () => {
      const integratedService = createErrorHandlerService(logger)
      
      expect(integratedService).toBeInstanceOf(ErrorHandlerServiceImpl)
      
      // Test that it works with the logger
      const authError = createAuthError('invalid_credentials', 'Invalid credentials')
      
      const result = integratedService.handleAuthError(authError)
      expect(result.message).toBe('Invalid email or password. Please check your credentials and try again.')
    })
  })

  describe('Edge cases and error boundaries', () => {
    it('should handle malformed email addresses gracefully', async () => {
      const logSpy = vi.spyOn(logger, 'logError')
      
      const error = new Error('Test error')
      const contextWithBadEmail: ErrorContext = {
        email: 'not-an-email',
        timestamp: new Date()
      }

      errorHandler.logError(error, contextWithBadEmail)

      expect(logSpy).toHaveBeenCalledWith(error, expect.objectContaining({
        email: '***' // Should handle malformed email
      }))
    })

    it('should handle missing context data gracefully', async () => {
      const logSpy = vi.spyOn(logger, 'logError')
      
      const error = new Error('Test error')
      const minimalContext: ErrorContext = {
        timestamp: new Date()
      }

      errorHandler.logError(error, minimalContext)

      expect(logSpy).toHaveBeenCalledWith(error, expect.objectContaining({
        timestamp: expect.any(Date),
        errorCategory: 'unknown'
      }))
    })

    it('should handle rate limit info without reset time', () => {
      const rateLimitInfo: RateLimitResult = {
        allowed: false,
        remainingAttempts: 0
        // No waitTime or resetTime
      }

      const result = errorHandler.handleRateLimitError(rateLimitInfo)

      expect(result).toEqual({
        message: 'Too many login attempts. Please try again later.',
        canRetry: true,
        retryAfter: 0,
        actionRequired: 'wait'
      })
    })
  })
})