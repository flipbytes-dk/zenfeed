// Shared verification store to ensure data consistency across all auth routes
// TODO: Replace with actual database integration

export interface VerificationData {
  email: string;
  token: string;
  expires: Date;
  verified: boolean;
}

export interface UserData {
  email: string;
  passwordHash: string;
  verified: boolean;
  createdAt: Date;
}

// In-memory stores for demonstration
export const pendingVerifications = new Map<string, VerificationData>();
export const users = new Map<string, UserData>();

// Rate limiting store for resend attempts
export const resendAttempts = new Map<string, { count: number; lastAttempt: Date }>();

// Constants
export const MAX_RESEND_ATTEMPTS = 3;
export const RESEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours 