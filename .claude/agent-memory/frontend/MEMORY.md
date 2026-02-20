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

### React ESLint

- `eslint-plugin-react` and `eslint-plugin-react-hooks` installed at root
- Scoped to `apps/frontend/**` in the flat config
- `react/react-in-jsx-scope` and `react/prop-types` disabled (not needed with React 19 + TypeScript)
