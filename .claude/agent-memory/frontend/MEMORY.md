# Frontend Agent Memory

## Project: distributed-systems monorepo

### Stack

- React 19 + Vite 6 + TypeScript 5
- Bun as package manager and test runner
- ESLint 9 flat config (`eslint.config.mjs`)
- Prettier with `@trivago/prettier-plugin-sort-imports`

### Key File Locations

- Frontend app: `apps/frontend/`
- Shared types: `packages/shared/src/index.ts`
- Root ESLint config: `eslint.config.mjs`
- Root Prettier config: `.prettierrc.json`
- Knip config: `knip.json`

### Import Alias

- `#*` maps to `./src/*` (configured in both `package.json` `imports` field and `tsconfig.json` `paths`)
- `@distributed-systems/*` workspace packages resolved via Vite alias to `../../packages/$1/src/index.ts`

### Import Order (enforced by prettier plugin)

1. Third-party (`react`, `vite`, etc.)
2. `@distributed-systems/*` workspace packages
3. `#*` intra-package aliases
4. Relative `./` or `../`

### Conventions

- Named exports only — no default exports
- `import type` for type-only imports (verbatimModuleSyntax: true)
- `.tsx` for components, `.ts` for pure logic
- Kebab-case for all file and folder names
- Descriptive suffixes: `.component.tsx`, `.page.tsx`, `.context.tsx`, etc.

### Architecture Pattern (Screaming Architecture)

- `src/features/<domain>/` — all business logic grouped by domain
- `src/pages/<page>/` — thin entry-point components for routes
- No global `components/`, `hooks/`, or `contexts/` dumping grounds
- Each feature/complex component exposes a public API via `index.tsx`

### Knip Notes

- Redundant entry patterns produce hints (not errors) — keep entry minimal
- `index.html` alone as entry is sufficient for Vite projects; knip detects `vite.config.ts` and `src/main.tsx` automatically
- `tailwindcss` must be in `ignoreDependencies` — it's a peer dep of `@tailwindcss/vite`, not directly imported

### React ESLint

- `eslint-plugin-react` and `eslint-plugin-react-hooks` installed at root
- Scoped to `apps/frontend/**` in the flat config
- `react/react-in-jsx-scope` and `react/prop-types` disabled (not needed with React 19 + TypeScript)

### ESLint Flat Config: Declaration Files

- `*.d.ts` files match `**/*.ts` rules — always add a `*.d.ts` override block LAST in the config array
- Disable `@typescript-eslint/no-unused-vars` and `@typescript-eslint/no-empty-object-type` for `.d.ts` files (module augmentation patterns trigger false positives)

### TanStack Query Testing Patterns

- Always create a fresh `QueryClient` per test with `{ defaultOptions: { queries: { retry: false } } }`
- Use `mock.module("./use-invoices.hook", ...)` at the top of the test file (before imports) to replace the module
- Re-import mock using `await import("./use-invoices.hook")` inside each test and call `.mockImplementation()`
- For `useSuspenseQuery` + ErrorBoundary retry: use `useQueryErrorResetBoundary` in the feature container and pass `onReset={reset}` to `<ErrorBoundary>` — without this, TanStack Query re-throws the cached error after `resetErrorBoundary`
- Never-resolving promise `new Promise(() => {})` is the correct way to keep a component in Suspense for skeleton tests

### Testing Commands

- From root: `bun test apps/frontend`
- From workspace: `bun --cwd apps/frontend test`
- Lint/format/knip run only from monorepo root (not from `apps/frontend/`)
