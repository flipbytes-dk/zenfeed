// Shared verification store to ensure data consistency across all auth routes
// TODO: Replace with actual database integration

export interface VerificationData {
  email: string;
  token: string;
  expires: Date;
  verified: boolean;
}

export interface PasswordResetData {
  email: string;
  token: string;
  expires: Date;
  used: boolean;
}

export interface UserData {
  email: string;
  passwordHash: string;
  verified: boolean;
  createdAt: Date;
  onboardingCompleted?: boolean;
}

export interface OnboardingData {
  email: string;
  interests: string[];
  defaultSessionDuration: number; // in minutes
  dailyTimeLimit: number; // in minutes, -1 for unlimited
  maxSessionsPerDay: number;
  completedAt: Date;
}

// In-memory stores for demonstration
export const pendingVerifications = new Map<string, VerificationData>();
export const users = new Map<string, UserData>();
export const passwordResets = new Map<string, PasswordResetData>();
export const onboardingPreferences = new Map<string, OnboardingData>();

// Rate limiting store for resend attempts
export const resendAttempts = new Map<string, { count: number; lastAttempt: Date }>();

// Rate limiting store for password reset attempts
export const resetAttempts = new Map<string, { count: number; lastAttempt: Date }>();

// Session store for user authentication
export const sessions = new Map<string, {
  userId: string;
  email: string;
  expires: Date;
  createdAt: Date;
}>();

// Constants
export const MAX_RESEND_ATTEMPTS = 3;
export const RESEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const MAX_RESET_ATTEMPTS = 3;
export const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour (shorter for security)

export const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
