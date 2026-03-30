# Code Style Rules

## Summary

1. **No comments in new/modified TypeScript code** - explain in conversation, not in code
2. **No `.passthrough()` in Zod schemas** - define only spec-defined fields
3. **No Memoization Hooks in React 19 Codes** - must not add useCallback, useMemo and React.memo in components.
4. **All API endpoints use `/T/dl/`, `/T/feat/`, or `/A/` prefix** (`/A/` is for academy app APIs)
5. **Korean naming with Romanization** is common in domain concepts (e.g., juso, jojik, sugangsaeng, bohoja)
6. **Separate CSS styles into `style.ts` files** - never write CSS in `.tsx` files. Never use inline `style={{}}`
7. **Use `src/ds/components` design system for `src/app/td/acap` pages** - When writing page code under `src/app/td/acap/`, actively use the design system components from `src/ds/components/` (Button, Input, Dropdown, Toggle, Label, Grid, ClassGroupPanel, ClassListPanel, Search, FilterTrigger, SortTrigger, Segment, Table, Icon, Modal, Textarea, etc.) instead of creating custom UI elements
8. **Use `src/ds-tm/components` design system for `src/app/tm/acap` pages** - When writing mobile page code under `src/app/tm/acap/`, use the mobile design system components from `src/ds-tm/components/` instead of desktop DS or custom UI elements

## Declarative Programming

- 페이지 단위 로딩 상태는 `app/[page-name]/loading.tsx`를 생성하여 핸들링합니다.
- 컴포넌트 단위 로딩 상태는 `React.Suspense`를 감싸서 핸들링합니다.
- 컴포넌트 단위 에러 핸들링은 컴포넌트 내부 처리 혹은 react-error-boundary의 `ErrorBoundary`로 감쌉니다.

## React Hooks Rules

**1. Never call `setState` directly inside `useEffect`** (`react-hooks/set-state-in-effect`)
**2. Never access refs during render** (`react-hooks/refs`)
**3. Always prefix Promise returns with `void`**

## File Naming Convention

- **Page files** (under `src/app/`): `kebab-case.tsx` (e.g., `my-page.tsx`)
- **Component files** (under `src/settla/`, `src/domain/`, etc.): `PascalCase.tsx` (e.g., `MyComponent.tsx`)

## Path Aliases

`@/*` maps to `./src/*`

## Code Verification Checklist

**After writing code, ALWAYS verify:**

1. Run `pnpm typecheck` - Ensure no TypeScript errors
2. Run `pnpm lint` - Ensure no ESLint errors in the modified files
3. If errors exist, fix them before considering the task complete

**Common verification command:**

```bash
pnpm typecheck && pnpm lint 2>&1 | grep -A 5 "<folder-name>"
```
