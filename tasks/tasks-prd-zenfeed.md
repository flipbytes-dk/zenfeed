## Relevant Files

- `apps/web/pages/index.tsx` - Main landing page for the web app.
- `apps/web/pages/auth/` - Authentication pages (login, register, reset password, onboarding).
- `apps/web/pages/dashboard.tsx` - User dashboard for analytics and session management.
- `apps/web/components/SessionPlayer.tsx` - Component for content session playback.
- `apps/web/components/ContentSourceManager.tsx` - Manage user content sources and preferences.
- `apps/web/components/Subscription.tsx` - Subscription and payment UI.
- `apps/web/components/AnalyticsDashboard.tsx` - Analytics and progress visualization.
- `apps/web/components/Settings.tsx` - User settings and account management.
- `apps/web/styles/` - Tailwind and global styles.
- `apps/web/__tests__/` - Unit and integration tests for web components.
- `packages/api/` - Backend API for user, content, session, analytics, and payment endpoints.
- `packages/api/__tests__/` - API endpoint tests.
- `packages/auth/` - Authentication logic (NextAuth.js or similar).
- `packages/auth/__tests__/` - Auth logic tests.
- `packages/payments/` - Stripe payment integration and subscription logic.
- `packages/payments/__tests__/` - Payment logic tests.
- `packages/content/` - Content aggregation, curation, and API integrations.
- `packages/content/__tests__/` - Content logic tests.
- `packages/analytics/` - Analytics and dashboard logic.
- `packages/analytics/__tests__/` - Analytics logic tests.
- `packages/ui/` - Shared UI components (shadcn/ui, Tailwind CSS).
- `lib/utils/` - Utility functions and helpers.
- `lib/utils/__tests__/` - Utility function tests.
- `app/auth/register/page.tsx` - Registration page for user sign up with email and password.
- `app/auth/verify-email/page.tsx` - Email verification page that handles verification tokens.
- `app/api/auth/register/route.ts` - API route for user registration and sending verification emails.
- `app/api/auth/verify-email/route.ts` - API route for handling email verification.
- `app/api/auth/resend-verification/route.ts` - API route for resending verification emails.
- `app/auth/login/page.tsx` - Login page for user authentication with email and password.
- `app/api/auth/login/route.ts` - API route for user login and session creation.
- `app/api/auth/logout/route.ts` - API route for user logout and session termination.
- `app/api/auth/me/route.ts` - API route for fetching authenticated user data with server-side session validation.
- `app/dashboard/page.tsx` - Dashboard page with secure authentication and real user data.
- `app/settings/page.tsx` - Settings page with account management and deletion UI.
- `app/settings/delete-account/page.tsx` - Multi-step account deletion confirmation flow with password verification.
- `app/auth/deleted/page.tsx` - Post-deletion confirmation page shown after successful account deletion.
- `app/api/auth/delete-account/route.ts` - Backend API endpoint for account deletion with authentication and data removal.
- `lib/auth/data-removal.ts` - Comprehensive data removal service for complete user data deletion across all storage systems.
- `lib/auth/data-removal.test.ts` - Test suite for the data removal service to ensure comprehensive data cleanup.
- `lib/auth/deletion-security.ts` - Advanced security service with rate limiting, audit logging, and comprehensive security checks for deletions.
- `lib/auth/deletion-security.test.ts` - Test suite for the deletion security service with comprehensive security scenario testing.
- `lib/auth/utils.ts` - Authentication utility functions for session validation and middleware.
- `app/auth/reset-password/page.tsx` - Password reset request page where users enter their email.
- `app/api/auth/reset-password/route.ts` - API route for handling password reset requests and sending reset emails.
- `app/auth/reset-password/confirm/page.tsx` - Password reset confirmation page where users enter their new password.
- `app/api/auth/reset-password/confirm/route.ts` - API route for confirming password reset with token validation.
- `lib/stores/verification-store.ts` - Updated shared store with session management, password reset tokens, and onboarding preferences.
- `app/auth/onboarding/page.tsx` - Multi-step onboarding flow for user preferences and initial setup with data submission.
- `app/api/auth/onboarding/route.ts` - API endpoint for storing and retrieving user onboarding preferences.
- `app/dashboard/content-sources/page.tsx` - Content sources management page for adding/editing/removing content sources with UI for various source types.
- `components/ui/button.tsx` - shadcn/ui Button component.
- `components/ui/input.tsx` - shadcn/ui Input component.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 User Authentication & Onboarding
  - [x] 1.1 Implement user registration with email and password
  - [x] 1.2 Implement email verification flow
  - [x] 1.3 Implement login and logout functionality
  - [x] 1.4 Implement password reset via email
  - [x] 1.5 Implement onboarding flow for initial preferences (interests, time limits)
    - [x] 1.5.1 Create onboarding page structure and routing
    - [x] 1.5.2 Implement interest/topic selection interface
    - [x] 1.5.3 Implement time limit preference settings
    - [x] 1.5.4 Add onboarding data storage and API endpoints
    - [x] 1.5.5 Integrate onboarding flow with registration/login
  - [x] 1.6 Implement account deletion and data removal
    - [x] 1.6.1 Create account deletion UI in settings/profile section
    - [x] 1.6.2 Implement deletion confirmation flow with password verification
    - [x] 1.6.3 Create backend API endpoint for account deletion
    - [x] 1.6.4 Implement complete data removal from all storage systems
    - [x] 1.6.5 Add security measures and audit logging for deletions
  - [x] 1.7 Add authentication tests (unit/integration)
    - [x] 1.7.1 Add tests for user registration and email verification APIs
    - [x] 1.7.2 Add tests for login and logout functionality
    - [x] 1.7.3 Add tests for password reset flow
    - [x] 1.7.4 Add tests for onboarding flow and preferences
    - [x] 1.7.5 Add tests for account deletion and security measures
    - [x] 1.7.6 Add integration tests for complete authentication flows

- [ ] 2.0 Content Source Management & Integration
  - [x] 2.1 Design UI for adding/editing/removing content sources
  - [x] 2.2 Implement search and selection of predefined categories/topics
  - [x] 2.3 Implement input for usernames/channels and RSS/newsletter URLs
  - [x] 2.4 Integrate with YouTube, Instagram, X/Twitter, RSS, Substack APIs
  - [ ] 2.5 Implement social account connection/import
  - [ ] 2.6 Implement priority settings for topics (High/Medium/Low)
  - [ ] 2.7 Implement validation and testing of content sources
  - [ ] 2.8 Add content source management tests

- [ ] 3.0 Time Management & Session Control
  - [ ] 3.1 Implement session duration and scheduling UI
  - [ ] 3.2 Implement backend logic for session scheduling and limits
  - [ ] 3.3 Implement session pause/resume functionality
  - [ ] 3.4 Enforce no rewind/go-back during sessions
  - [ ] 3.5 Implement time warnings at 80% and 95% of session
  - [ ] 3.6 Implement session summary and auto-end logic
  - [ ] 3.7 Add session control tests

- [ ] 4.0 Content Curation & Presentation
  - [ ] 4.1 Implement content curation logic to fit time slots
  - [ ] 4.2 Implement balancing algorithm for topic coverage (7-day rotation)
  - [ ] 4.3 Implement carry-over of unshown content to next session
  - [ ] 4.4 Design and implement distraction-free content player UI
  - [ ] 4.5 Support video, text, image, and audio content formats
  - [ ] 4.6 Show source attribution and topic indicators
  - [ ] 4.7 Add content curation and player tests

- [ ] 5.0 Analytics & Dashboard
  - [ ] 5.1 Implement backend analytics tracking (time spent, topics, content types)
  - [ ] 5.2 Design and implement dashboard UI (daily/weekly/monthly stats)
  - [ ] 5.3 Implement streaks, achievements, and progress indicators
  - [ ] 5.4 Implement data export (CSV, JSON)
  - [ ] 5.5 Add analytics and dashboard tests

- [ ] 6.0 Subscription & Payment Management
  - [ ] 6.1 Implement free and premium tier logic (limits, features)
  - [ ] 6.2 Integrate Stripe for payment processing
  - [ ] 6.3 Implement subscription upgrade/downgrade/cancel flows
  - [ ] 6.4 Implement billing history and invoice downloads
  - [ ] 6.5 Handle failed payments and renewals
  - [ ] 6.6 Add payment and subscription tests

- [ ] 7.0 Technical Infrastructure & Compliance
  - [ ] 7.1 Set up project structure (monorepo, workspaces, CI/CD)
  - [ ] 7.2 Implement caching for offline session content
  - [ ] 7.3 Implement error handling for API rate limits and downtime
  - [ ] 7.4 Ensure GDPR and privacy compliance
  - [ ] 7.5 Implement logging and monitoring
  - [ ] 7.6 Add infrastructure and compliance tests 