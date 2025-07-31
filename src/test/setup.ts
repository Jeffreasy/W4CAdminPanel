import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Set NODE_ENV for tests (handle read-only property)
try {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test'
  }
} catch (error) {
  // NODE_ENV might be read-only in some environments, ignore the error
}