// Authentication and Rate Limiting Constants

// Rate Limiting Constants
export const RATE_LIMIT = {
  DEFAULT_MAX_ATTEMPTS: 5,
  DEFAULT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  PROGRESSIVE_DELAYS: [60, 300, 900, 1800, 3600], // 1min, 5min, 15min, 30min, 1hour
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  IP_HEADER_NAMES: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
} as const

// Token Refresh Constants
export const TOKEN_REFRESH = {
  DEFAULT_THRESHOLD_MINUTES: 5,
  MAX_RETRY_ATTEMPTS: 3,
  BASE_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
  EXPONENTIAL_BACKOFF_FACTOR: 2,
} as const

// Authentication Event Types
export const AUTH_EVENTS = {
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGOUT: 'logout',
  TOKEN_REFRESH: 'token_refresh',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  SESSION_EXPIRED: 'session_expired',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
} as const

// Error Types
export const AUTH_ERROR_TYPES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_NOT_FOUND: 'account_not_found',
  ACCOUNT_DISABLED: 'account_disabled',
  TOKEN_EXPIRED: 'token_expired',
  INVALID_REFRESH_TOKEN: 'invalid_refresh_token',
  TOKEN_REFRESH_FAILED: 'token_refresh_failed',
  RATE_LIMITED: 'rate_limited',
  NETWORK_ERROR: 'network_error',
  SERVER_ERROR: 'server_error',
  SESSION_EXPIRED: 'session_expired',
} as const

// User-Friendly Error Messages
export const ERROR_MESSAGES = {
  [AUTH_ERROR_TYPES.INVALID_CREDENTIALS]: 'Email or password is incorrect',
  [AUTH_ERROR_TYPES.ACCOUNT_NOT_FOUND]: 'Email or password is incorrect', // Security: don't reveal account existence
  [AUTH_ERROR_TYPES.ACCOUNT_DISABLED]: 'Account is temporarily disabled. Contact support.',
  [AUTH_ERROR_TYPES.TOKEN_EXPIRED]: 'Session expired. Please log in again.',
  [AUTH_ERROR_TYPES.INVALID_REFRESH_TOKEN]: 'Session expired. Please log in again.',
  [AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED]: 'Session expired. Please log in again.',
  [AUTH_ERROR_TYPES.RATE_LIMITED]: 'Too many login attempts. Please try again in {waitTime}.',
  [AUTH_ERROR_TYPES.NETWORK_ERROR]: 'Connection problem. Please check your internet and try again.',
  [AUTH_ERROR_TYPES.SERVER_ERROR]: 'Service temporarily unavailable. Please try again later.',
  [AUTH_ERROR_TYPES.SESSION_EXPIRED]: 'Session expired. Please log in again.',
} as const

// Route Configuration
export const ROUTES = {
  PROTECTED: ['/dashboard', '/admin', '/profile'],
  PUBLIC: ['/', '/about', '/contact'],
  AUTH: ['/login', '/register', '/reset-password'],
  API: ['/api'],
} as const

// Security Constants
export const SECURITY = {
  SENSITIVE_FIELDS: ['password', 'token', 'refresh_token', 'access_token', 'secret'],
  MAX_LOG_RETENTION_DAYS: 90,
  SESSION_COOKIE_NAME: 'supabase-auth-token',
  CSRF_HEADER_NAME: 'x-csrf-token',
} as const

// Performance Constants
export const PERFORMANCE = {
  TOKEN_REFRESH_BUFFER_MS: 30000, // 30 seconds buffer before expiry
  MAX_CONCURRENT_REFRESHES: 1,
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  RETRY_JITTER_MAX_MS: 1000, // Max random jitter for retries
} as const

// Logging Constants
export const LOGGING = {
  MAX_LOG_ENTRY_SIZE: 10000, // characters
  BATCH_SIZE: 100,
  FLUSH_INTERVAL_MS: 5000, // 5 seconds
  LOG_LEVELS: ['debug', 'info', 'warn', 'error'] as const,
} as const

// Database Constants
export const DATABASE = {
  TABLES: {
    LOGIN_ATTEMPTS: 'login_attempts',
    AUTH_EVENTS: 'auth_events',
    RATE_LIMITS: 'rate_limits',
    USERS: 'users',
    USER_PROFILES: 'user_profiles',
  },
  MAX_QUERY_LIMIT: 1000,
  DEFAULT_QUERY_LIMIT: 50,
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Time Utilities
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const