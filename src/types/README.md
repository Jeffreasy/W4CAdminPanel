# Enhanced Authentication & Rate Limiting System - Types

This directory contains all TypeScript interfaces, types, and constants for the Enhanced Authentication & Rate Limiting System.

## Structure

### Core Type Files

- **`auth.ts`** - Authentication-related types including events, errors, sessions, and context types
- **`services.ts`** - Service interface definitions for all authentication services
- **`supabase.ts`** - Supabase integration types matching the existing database schema
- **`config.ts`** - Configuration types and default configurations for all system components
- **`index.ts`** - Main export file that re-exports all types, constants, and utilities

### Supporting Files

- **`../constants/auth.ts`** - Authentication constants including rate limits, error messages, and system defaults
- **`../utils/typeGuards.ts`** - Type guards, validation functions, and sanitization utilities

## Key Types

### Authentication Types

- `AuthEventType` - Types of authentication events that can occur
- `AuthError` - Structured error type for authentication failures
- `UserFriendlyError` - User-facing error messages with actionable information
- `EnhancedSession` - Extended session management with refresh capabilities
- `AuthContextType` - Enhanced authentication context interface

### Service Interfaces

- `TokenRefreshService` - Interface for automatic token refresh functionality
- `RateLimitService` - Interface for intelligent rate limiting
- `ErrorHandlerService` - Interface for error handling and user message generation
- `LoggerService` - Interface for structured authentication event logging

### Supabase Integration

- `SupabaseUser` - User record from the existing users table
- `SupabaseUserProfile` - User profile from the user_profiles table
- `LoginAttemptRecord` - Database record for login attempts
- `AuthEventRecord` - Enhanced event logging record structure

### Configuration

- `EnhancedAuthConfig` - Main system configuration
- `RateLimitConfig` - Rate limiting parameters and thresholds
- `TokenRefreshConfig` - Token refresh behavior configuration
- `MiddlewareConfig` - Route protection and middleware settings

## Usage

```typescript
import type { 
  AuthContextType, 
  TokenRefreshService, 
  RateLimitConfig 
} from '../types'

import { 
  DEFAULT_ENHANCED_AUTH_CONFIG,
  AUTH_EVENTS,
  isAuthError,
  validateEmail 
} from '../types'
```

## Constants

All constants are defined in `../constants/auth.ts` and include:

- `RATE_LIMIT` - Rate limiting defaults and thresholds
- `TOKEN_REFRESH` - Token refresh timing and retry settings
- `AUTH_EVENTS` - Authentication event type constants
- `AUTH_ERROR_TYPES` - Error type constants
- `ERROR_MESSAGES` - User-friendly error message templates
- `ROUTES` - Route configuration constants
- `SECURITY` - Security-related constants
- `PERFORMANCE` - Performance tuning constants

## Type Guards and Validation

The `../utils/typeGuards.ts` file provides:

- Type guards for runtime type checking
- Validation functions for emails, passwords, and data structures
- Sanitization functions for user input
- Error creation and categorization utilities

## Requirements Satisfied

This implementation satisfies the following requirements from the task:

- ✅ **1.1** - Token refresh types and interfaces
- ✅ **2.1** - Rate limiting types and configuration
- ✅ **3.1** - Error handling types and user-friendly messages
- ✅ **4.1** - Logging service interface and event types
- ✅ **5.1** - Middleware configuration and route protection types

## Next Steps

These types will be used by the service implementations in subsequent tasks:

1. Task 2: Enhanced Logger Service implementation
2. Task 3: Error Handler Service implementation  
3. Task 4: Rate Limiting Service implementation
4. Task 5: Token Refresh Service implementation
5. Task 6: Enhanced Authentication Context integration