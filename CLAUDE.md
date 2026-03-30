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
pnpm typecheck    # Run TypeScript type checking (tsc --noEmit)
```

## Technologies

- **State Management**: Zustand (auth store)
