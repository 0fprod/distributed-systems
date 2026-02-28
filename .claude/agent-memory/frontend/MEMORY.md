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

### WebSocket Hook Testing Pattern

- Replace `globalThis.WebSocket` with a `mock()` constructor in `beforeEach`; use `@ts-expect-error` to suppress the type error
- The mock constructor must return a plain object with `url`, `onmessage: null`, and `close: mock()`; capture the last instance in a module-level `let lastSocket` variable
- Trigger messages via `lastSocket.onmessage!(new MessageEvent("message", { data: JSON.stringify(...) }))` inside `act(async () => { ... })`
- In HappyDOM, `window.location.protocol` is `"http:"` and `window.location.host` is `""`, so `buildWsUrl("/ws")` produces `"ws:///ws"` — assert that exact string in the URL test
- `spyOn(client, "invalidateQueries")` works for TanStack Query invalidation assertions; alternatively assign `client.invalidateQueries = mock(...)` directly

### Import Map: `.ts` vs `.tsx` in `#shared/*`

- `package.json` imports: `"#shared/*": "./src/shared/*.ts"` — enforces `.ts` extension
- `.tsx` files in `src/shared/` (e.g., `protected-route.tsx`) are NOT resolvable via `#shared/*` in bun tests
- Vite resolves `#shared/*` via its regex alias without extension enforcement, so `.tsx` works at build/dev time
- Do NOT change `#shared/*` to `./src/shared/*` (no extension) — bun can't resolve ambiguous paths
- For `.tsx` files in shared that are only used in `app.tsx` (not tested directly), the Vite alias works fine
- Hook files (`.ts`) in `src/shared/` are fine: `use-current-user.ts`, `request.ts`, `query-keys.ts`, etc.

### Routing (react-router-dom v7)

- Installed in `apps/frontend` as `react-router-dom@7.x`
- `BrowserRouter` wraps the app in `app.tsx`; `QueryClientProvider` is the outer wrapper
- `ProtectedRoute` uses `<Outlet />` as the child placeholder — nest protected routes inside `<Route element={<ProtectedRoute />}>`
- Vite proxy must include `/login`, `/logout`, `/me`, `/register` routes pointing to `http://localhost:3000`

### Sentry Integration (@sentry/react 10.x)

- Entry point: `src/instrument.ts` — imported as first side-effect in `main.tsx`
- Init: `enabled: !!import.meta.env.VITE_SENTRY_DSN` disables Sentry when DSN is absent (dev)
- `Sentry.reactErrorHandler()` return type clashes with React 19's `createRoot` options under `exactOptionalPropertyTypes: true` — use a plain bridge wrapper instead:
  ```ts
  const sentryErrorHandler = (
    error: unknown,
    errorInfo: { componentStack?: string | undefined },
  ) => {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack ?? null } },
    });
  };
  ```
- `Sentry.ErrorBoundary` wraps the `<Routes>` tree in `app.tsx`
- `Sentry.setUser({ id, email })` called in login `onSuccess` after refetchQueries; `Sentry.setUser(null)` in logout `onSuccess`
- `request.ts` injects `X-Request-ID: crypto.randomUUID()` on every fetch; on `status >= 500` calls `Sentry.captureMessage` with the response `x-request-id` header as a tag
- DSN configured via `VITE_SENTRY_DSN` env var (see `apps/frontend/.env.example`)

### Testing Commands

- From root: `bun test apps/frontend`
- From workspace: `bun --cwd apps/frontend test`
- Lint/format/knip run only from monorepo root (not from `apps/frontend/`)
