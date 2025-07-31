import type { 
  AuthError, 
  UserFriendlyError, 
  ErrorContext, 
  RateLimitResult,
  AuthErrorType 
} from '../types/auth'
import type { ErrorHandlerService } from '../types/services'
import type { LoggerService } from '../types/services'

/**
 * Error categories for systematic handling
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  SESSION = 'session', 
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  SERVER = 'server',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

/**
 * Security levels for error exposure
 */
enum SecurityLevel {
  SAFE = 'safe',        // Safe to show to user
  SANITIZED = 'sanitized', // Show generic message
  INTERNAL = 'internal'    // Log only, don't expose
}

/**
 * Error Handler Service Implementation
 * Converts technical errors to user-friendly messages with security considerations
 */
export class ErrorHandlerServiceImpl implements ErrorHandlerService {
  private logger?: LoggerService

  constructor(logger?: LoggerService) {
    this.logger = logger
  }

  /**
   * Converts technical authentication errors to user-friendly messages
   */
  handleAuthError(error: AuthError): UserFriendlyError {
    const category = this.categorizeAuthError(error.type)
    const securityLevel = this.getSecurityLevel(error.type)
    
    return this.generateUserFriendlyError(error, category, securityLevel)
  }

  /**
   * Handles rate limiting errors with appropriate user messaging
   */
  handleRateLimitError(rateLimitInfo: RateLimitResult): UserFriendlyError {
    const waitTime = rateLimitInfo.waitTime || 0
    const remainingAttempts = rateLimitInfo.remainingAttempts
    
    if (!rateLimitInfo.allowed) {
      return {
        message: waitTime > 0 
          ? `Too many login attempts. Please wait ${this.formatWaitTime(waitTime)} before trying again.`
          : 'Too many login attempts. Please try again later.',
        canRetry: true,
        retryAfter: waitTime,
        actionRequired: 'wait'
      }
    }

    // Warning message when approaching limit
    if (remainingAttempts <= 2) {
      return {
        message: `Login failed. You have ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
        canRetry: true,
        actionRequired: 'login'
      }
    }

    return {
      message: 'Login failed. Please check your credentials and try again.',
      canRetry: true,
      actionRequired: 'login'
    }
  }

  /**
   * Logs errors with appropriate context and security considerations
   */
  logError(error: Error, context: ErrorContext): void {
    if (!this.logger) {
      console.error('Error logged without logger service:', {
        error: error.message,
        context: this.sanitizeContext(context)
      })
      return
    }

    // Sanitize context to remove sensitive information
    const sanitizedContext = this.sanitizeContext(context)
    
    this.logger.logError(error, {
      ...sanitizedContext,
      errorCategory: this.categorizeError(error),
      timestamp: new Date()
    })
  }

  /**
   * Categorizes errors for appropriate handling
   */
  categorizeError(error: Error): string {
    // Check if it's an AuthError
    if (this.isAuthError(error)) {
      return this.categorizeAuthError((error as AuthError).type)
    }

    // Network errors
    if (error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('connection')) {
      return ErrorCategory.NETWORK
    }

    // Server errors
    if (error.message.includes('500') || 
        error.message.includes('server') ||
        error.message.includes('internal')) {
      return ErrorCategory.SERVER
    }

    // Validation errors
    if (error.message.includes('validation') ||
        error.message.includes('invalid') ||
        error.message.includes('required')) {
      return ErrorCategory.VALIDATION
    }

    return ErrorCategory.UNKNOWN
  }

  /**
   * Determines if an error should be retried automatically
   */
  shouldRetry(error: AuthError): boolean {
    const nonRetryableErrors: AuthErrorType[] = [
      'invalid_credentials',
      'account_not_found', 
      'account_disabled',
      'rate_limited'
    ]

    return !nonRetryableErrors.includes(error.type)
  }

  /**
   * Categorizes authentication error types
   */
  private categorizeAuthError(errorType: AuthErrorType): string {
    switch (errorType) {
      case 'invalid_credentials':
      case 'account_not_found':
      case 'account_disabled':
        return ErrorCategory.AUTHENTICATION
      
      case 'token_expired':
      case 'invalid_refresh_token':
      case 'token_refresh_failed':
      case 'session_expired':
        return ErrorCategory.SESSION
      
      case 'rate_limited':
        return ErrorCategory.RATE_LIMIT
      
      case 'network_error':
        return ErrorCategory.NETWORK
      
      case 'server_error':
        return ErrorCategory.SERVER
      
      default:
        return ErrorCategory.UNKNOWN
    }
  }

  /**
   * Determines security level for error exposure
   */
  private getSecurityLevel(errorType: AuthErrorType): SecurityLevel {
    switch (errorType) {
      case 'network_error':
      case 'server_error':
      case 'rate_limited':
      case 'token_expired':
      case 'session_expired':
        return SecurityLevel.SAFE
      
      case 'invalid_credentials':
      case 'account_not_found':
        return SecurityLevel.SANITIZED // Don't reveal if account exists
      
      case 'account_disabled':
      case 'invalid_refresh_token':
      case 'token_refresh_failed':
        return SecurityLevel.INTERNAL
      
      default:
        return SecurityLevel.SANITIZED
    }
  }

  /**
   * Generates user-friendly error messages based on category and security level
   */
  private generateUserFriendlyError(
    error: AuthError, 
    category: string, 
    securityLevel: SecurityLevel
  ): UserFriendlyError {
    switch (error.type) {
      case 'invalid_credentials':
      case 'account_not_found':
        return {
          message: 'Invalid email or password. Please check your credentials and try again.',
          canRetry: true,
          actionRequired: 'login'
        }
      
      case 'account_disabled':
        return {
          message: 'Your account has been disabled. Please contact support for assistance.',
          canRetry: false,
          actionRequired: 'contact_support'
        }
      
      case 'token_expired':
      case 'session_expired':
        return {
          message: 'Your session has expired. Please log in again.',
          canRetry: true,
          actionRequired: 'login'
        }
      
      case 'invalid_refresh_token':
      case 'token_refresh_failed':
        return {
          message: 'Session expired, please log in again.',
          canRetry: true,
          actionRequired: 'login'
        }
      
      case 'rate_limited':
        return {
          message: 'Too many login attempts. Please wait before trying again.',
          canRetry: true,
          retryAfter: 60, // Default 1 minute
          actionRequired: 'wait'
        }
      
      case 'network_error':
        return {
          message: 'Network connection error. Please check your internet connection and try again.',
          canRetry: true,
          actionRequired: 'login'
        }
      
      case 'server_error':
        return {
          message: 'Server error occurred. Please try again in a few moments.',
          canRetry: true,
          retryAfter: 30,
          actionRequired: 'login'
        }
      
      default:
        return {
          message: 'An unexpected error occurred. Please try again.',
          canRetry: true,
          actionRequired: 'login'
        }
    }
  }

  /**
   * Formats wait time in human-readable format
   */
  private formatWaitTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds === 1 ? '' : 's'}`
    }
    
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  /**
   * Sanitizes error context to remove sensitive information
   */
  private sanitizeContext(context: ErrorContext): ErrorContext {
    const sanitized = { ...context }
    
    // Remove or mask sensitive data
    if (sanitized.email) {
      sanitized.email = this.maskEmail(sanitized.email)
    }
    
    // Remove sensitive additional data
    if (sanitized.additionalData) {
      const { password, token, refreshToken, ...safeData } = sanitized.additionalData
      sanitized.additionalData = safeData
    }
    
    return sanitized
  }

  /**
   * Masks email for logging (keeps domain for debugging)
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@')
    if (!domain) return '***'
    
    const maskedLocal = localPart.length > 2 
      ? localPart.substring(0, 2) + '***'
      : '***'
    
    return `${maskedLocal}@${domain}`
  }

  /**
   * Type guard to check if error is an AuthError
   */
  private isAuthError(error: Error): error is AuthError {
    return 'type' in error && typeof (error as any).type === 'string'
  }
}

/**
 * Factory function to create ErrorHandlerService instance
 */
export function createErrorHandlerService(logger?: LoggerService): ErrorHandlerService {
  return new ErrorHandlerServiceImpl(logger)
}

/**
 * Default error handler service instance
 */
export const defaultErrorHandlerService = new ErrorHandlerServiceImpl()