import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorHandlerServiceImpl, ErrorCategory, createErrorHandlerService } from '../errorHandlerService'
import type { AuthError, ErrorContext, RateLimitResult } from '../../types/auth'
import type { LoggerService } from '../../types/services'
import { createAuthError } from '../../utils/typeGuards'

describe('ErrorHandlerService', () => {
  let errorHandler: ErrorHandlerServiceImpl
  let mockLogger: LoggerService

  beforeEach(() => {
    mockLogger = {
      logAuthEvent: vi.fn(),
      logSecurityEvent: vi.fn(),
      logPerformanceMetric: vi.fn(),
      logError: vi.fn(),
      sanitizeData: vi.fn(),
      getAuthLogs: vi.fn()
    }
    errorHandler = new ErrorHandlerServiceImpl(mockLogger)
  })

  describe('handleAuthError', () => {
    it('should handle invalid credentials error', () => {
      const authError = createAuthError('invalid_credentials', 'Invalid email or password')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Invalid email or password. Please check your credentials and try again.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle account not found error with same message as invalid credentials', () => {
      const authError = createAuthError('account_not_found', 'Account not found')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Invalid email or password. Please check your credentials and try again.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle account disabled error', () => {
      const authError = createAuthError('account_disabled', 'Account is disabled')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Your account has been disabled. Please contact support for assistance.',
        canRetry: false,
        actionRequired: 'contact_support'
      })
    })

    it('should handle token expired error', () => {
      const authError = createAuthError('token_expired', 'Token has expired')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Your session has expired. Please log in again.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle session expired error', () => {
      const authError = createAuthError('session_expired', 'Session has expired')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Your session has expired. Please log in again.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle invalid refresh token error', () => {
      const authError = createAuthError('invalid_refresh_token', 'Refresh token is invalid')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Session expired, please log in again.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle token refresh failed error', () => {
      const authError = createAuthError('token_refresh_failed', 'Token refresh failed')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Session expired, please log in again.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle rate limited error', () => {
      const authError = createAuthError('rate_limited', 'Rate limit exceeded')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Too many login attempts. Please wait before trying again.',
        canRetry: true,
        retryAfter: 60,
        actionRequired: 'wait'
      })
    })

    it('should handle network error', () => {
      const authError = createAuthError('network_error', 'Network connection failed')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Network connection error. Please check your internet connection and try again.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle server error', () => {
      const authError = createAuthError('server_error', 'Internal server error')

      const result = errorHandler.handleAuthError(authError)

      expect(result).toEqual({
        message: 'Server error occurred. Please try again in a few moments.',
        canRetry: true,
        retryAfter: 30,
        actionRequired: 'login'
      })
    })
  })

  describe('handleRateLimitError', () => {
    it('should handle rate limit with wait time', () => {
      const rateLimitInfo: RateLimitResult = {
        allowed: false,
        remainingAttempts: 0,
        waitTime: 120
      }

      const result = errorHandler.handleRateLimitError(rateLimitInfo)

      expect(result).toEqual({
        message: 'Too many login attempts. Please wait 2 minutes before trying again.',
        canRetry: true,
        retryAfter: 120,
        actionRequired: 'wait'
      })
    })

    it('should handle rate limit without specific wait time', () => {
      const rateLimitInfo: RateLimitResult = {
        allowed: false,
        remainingAttempts: 0
      }

      const result = errorHandler.handleRateLimitError(rateLimitInfo)

      expect(result).toEqual({
        message: 'Too many login attempts. Please try again later.',
        canRetry: true,
        retryAfter: 0,
        actionRequired: 'wait'
      })
    })

    it('should handle warning when approaching rate limit (2 attempts remaining)', () => {
      const rateLimitInfo: RateLimitResult = {
        allowed: true,
        remainingAttempts: 2
      }

      const result = errorHandler.handleRateLimitError(rateLimitInfo)

      expect(result).toEqual({
        message: 'Login failed. You have 2 attempts remaining.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle warning when approaching rate limit (1 attempt remaining)', () => {
      const rateLimitInfo: RateLimitResult = {
        allowed: true,
        remainingAttempts: 1
      }

      const result = errorHandler.handleRateLimitError(rateLimitInfo)

      expect(result).toEqual({
        message: 'Login failed. You have 1 attempt remaining.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should handle normal failure with sufficient attempts remaining', () => {
      const rateLimitInfo: RateLimitResult = {
        allowed: true,
        remainingAttempts: 5
      }

      const result = errorHandler.handleRateLimitError(rateLimitInfo)

      expect(result).toEqual({
        message: 'Login failed. Please check your credentials and try again.',
        canRetry: true,
        actionRequired: 'login'
      })
    })

    it('should format wait time in seconds', () => {
      const rateLimitInfo: RateLimitResult = {
        allowed: false,
        remainingAttempts: 0,
        waitTime: 30
      }

      const result = errorHandler.handleRateLimitError(rateLimitInfo)

      expect(result.message).toBe('Too many login attempts. Please wait 30 seconds before trying again.')
    })

    it('should format wait time in minutes', () => {
      const rateLimitInfo: RateLimitResult = {
        allowed: false,
        remainingAttempts: 0,
        waitTime: 90
      }

      const result = errorHandler.handleRateLimitError(rateLimitInfo)

      expect(result.message).toBe('Too many login attempts. Please wait 2 minutes before trying again.')
    })
  })

  describe('categorizeError', () => {
    it('should categorize authentication errors', () => {
      const authError = createAuthError('invalid_credentials', 'Invalid credentials')

      const category = errorHandler.categorizeError(authError)
      expect(category).toBe(ErrorCategory.AUTHENTICATION)
    })

    it('should categorize session errors', () => {
      const authError = createAuthError('token_expired', 'Token expired')

      const category = errorHandler.categorizeError(authError)
      expect(category).toBe(ErrorCategory.SESSION)
    })

    it('should categorize rate limit errors', () => {
      const authError = createAuthError('rate_limited', 'Rate limited')

      const category = errorHandler.categorizeError(authError)
      expect(category).toBe(ErrorCategory.RATE_LIMIT)
    })

    it('should categorize network errors', () => {
      const networkError = new Error('fetch failed')
      const category = errorHandler.categorizeError(networkError)
      expect(category).toBe(ErrorCategory.NETWORK)
    })

    it('should categorize server errors', () => {
      const serverError = new Error('500 internal server error')
      const category = errorHandler.categorizeError(serverError)
      expect(category).toBe(ErrorCategory.SERVER)
    })

    it('should categorize validation errors', () => {
      const validationError = new Error('validation failed')
      const category = errorHandler.categorizeError(validationError)
      expect(category).toBe(ErrorCategory.VALIDATION)
    })

    it('should categorize unknown errors', () => {
      const unknownError = new Error('something went wrong')
      const category = errorHandler.categorizeError(unknownError)
      expect(category).toBe(ErrorCategory.UNKNOWN)
    })
  })

  describe('shouldRetry', () => {
    it('should not retry invalid credentials', () => {
      const authError = createAuthError('invalid_credentials', 'Invalid credentials')

      const shouldRetry = errorHandler.shouldRetry(authError)
      expect(shouldRetry).toBe(false)
    })

    it('should not retry account not found', () => {
      const authError = createAuthError('account_not_found', 'Account not found')

      const shouldRetry = errorHandler.shouldRetry(authError)
      expect(shouldRetry).toBe(false)
    })

    it('should not retry account disabled', () => {
      const authError = createAuthError('account_disabled', 'Account disabled')

      const shouldRetry = errorHandler.shouldRetry(authError)
      expect(shouldRetry).toBe(false)
    })

    it('should not retry rate limited', () => {
      const authError = createAuthError('rate_limited', 'Rate limited')

      const shouldRetry = errorHandler.shouldRetry(authError)
      expect(shouldRetry).toBe(false)
    })

    it('should retry network errors', () => {
      const authError = createAuthError('network_error', 'Network error')

      const shouldRetry = errorHandler.shouldRetry(authError)
      expect(shouldRetry).toBe(true)
    })

    it('should retry server errors', () => {
      const authError = createAuthError('server_error', 'Server error')

      const shouldRetry = errorHandler.shouldRetry(authError)
      expect(shouldRetry).toBe(true)
    })

    it('should retry token expired errors', () => {
      const authError = createAuthError('token_expired', 'Token expired')

      const shouldRetry = errorHandler.shouldRetry(authError)
      expect(shouldRetry).toBe(true)
    })
  })

  describe('logError', () => {
    it('should log error with sanitized context', () => {
      const error = new Error('Test error')
      const context: ErrorContext = {
        userId: 'user123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        additionalData: {
          password: 'secret123',
          token: 'jwt-token',
          safeData: 'this is safe'
        }
      }

      errorHandler.logError(error, context)

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        userId: 'user123',
        email: 'te***@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        errorCategory: ErrorCategory.UNKNOWN,
        additionalData: {
          safeData: 'this is safe'
        }
      }))
    })

    it('should handle logging without logger service', () => {
      const errorHandlerWithoutLogger = new ErrorHandlerServiceImpl()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const error = new Error('Test error')
      const context: ErrorContext = {
        timestamp: new Date()
      }

      errorHandlerWithoutLogger.logError(error, context)

      expect(consoleSpy).toHaveBeenCalledWith('Error logged without logger service:', expect.any(Object))
      consoleSpy.mockRestore()
    })

    it('should mask email properly', () => {
      const error = new Error('Test error')
      const context: ErrorContext = {
        email: 'a@example.com',
        timestamp: new Date()
      }

      errorHandler.logError(error, context)

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        email: '***@example.com'
      }))
    })

    it('should handle invalid email format', () => {
      const error = new Error('Test error')
      const context: ErrorContext = {
        email: 'invalid-email',
        timestamp: new Date()
      }

      errorHandler.logError(error, context)

      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        email: '***'
      }))
    })
  })

  describe('factory function', () => {
    it('should create error handler service with logger', () => {
      const service = createErrorHandlerService(mockLogger)
      expect(service).toBeInstanceOf(ErrorHandlerServiceImpl)
    })

    it('should create error handler service without logger', () => {
      const service = createErrorHandlerService()
      expect(service).toBeInstanceOf(ErrorHandlerServiceImpl)
    })
  })
})