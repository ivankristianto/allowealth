# User Meta Table Plan

## Objective

Replace `USER_SETTINGS` with a flexible `USER_META` table (meta_id, user_id, meta_key, meta_value), add helper utilities, update APIs, seed default currency per user, and update schema docs. No data migration/backward compatibility work is included.

## Scope

- Create `user_meta` table with `meta_id` PK, `user_id` FK, `meta_key`, `meta_value`, timestamps, and unique constraint on `(user_id, meta_key)`.
- Remove `user_settings` table and all usage.
- Provide user meta helpers (get/add/update/delete) consistent with project naming conventions.
- Add `/user/meta/list` endpoint (auth user only).
- Extend `/user/:id?meta=currency` to include user data + requested meta.
- Update seed data to ensure each user has a default currency meta.
- Update `docs/architecture/004-database-schema.md`.

## Non-Goals

- No data migration from `user_settings` to `user_meta`.
- No backward compatibility for old settings APIs or storage.

## Implementation Plan (UI → Service → API → CLI → Seeder)

### 1) UI

- Replace all reads of `userSettings.primaryCurrency` with user meta access (currency).
- Update layout or page locals to expose the currency meta where needed.
- Ensure any UI that depends on settings uses the new meta shape.

### 2) Service

- Add meta helpers (e.g., `getUserMeta`, `addUserMeta`, `updateUserMeta`, `deleteUserMeta`) in the user service or a dedicated user-meta service.
- Enforce unique `(user_id, meta_key)` behavior in helper logic.
- Replace `getSettings`/`updateSettings` usage with meta-based equivalents for currency.

### 3) API

- Add `GET /user/meta/list` for authenticated user (returns all meta for user).
- Update `GET /user/:id?meta=currency` to include user data + meta payload when `meta` is provided.
- Remove/replace endpoints that read/write `user_settings`.
- Update OpenAPI docs (`openapi/paths/user.yml`, schemas, and `openapi.yml` refs as needed).

### 4) CLI

- If any CLI relies on settings, update to use user meta (currency).

### 5) Seeder

- Remove seeding of `user_settings`.
- Insert default `meta_key=currency` for each user with `meta_value` set to the default currency.

## Schema Changes

- Add `user_meta` table in both SQLite and PostgreSQL schemas:
  - `meta_id` (text PK)
  - `user_id` (text FK → users.id, cascade delete)
  - `meta_key` (text, not null)
  - `meta_value` (text, not null; JSON allowed as string)
  - timestamps
  - unique `(user_id, meta_key)`
- Remove `user_settings` table and relations.

## Docs Update

- Update ERD and narrative in `docs/architecture/004-database-schema.md` to replace `USER_SETTINGS` with `USER_META`.
- Update any references to `user_settings.primary_currency` to the new meta model.

## Tests

- Update service and API tests to use user meta instead of settings.
- Update DB integration tests to assert `user_meta` presence and `user_settings` removal.
- Ensure tests cover default currency meta and unique key constraint behavior.

## Acceptance Criteria

- No references to `user_settings` remain in code or docs.
- User currency is sourced from `user_meta` everywhere.
- `/user/meta/list` returns authenticated user’s meta only.
- `/user/:id?meta=currency` returns user data + meta.
- Seeder creates default currency meta for every user.
- `docs/architecture/004-database-schema.md` reflects new schema.
