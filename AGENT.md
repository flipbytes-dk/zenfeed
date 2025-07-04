# Agent Instructions for ZenFeed

## Commands
- **Dev server**: `npm run dev` or `pnpm dev`
- **Build**: `npm run build` or `pnpm build`
- **Lint**: `npm run lint` or `pnpm lint`
- **Test**: `npx jest` (unit tests)
- **Test single file**: `npx jest path/to/file.test.tsx`

## Architecture
- **Next.js 15** App Router with TypeScript
- **Frontend**: React 19, shadcn/ui, Tailwind CSS v4
- **Testing**: Jest with ts-jest
- **Structure**: `app/` (pages/API), `components/ui/` (shadcn), `lib/` (utils)
- **Authentication**: NextAuth.js (planned)
- **Database**: PostgreSQL (planned)

## Code Style
- **Imports**: Use `@/` alias for root imports
- **Components**: Place in `components/ui/` for reusable UI, co-locate tests as `.test.tsx`
- **Utilities**: Use `lib/utils.ts` `cn()` for className merging
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Types**: Use TypeScript strict mode, prefer interfaces over types
- **Styling**: Tailwind CSS with shadcn/ui components

## Task Management
Follow tasks in `tasks/tasks-prd-zenfeed.md`. Complete one sub-task at a time before moving to the next.
