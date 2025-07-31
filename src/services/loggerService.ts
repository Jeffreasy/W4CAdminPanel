import { createClient } from '@supabase/supabase-js'
import type { 
  LoggerService, 
  AuthEventLog, 
  AuthEventType, 
  ErrorContext 
} from '../types/services'
import type { AuthEventRecord } from '../types/supabase'
import { 
  LOGGING, 
  SECURITY, 
  AUTH_EVENTS, 
  DATABASE 
} from '../constants/auth'
import type { LoggerConfig } from '../types/config'

/**
 * Enhanced Logger Service Implementation
 * Provides structured logging with security event detection and privacy-compliant data handling
 */
export class LoggerServiceImpl implements LoggerService {
  private supabaseAdmin: any
  private config: LoggerConfig
  private logBuffer: AuthEventRecord[] = []
  private flushTimer: NodeJS.Timeout | null = null

  constructor(config: LoggerConfig) {
    this.config = config
    this.initializeSupabaseClient()
    this.startPeriodicFlush()
  }

  private initializeSupabaseClient(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[LoggerService] Supabase URL or Service Role Key is missing')
      return
    }

    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
  }

  /**
   * Logs authentication events with structured format
   */
  async logAuthEvent(event: Partial<AuthEventLog>): Promise<void> {
    try {
      if (!this.shouldLog(event.event_type)) {
        return
      }

      const sanitizedEvent = this.sanitizeAuthEvent(event)
      const structuredEvent = this.formatStructuredEvent(sanitizedEvent)

      // Add security flags if security event detection is enabled
      if (this.config.enableSecurityEventDetection) {
        structuredEvent.security_flags = this.detectSecurityFlags(sanitizedEvent)
      }

      // Buffer the event for batch processing
      this.bufferEvent(structuredEvent)

      // Log to console in development
      if (this.config.logLevel === 'debug') {
        console.log('[LoggerService] Auth Event:', structuredEvent)
      }

    } catch (error) {
      console.error('[LoggerService] Failed to log auth event:', error)
      // Don't throw - logging failures shouldn't break the auth flow
    }
  }

  /**
   * Logs security-related events with enhanced detail
   */
  async logSecurityEvent(eventType: AuthEventType, details: Record<string, any>): Promise<void> {
    try {
      const securityEvent: Partial<AuthEventLog> = {
        event_type: eventType,
        timestamp: new Date(),
        success: false, // Security events are typically failures or suspicious activities
        ...details
      }

      // Add enhanced security context
      const enhancedEvent = this.enhanceSecurityEvent(securityEvent, details)
      
      await this.logAuthEvent(enhancedEvent)

      // Log security events immediately in production
      if (process.env.NODE_ENV === 'production') {
        await this.flushBuffer()
      }

    } catch (error) {
      console.error('[LoggerService] Failed to log security event:', error)
    }
  }

  /**
   * Logs performance metrics for authentication operations
   */
  async logPerformanceMetric(operation: string, duration: number, success: boolean): Promise<void> {
    try {
      if (!this.config.enablePerformanceMetrics) {
        return
      }

      const performanceEvent: Partial<AuthEventLog> = {
        event_type: 'login_attempt', // Use existing type for now
        timestamp: new Date(),
        success,
        failure_reason: success ? undefined : `${operation}_performance_issue`,
        security_flags: [`performance_metric:${operation}:${duration}ms`]
      }

      await this.logAuthEvent(performanceEvent)

    } catch (error) {
      console.error('[LoggerService] Failed to log performance metric:', error)
    }
  }

  /**
   * Logs errors with privacy-compliant data handling
   */
  async logError(error: Error, context: ErrorContext): Promise<void> {
    try {
      const sanitizedContext = this.sanitizeData(context)
      
      const errorEvent: Partial<AuthEventLog> = {
        event_type: 'login_attempt', // Use existing type for now
        timestamp: context.timestamp,
        success: false,
        failure_reason: error.message,
        email_attempted: sanitizedContext.email,
        user_id: sanitizedContext.userId,
        ip_address: sanitizedContext.ipAddress || 'unknown',
        user_agent: sanitizedContext.userAgent || 'unknown',
        security_flags: ['error_logged']
      }

      await this.logAuthEvent(errorEvent)

    } catch (logError) {
      console.error('[LoggerService] Failed to log error:', logError)
    }
  }

  /**
   * Sanitizes sensitive data before logging
   */
  sanitizeData(data: Record<string, any>): Record<string, any> {
    if (!this.config.sanitizeSensitiveData) {
      return data
    }

    const sanitized = { ...data }

    // Remove or mask sensitive fields
    SECURITY.SENSITIVE_FIELDS.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })

    // Truncate long strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > LOGGING.MAX_LOG_ENTRY_SIZE) {
        sanitized[key] = sanitized[key].substring(0, LOGGING.MAX_LOG_ENTRY_SIZE) + '...[TRUNCATED]'
      }
    })

    // Remove undefined and null values
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined || sanitized[key] === null) {
        delete sanitized[key]
      }
    })

    return sanitized
  }

  /**
   * Gets authentication event logs with filtering
   */
  async getAuthLogs(filters?: {
    userId?: string
    eventType?: AuthEventType
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<AuthEventLog[]> {
    try {
      if (!this.supabaseAdmin) {
        throw new Error('Supabase client not initialized')
      }

      let query = this.supabaseAdmin
        .from(DATABASE.TABLES.LOGIN_ATTEMPTS)
        .select('*')

      // Apply filters
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      // Apply limit
      const limit = Math.min(filters?.limit || DATABASE.DEFAULT_QUERY_LIMIT, DATABASE.MAX_QUERY_LIMIT)
      query = query.limit(limit)

      // Order by timestamp descending
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw error
      }

      return this.mapDatabaseRecordsToAuthEvents(data || [])

    } catch (error) {
      console.error('[LoggerService] Failed to get auth logs:', error)
      return []
    }
  }

  /**
   * Private helper methods
   */

  private shouldLog(eventType?: AuthEventType): boolean {
    if (!eventType) return false

    // Always log security events
    const securityEvents: AuthEventType[] = [AUTH_EVENTS.RATE_LIMIT_HIT, AUTH_EVENTS.SESSION_EXPIRED]
    if (securityEvents.includes(eventType)) {
      return true
    }

    // Log based on configured level
    switch (this.config.logLevel) {
      case 'debug':
        return true
      case 'info':
        return eventType !== 'login_attempt' || this.config.enableStructuredLogging
      case 'warn':
        return !['login_attempt', 'login_success'].includes(eventType)
      case 'error':
        return eventType === 'rate_limit_hit' || eventType.includes('error')
      default:
        return false
    }
  }

  private sanitizeAuthEvent(event: Partial<AuthEventLog>): Partial<AuthEventLog> {
    const sanitized = { ...event }

    // Sanitize email - keep domain for analysis but mask local part
    if (sanitized.email_attempted) {
      const [localPart, domain] = sanitized.email_attempted.split('@')
      if (localPart && domain) {
        sanitized.email_attempted = `${localPart.substring(0, 2)}***@${domain}`
      }
    }

    // Sanitize IP address - keep first 3 octets for IPv4
    if (sanitized.ip_address && sanitized.ip_address !== 'unknown') {
      const ipParts = sanitized.ip_address.split('.')
      if (ipParts.length === 4) {
        sanitized.ip_address = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.xxx`
      }
    }

    // Sanitize user agent - keep browser info but remove detailed version
    if (sanitized.user_agent) {
      sanitized.user_agent = sanitized.user_agent
        .replace(/\d+\.\d+\.\d+(\.\d+)?/g, 'x.x.x')
        .replace(/Windows NT \d+\.\d+/g, 'Windows NT x.x')
        .replace(/\d+\.\d+/g, 'x.x')
    }

    return sanitized
  }

  private formatStructuredEvent(event: Partial<AuthEventLog>): AuthEventRecord {
    // Apply sanitization first
    const sanitizedEvent = this.sanitizeAuthEvent(event)
    
    // Add security flags if security event detection is enabled
    let securityFlags = sanitizedEvent.security_flags || []
    if (this.config.enableSecurityEventDetection) {
      const detectedFlags = this.detectSecurityFlags(event) // Use original event for detection
      securityFlags = [...securityFlags, ...detectedFlags]
    }
    
    return {
      timestamp: sanitizedEvent.timestamp?.toISOString() || new Date().toISOString(),
      event_type: sanitizedEvent.event_type || 'login_attempt',
      email_attempted: sanitizedEvent.email_attempted || null,
      user_id: sanitizedEvent.user_id || null,
      ip_address: sanitizedEvent.ip_address || 'unknown',
      user_agent: sanitizedEvent.user_agent || null,
      success: sanitizedEvent.success !== undefined ? sanitizedEvent.success : false,
      failure_reason: sanitizedEvent.failure_reason || null,
      rate_limit_info: sanitizedEvent.rate_limit_info ? {
        attempts: sanitizedEvent.rate_limit_info.attempts,
        reset_time: sanitizedEvent.rate_limit_info.reset_time.toISOString()
      } : null,
      security_flags: securityFlags.length > 0 ? securityFlags : null
    }
  }

  private detectSecurityFlags(event: Partial<AuthEventLog>): string[] {
    const flags: string[] = []

    // Detect suspicious patterns
    if (event.failure_reason?.includes('rate_limit')) {
      flags.push('rate_limit_triggered')
    }

    if (event.ip_address && this.isSuspiciousIP(event.ip_address)) {
      flags.push('suspicious_ip')
    }

    if (event.user_agent && this.isSuspiciousUserAgent(event.user_agent)) {
      flags.push('suspicious_user_agent')
    }

    if (event.email_attempted && this.isSuspiciousEmail(event.email_attempted)) {
      flags.push('suspicious_email_pattern')
    }

    return flags
  }

  private enhanceSecurityEvent(event: Partial<AuthEventLog>, details: Record<string, any>): Partial<AuthEventLog> {
    const enhanced = { ...event }

    // Add security-specific context
    enhanced.security_flags = [
      ...(enhanced.security_flags || []),
      'security_event',
      `severity:${this.calculateSecuritySeverity(event, details)}`
    ]

    return enhanced
  }

  private calculateSecuritySeverity(event: Partial<AuthEventLog>, details: Record<string, any>): string {
    // Simple severity calculation
    if (event.event_type === 'rate_limit_hit') {
      return details.attempts > 10 ? 'high' : 'medium'
    }

    if (event.event_type === 'session_expired') {
      return 'low'
    }

    return 'medium'
  }

  private isSuspiciousIP(ip: string): boolean {
    // Basic suspicious IP detection
    // In production, this could integrate with threat intelligence feeds
    const suspiciousPatterns = [
      /^10\./, // Private networks (might be suspicious in some contexts)
      /^192\.168\./, // Private networks
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./ // Private networks
    ]

    return suspiciousPatterns.some(pattern => pattern.test(ip))
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /curl/i,
      /wget/i,
      /python/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  private isSuspiciousEmail(email: string): boolean {
    const suspiciousPatterns = [
      /\+.*\+/, // Multiple plus signs
      /\.{2,}/, // Multiple consecutive dots
      /[0-9]{10,}/, // Long sequences of numbers
    ]

    return suspiciousPatterns.some(pattern => pattern.test(email))
  }

  private bufferEvent(event: AuthEventRecord): void {
    this.logBuffer.push(event)

    // Flush if buffer is full
    if (this.logBuffer.length >= LOGGING.BATCH_SIZE) {
      this.flushBuffer()
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.supabaseAdmin) {
      return
    }

    try {
      const eventsToFlush = [...this.logBuffer]
      this.logBuffer = []

      const { error } = await this.supabaseAdmin
        .from(DATABASE.TABLES.LOGIN_ATTEMPTS)
        .insert(eventsToFlush)

      if (error) {
        console.error('[LoggerService] Failed to flush log buffer:', error)
        // Re-add events to buffer for retry
        this.logBuffer.unshift(...eventsToFlush)
      }

    } catch (error) {
      console.error('[LoggerService] Error during buffer flush:', error)
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer()
    }, LOGGING.FLUSH_INTERVAL_MS)
  }

  private mapDatabaseRecordsToAuthEvents(records: any[]): AuthEventLog[] {
    return records.map(record => ({
      id: record.id,
      timestamp: new Date(record.created_at),
      event_type: record.event_type || 'login_attempt',
      email_attempted: record.email_attempted,
      user_id: record.user_id,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
      success: record.is_successful !== undefined ? record.is_successful : (record.success || false),
      failure_reason: record.failure_reason,
      rate_limit_info: record.rate_limit_info ? {
        attempts: record.rate_limit_info.attempts,
        reset_time: new Date(record.rate_limit_info.reset_time)
      } : undefined,
      security_flags: record.security_flags
    }))
  }

  /**
   * Cleanup method to be called when service is destroyed
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Flush any remaining events
    this.flushBuffer()
  }
}

// Factory function to create logger service with configuration
export function createLoggerService(config: LoggerConfig): LoggerService {
  return new LoggerServiceImpl(config)
}

// Default logger service instance
export const defaultLoggerService = createLoggerService({
  enableStructuredLogging: true,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableSecurityEventDetection: true,
  enablePerformanceMetrics: process.env.NODE_ENV === 'development',
  sanitizeSensitiveData: true,
  maxLogRetentionDays: 90
})