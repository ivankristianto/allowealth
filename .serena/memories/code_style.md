# Code Style & Conventions

## TypeScript

- Strict TypeScript throughout — `tsc --noEmit` must pass
- Explicit types over `any`; use type inference where appropriate
- Import project types from `@/lib/auth/types` etc., not library packages directly
- No `@ts-expect-error` or `eslint-disable` suppressions
- Separate `.ts` files for types (not inline in `<script>` tags)

## Naming

- Variables describe purpose explicitly (not `data`, `temp`, `x`)
- `.client.ts` suffix for client-side script files
- `data-*` attributes for passing server data to client scripts

## Imports

- Specific imports only: `import { foo } from '@/lib/utils/client'` not barrel `@/lib/utils`
- Type-only imports for server libraries used in client context: `import type`
- Validation: `import * as v from 'valibot'` (Valibot, NOT Zod)

## Patterns

- One function = one responsibility (SRP)
- Validate only at system boundaries (user input, external APIs)
- No silent catch blocks returning `[]` — surface or log actual errors
- Use `??` not `||` when 0 is a valid value
- `execFileSync` with argv array (not `execSync` with string interpolation — injection risk)

## Middleware / Workers Compatibility

- No `bun:` imports in middleware-imported code (must be Workers-compatible)
- No native addons in middleware context
- Use abstraction layer for DB (`getActiveSchema()`), env (`getEnv()`), cache (CacheManager)

## Comments & Commits

- Comments only where logic isn't self-evident
- Commit messages document _what_ and _why_
- No gratitude expressions or excessive apologies in responses
