import type { 
  AuthError, 
  UserFriendlyError, 
  ErrorContext, 
  RefreshResult, 
  RateLimitResult, 
  AuthEventLog,
  AuthEventType 
} from './auth'

// Re-export types that are used by services
export type { 
  AuthError, 
  UserFriendlyError, 
  ErrorContext, 
  RefreshResult, 
  RateLimitResult, 
  AuthEventLog,
  AuthEventType 
} from './auth'

// Token Refresh Service Interface
export interface TokenRefreshService {
  /**
   * Attempts to refresh the current authentication token
   * @returns Promise resolving to refresh result with success status and new session or error
   */
  refreshToken(): Promise<RefreshResult>
  
  /**
   * Schedules automatic token refresh before expiration
   * @param expiresAt - Token expiration timestamp in milliseconds
   */
  scheduleRefresh(expiresAt: number): void
  
  /**
   * Clears any scheduled refresh timers
   */
  clearRefreshTimer(): void
  
  /**
   * Checks if a token refresh is currently in progress
   */
  isRefreshing(): boolean
  
  /**
   * Gets the time until next scheduled refresh
   * @returns milliseconds until refresh, or null if no refresh scheduled
   */
  getTimeUntilRefresh(): number | null
}

// Rate Limiting Service Interface
export interface RateLimitService {
  /**
   * Checks if a request is allowed based on current rate limits
   * @param identifier - IP address or email to check
   * @returns Promise resolving to rate limit result
   */
  checkLimit(identifier: string): Promise<RateLimitResult>
  
  /**
   * Records a login attempt and updates rate limit state
   * @param identifier - IP address or email
   * @param success - Whether the attempt was successful
   */
  recordAttempt(identifier: string, success: boolean): Promise<void>
  
  /**
   * Resets rate limit counter for successful authentication
   * @param identifier - IP address or email to reset
   */
  resetLimit(identifier: string): Promise<void>
  
  /**
   * Gets current rate limit status for an identifier
   * @param identifier - IP address or email
   */
  getStatus(identifier: string): Promise<RateLimitResult>
  
  /**
   * Cleans up expired rate limit entries
   */
  cleanup(): Promise<void>
}

// Error Handler Service Interface
export interface ErrorHandlerService {
  /**
   * Converts technical authentication errors to user-friendly messages
   * @param error - The authentication error to handle
   * @returns User-friendly error with actionable information
   */
  handleAuthError(error: AuthError): UserFriendlyError
  
  /**
   * Handles rate limiting errors with appropriate user messaging
   * @param rateLimitInfo - Current rate limit status
   * @returns User-friendly error with wait time information
   */
  handleRateLimitError(rateLimitInfo: RateLimitResult): UserFriendlyError
  
  /**
   * Logs errors with appropriate context and security considerations
   * @param error - The error to log
   * @param context - Additional context for the error
   */
  logError(error: Error, context: ErrorContext): void
  
  /**
   * Categorizes errors for appropriate handling
   * @param error - The error to categorize
   * @returns The error category for handling logic
   */
  categorizeError(error: Error): string
  
  /**
   * Determines if an error should be retried automatically
   * @param error - The error to check
   * @returns Whether automatic retry is appropriate
   */
  shouldRetry(error: AuthError): boolean
}

// Logger Service Interface
export interface LoggerService {
  /**
   * Logs authentication events with structured format
   * @param event - The authentication event to log
   */
  logAuthEvent(event: Partial<AuthEventLog>): Promise<void>
  
  /**
   * Logs security-related events with enhanced detail
   * @param eventType - Type of security event
   * @param details - Event details and context
   */
  logSecurityEvent(eventType: AuthEventType, details: Record<string, any>): Promise<void>
  
  /**
   * Logs performance metrics for authentication operations
   * @param operation - The operation being measured
   * @param duration - Duration in milliseconds
   * @param success - Whether the operation succeeded
   */
  logPerformanceMetric(operation: string, duration: number, success: boolean): Promise<void>
  
  /**
   * Logs errors with privacy-compliant data handling
   * @param error - The error to log
   * @param context - Additional context
   */
  logError(error: Error, context: ErrorContext): Promise<void>
  
  /**
   * Sanitizes sensitive data before logging
   * @param data - Data to sanitize
   * @returns Sanitized data safe for logging
   */
  sanitizeData(data: Record<string, any>): Record<string, any>
  
  /**
   * Gets authentication event logs with filtering
   * @param filters - Optional filters for log retrieval
   * @returns Promise resolving to filtered log entries
   */
  getAuthLogs(filters?: {
    userId?: string
    eventType?: AuthEventType
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<AuthEventLog[]>
}