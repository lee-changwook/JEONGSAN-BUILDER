# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # Run ESLint on .ts/.tsx files
pnpm lint:fix     # Auto-fix lint issues
pnpm format       # Check Prettier formatting
pnpm format:write # Apply Prettier formatting
npx tsc --noEmit  # Run TypeScript type checking
```

## Technologies

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS v4, tw-animate-css
- **UI Components**: shadcn/ui, Base UI, lucide-react
- **State Management**: Zustand v5
- **Excel**: exceljs, xlsx
- **Validation**: Zod v4
- **Error Handling**: react-error-boundary
- **Path Alias**: `@/*` → `src/*`
