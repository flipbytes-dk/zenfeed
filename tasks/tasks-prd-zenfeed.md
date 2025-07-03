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
- `components/ui/button.tsx` - shadcn/ui Button component.
- `components/ui/input.tsx` - shadcn/ui Input component.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [ ] 1.0 User Authentication & Onboarding
  - [x] 1.1 Implement user registration with email and password
  - [x] 1.2 Implement email verification flow
  - [ ] 1.3 Implement login and logout functionality
  - [ ] 1.4 Implement password reset via email
  - [ ] 1.5 Implement onboarding flow for initial preferences (interests, time limits)
  - [ ] 1.6 Implement account deletion and data removal
  - [ ] 1.7 Add authentication tests (unit/integration)

- [ ] 2.0 Content Source Management & Integration
  - [ ] 2.1 Design UI for adding/editing/removing content sources
  - [ ] 2.2 Implement search and selection of predefined categories/topics
  - [ ] 2.3 Implement input for usernames/channels and RSS/newsletter URLs
  - [ ] 2.4 Integrate with YouTube, Instagram, X/Twitter, RSS, Substack APIs
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