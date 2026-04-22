# Code Style Rules

## Declarative Programming

- 페이지 단위 로딩 상태는 `app/[page-name]/loading.tsx`를 생성하여 핸들링합니다.
- 컴포넌트 단위 로딩 상태는 `React.Suspense`를 감싸서 핸들링합니다.
- 컴포넌트 단위 에러 핸들링은 컴포넌트 내부 처리 혹은 react-error-boundary의 `ErrorBoundary`로 감쌉니다.

## React Hooks Rules

**1. Never call `setState` directly inside `useEffect`** (`react-hooks/set-state-in-effect`)
**2. Never access refs during render** (`react-hooks/refs`)
**3. Always prefix Promise returns with `void`**

## File Naming Convention

- **Route files** (under `src/app/`): Next.js 규칙에 따라 `kebab-case` (e.g., `my-page/page.tsx`, `loading.tsx`)
- **Component files** (모든 `components/` 하위): `PascalCase.tsx` (e.g., `MyComponent.tsx`)
- **그 외 모든 파일** (hooks, store, utils, types 등): `camelCase.ts` (e.g., `useMyHook.ts`, `myStore.ts`)

## Path Aliases

import는 반드시 절대 경로를 사용합니다.

## Code Verification Checklist

**After writing code, ALWAYS verify:**

1. Run `pnpm typecheck` - Ensure no TypeScript errors
2. Run `pnpm lint` - Ensure no ESLint errors in the modified files
3. If errors exist, fix them before considering the task complete

**Common verification command:**

```bash
pnpm typecheck && pnpm lint 2>&1 | grep -A 5 "<folder-name>"
```
