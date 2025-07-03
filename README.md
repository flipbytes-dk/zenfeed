# ZenFeed

ZenFeed is a curated social media consumption app designed to prevent doom scrolling and promote mindful digital habits. It aggregates content from platforms like YouTube, Instagram, X/Twitter, blogs, newsletters, and Substack, presenting it in time-controlled, intentional viewing sessions. Users specify their interests and time limits, and ZenFeed curates content to fit within those boundaries, helping users avoid endless scrolling and stay focused.

## Project Overview

- **Purpose:** Combat social media addiction by providing a controlled, curated feed based on user interests and time slots.
- **Platforms:** Web (Next.js) and future mobile support.
- **Key Features:**
  - User authentication and onboarding
  - Multi-source content aggregation (APIs, RSS, manual links)
  - Time-managed sessions with no rewind
  - Analytics dashboard for digital wellness
  - Free and premium subscription tiers (Stripe integration)
  - Modern, distraction-free UI (shadcn/ui, Tailwind CSS)

For full requirements, see [`tasks/prd-zenfeed.md`](tasks/prd-zenfeed.md).

## Task Management

Development is tracked in [`tasks/tasks-prd-zenfeed.md`](tasks/tasks-prd-zenfeed.md) using a detailed, step-by-step task list. Each sub-task is implemented and marked as completed before moving to the next, following a strict protocol for progress tracking and code quality.

## Tech Stack

- **Frontend:** Next.js (App Router), React, shadcn/ui, Tailwind CSS
- **Backend:** (Planned) Node.js/Express or Python/FastAPI
- **Database:** (Planned) PostgreSQL
- **Authentication:** NextAuth.js (planned)
- **Payments:** Stripe (planned)
- **Testing:** Jest (unit/integration tests)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```
2. **Run the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js app directory (pages, routes, layouts)
- `components/ui/` - shadcn/ui components (Button, Input, etc.)
- `tasks/` - Product requirements and task lists
- `lib/` - Utility functions

## Contribution & Testing

- Follow the task list in [`tasks/tasks-prd-zenfeed.md`](tasks/tasks-prd-zenfeed.md).
- Implement one sub-task at a time and mark it as complete before moving on.
- Place unit tests alongside code files (e.g., `MyComponent.tsx` and `MyComponent.test.tsx`).
- Run all tests with:
  ```bash
  npx jest
  ```
- Use conventional commit messages (e.g., `feat:`, `fix:`, `refactor:`).

## License

MIT

---

For more details, see the full [Product Requirements Document](tasks/prd-zenfeed.md).
