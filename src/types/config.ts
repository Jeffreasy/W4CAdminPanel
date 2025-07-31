// Configuration types and constants for Enhanced Authentication & Rate Limiting System

// Rate Limiting Configuration
export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // Time window in milliseconds
  progressiveDelays: number[] // Delays in seconds for each attempt
  resetOnSuccess: boolean
  bypassForPasswordReset: boolean
  cleanupIntervalMs: number
}

// Token Refresh Configuration
export interface TokenRefreshConfig {
  refreshThresholdMinutes: number // Minutes before expiry to refresh
  maxRetryAttempts: number
  retryDelayMs: number // Base delay for exponential backoff
  maxRetryDelayMs: number // Maximum delay between retries
  enableProactiveRefresh: boolean
}

// Middleware Configuration
export interface MiddlewareConfig {
  protectedRoutes: string[]
  publicRoutes: string[]
  authRoutes: string[]
  apiRoutes: string[]
  refreshThreshold: number // minutes before expiry to refresh
  enableAutomaticRefresh: boolean
}

// Logger Configuration
export interface LoggerConfig {
  enableStructuredLogging: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  enableSecurityEventDetection: boolean
  enablePerformanceMetrics: boolean
  sanitizeSensitiveData: boolean
  maxLogRetentionDays: number
}

// Error Handler Configuration
export interface ErrorHandlerConfig {
  enableUserFriendlyMessages: boolean
  enableErrorCategorization: boolean
  enableAutomaticRetry: boolean
  maxRetryAttempts: number
  enableSecurityErrorLogging: boolean
}

// Main System Configuration
export interface EnhancedAuthConfig {
  rateLimit: RateLimitConfig
  tokenRefresh: TokenRefreshConfig
  middleware: MiddlewareConfig
  logger: LoggerConfig
  errorHandler: ErrorHandlerConfig
  environment: 'development' | 'staging' | 'production'
}

// Default Configuration Constants
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  progressiveDelays: [60, 300, 900, 1800], // 1min, 5min, 15min, 30min
  resetOnSuccess: true,
  bypassForPasswordReset: true,
  cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
}

export const DEFAULT_TOKEN_REFRESH_CONFIG: TokenRefreshConfig = {
  refreshThresholdMinutes: 5,
  maxRetryAttempts: 3,
  retryDelayMs: 1000,
  maxRetryDelayMs: 10000,
  enableProactiveRefresh: true,
}

export const DEFAULT_MIDDLEWARE_CONFIG: MiddlewareConfig = {
  protectedRoutes: ['/dashboard', '/admin', '/profile'],
  publicRoutes: ['/', '/about', '/contact'],
  authRoutes: ['/login', '/register', '/reset-password'],
  apiRoutes: ['/api'],
  refreshThreshold: 5,
  enableAutomaticRefresh: true,
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  enableStructuredLogging: true,
  logLevel: 'info',
  enableSecurityEventDetection: true,
  enablePerformanceMetrics: true,
  sanitizeSensitiveData: true,
  maxLogRetentionDays: 90,
}

export const DEFAULT_ERROR_HANDLER_CONFIG: ErrorHandlerConfig = {
  enableUserFriendlyMessages: true,
  enableErrorCategorization: true,
  enableAutomaticRetry: true,
  maxRetryAttempts: 3,
  enableSecurityErrorLogging: true,
}

export const DEFAULT_ENHANCED_AUTH_CONFIG: EnhancedAuthConfig = {
  rateLimit: DEFAULT_RATE_LIMIT_CONFIG,
  tokenRefresh: DEFAULT_TOKEN_REFRESH_CONFIG,
  middleware: DEFAULT_MIDDLEWARE_CONFIG,
  logger: DEFAULT_LOGGER_CONFIG,
  errorHandler: DEFAULT_ERROR_HANDLER_CONFIG,
  environment: 'development',
}

// Environment-specific configuration overrides
export const PRODUCTION_CONFIG_OVERRIDES: Partial<EnhancedAuthConfig> = {
  environment: 'production',
  logger: {
    ...DEFAULT_LOGGER_CONFIG,
    logLevel: 'warn',
    enablePerformanceMetrics: false,
  },
  rateLimit: {
    ...DEFAULT_RATE_LIMIT_CONFIG,
    maxAttempts: 3,
    progressiveDelays: [120, 600, 1800, 3600], // 2min, 10min, 30min, 1hour
  },
}

export const DEVELOPMENT_CONFIG_OVERRIDES: Partial<EnhancedAuthConfig> = {
  environment: 'development',
  logger: {
    ...DEFAULT_LOGGER_CONFIG,
    logLevel: 'debug',
    enablePerformanceMetrics: true,
  },
  rateLimit: {
    ...DEFAULT_RATE_LIMIT_CONFIG,
    maxAttempts: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes for easier testing
  },
}

// Configuration validation
export interface ConfigValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Route configuration helpers
export interface RouteConfig {
  path: string
  requiresAuth: boolean
  allowedRoles?: ('admin' | 'editor')[]
  requiresSuperAdmin?: boolean
  rateLimitOverride?: Partial<RateLimitConfig>
}