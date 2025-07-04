// Jest setup file for global test configuration

// Mock environment variables for testing
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Mock Next.js server components and other Next.js specific features
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

// Use real crypto for proper random values and security functions
// Tests will use actual crypto functions for realistic behavior

// Global test timeout
jest.setTimeout(10000);

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
}); 