# Categories Table Rename + Description Plan

## Objective

- Rename the `categories` table to **`budget_categories`** (lowercase, no backward compatibility).
- Add optional `description` column (nullable text, max 200 chars).
- Expose `description` **only** in the Categories page table UI.
- Update seeder and all relevant tests.
- Update OpenAPI docs for any API shape changes.

## Progress Tracking

| Task                            | Status  | Notes                                           |
| ------------------------------- | ------- | ----------------------------------------------- |
| 1. Update plan document         | ✅ Done | Changed table name to lowercase                 |
| 2. Update database schemas      | ✅ Done | SQLite + PostgreSQL, added description column   |
| 3. Update types and validation  | ✅ Done | Added description field (nullable, max 200)     |
| 4. Update category service      | ✅ Done | Handle description in create/update             |
| 5. Update API routes            | ✅ Done | No changes needed (uses validation schemas)     |
| 6. Update CategoryModal UI      | ✅ Done | Added description input field                   |
| 7. Update Categories page table | ✅ Done | Added description column (hidden on mobile)     |
| 8. Update seeder                | ✅ Done | Added sample descriptions to categories         |
| 9. Update OpenAPI docs          | ✅ Done | Added description to Category schemas           |
| 10. Generate migrations         | ✅ Done | Destructive drop/recreate with db:push          |
| 11. Update tests                | ✅ Done | Unit tests + integration test mocks             |
| 12. Run quality gates           | ✅ Done | lint, stylelint, format, typecheck, test passed |

## Dependencies (Internal + External)

### Internal modules & files

- Database schemas (SQLite + PostgreSQL):
  - `src/db/schema/sqlite/categories.ts`
  - `src/db/schema/postgresql/categories.ts`
  - Relations and FKs: `src/db/schema/*/relations.ts`, `src/db/schema/*/budgets.ts`, `src/db/schema/*/transactions.ts`
- Migrations & snapshots:
  - `drizzle/sqlite/*.sql`
  - `drizzle/sqlite/meta/*.json`
  - `drizzle/postgresql/*` (if generated)
- Validation & types:
  - `src/lib/validation/categories.ts`
  - `src/lib/types/category.ts`
- Services:
  - `src/services/category.service.ts`
  - `src/services/transaction.service.ts` (reads categories)
- API routes:
  - `src/pages/api/categories/index.ts`
  - `src/pages/api/categories/[id].ts`
- UI:
  - `src/pages/categories/index.astro`
  - `src/pages/categories/categories-client.ts`
  - `src/components/organisms/CategoryModal.astro` (if description editable)
- Seeder:
  - `src/db/seed.ts`
- OpenAPI:
  - `openapi/schemas/Category.yml`
  - `openapi/schemas/CreateCategoryRequest.yml`
  - `openapi/schemas/UpdateCategoryRequest.yml`
  - `openapi/schemas/CategoriesListResponse.yml`
  - `openapi/paths/categories.yml`
- Tests:
  - `src/services/category.service.test.ts`
  - `src/pages/api/categories/categories.api.integration.test.ts`
  - `src/db/index.integration.test.ts`
  - Any UI tests/stories that assert category fields

### External libraries & tooling

- Drizzle ORM + drizzle-kit (schema + migrations)
- Bun runtime + `bun:test`
- Astro (SSR pages + API routes)
- Zod (validation)
- Lucide icons (UI consistency)
- DaisyUI / Tailwind (table styling)

## Potential Security / Integrity Risks

- **Stored XSS risk** if `description` is ever inserted via `innerHTML` or unescaped template injection. Mitigate by rendering as plain text (Astro escapes by default) and avoid client-side `innerHTML` with user content.
- **Unbounded input size** could lead to DB bloat or slow responses. Mitigate with a strict max length (200 chars) in validation and (optional) DB constraint.
- **Data integrity during rename**: renaming a table with foreign keys can orphan budgets/transactions if migration is destructive or incomplete. Ensure migrations update FKs and preserve rows.
- **Case-sensitivity/quoting**: Using lowercase `budget_categories` eliminates quoting issues across SQLite and PostgreSQL.
- **Exposure scope**: API responses will include `description` by default (confirmed). Ensure it is treated as user-provided text in any consumer UI.
- **Intentional data loss**: destructive drop/recreate is acceptable, but must be explicit in migration notes and release notes to avoid surprise loss of existing categories.

## Minimal Viable File Structure (Target Changes)

```
src/db/schema/sqlite/categories.ts
src/db/schema/postgresql/categories.ts
src/db/schema/sqlite/relations.ts
src/db/schema/postgresql/relations.ts
src/db/schema/sqlite/budgets.ts
src/db/schema/postgresql/budgets.ts
src/db/schema/sqlite/transactions.ts
src/db/schema/postgresql/transactions.ts

drizzle/sqlite/<new_migration>.sql

drizzle/sqlite/meta/<new_snapshot>.json
(drizzle/postgresql/<new_migration>.sql)  # if generated for PG

src/lib/validation/categories.ts
src/lib/types/category.ts

src/services/category.service.ts
src/pages/api/categories/index.ts
src/pages/api/categories/[id].ts

src/pages/categories/index.astro
src/pages/categories/categories-client.ts
src/components/organisms/CategoryModal.astro  # only if description is editable

src/db/seed.ts

openapi/schemas/Category.yml
openapi/schemas/CreateCategoryRequest.yml
openapi/schemas/UpdateCategoryRequest.yml
openapi/schemas/CategoriesListResponse.yml
openapi/paths/categories.yml

src/services/category.service.test.ts
src/pages/api/categories/categories.api.integration.test.ts
src/db/index.integration.test.ts
```

## Execution Plan (UI → Service → API → CLI → Seeder)

### 1) UI (first per constitution)

- Add a **Description** column in the Categories table (`/categories`) with a safe fallback (e.g., em dash) when empty.
- Add an optional single-line `description` field to `CategoryModal` (create/edit only), max 200 chars, with label + helper text and wire it to form submission.
- Update `categories-client.ts` to include `description` when populating edit modal and on POST/PUT payloads.
- Keep search behavior name-only (no description matching).

### 2) Service + DB Schema

- Update Drizzle schema definitions to:
  - Rename the table to `budget_categories`.
  - Add `description` column (nullable or default empty string).
- Update relations and FK references (budgets/transactions) to the renamed table.
- Update Category service to accept/persist `description` on create/update.
- Update validation schemas to allow optional `description` with max length 200 and empty string allowed.
- Update shared types (`Category`, `CategoryOutput`) accordingly.

### 3) API

- Extend API validation schemas and handlers to accept/return `description` (included in responses by default).
- Update OpenAPI docs (schemas + examples) to reflect the new field and table rename where relevant.

### 4) CLI

- Check for any category-related CLI scripts. If present, add optional `description` support; otherwise document no changes.

### 5) Seeder

- Update seed data to set `description` (meaningful samples or empty string), and ensure inserts align with the new schema.

### 6) Migrations + Tests + Quality Gates

- Generate migrations for SQLite (and PostgreSQL if used), using **destructive drop/recreate** to satisfy the rename + column add.
- Update tests to include `description` and reflect new schema/table name.
- Run quality gates: `bun run lint:fix`, `bun run stylelint:fix`, `bun run format:fix`, `bun run typecheck`, and `bun run test`.

## Open Questions / Assumptions

- **Resolved:** Description is editable in CategoryModal (create/edit only).
- **Resolved:** Description is included in API responses by default and used on Categories page.
- **Resolved:** Description is single-line, max 200 chars, optional.
- **Resolved:** Destructive drop/recreate migration is acceptable.
- **Resolved:** Search remains name-only.
