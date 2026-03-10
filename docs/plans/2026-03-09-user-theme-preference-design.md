# User Theme Preference — Design Document

**Issue:** #305  
**Branch:** `user-theme-preference`

---

## Problem

The current theme toggle is client-side only (localStorage), offers only light/dark, and doesn't persist across devices or sessions. This feature moves theme preference to user meta storage and exposes a new Appearances section in the profile page.

---

## Scope

**In scope:**
- Four theme options: System, Light, Dark, Monochrome (grayscale)
- Persistent storage in `user_meta` table (`meta_key: 'theme'`)
- New Appearances section on `/profile`
- Remove ThemeToggle from authenticated layouts (Header mobile, MainLayout floating)
- Keep ThemeToggle on PublicLayout (light/dark only for unauthenticated users)

**Out of scope:** Custom colors, workspace-level themes, time-based switching, theme preview.

---

## Architecture

### 1. Data Layer — `src/lib/constants/user-meta-keys.ts`

Add `THEME` to `USER_META_KEYS`:

```ts
THEME: 'theme'
```

- Validation schema: `z.enum(['system', 'light', 'dark', 'monochrome'])`
- Default value: `'system'`
- Add `theme` field to `UserSettings` interface

No DB migration required — `user_meta` is a flexible key-value table.

---

### 2. Theme Application — `ThemeInit.astro` (new atom)

Replace `public/scripts/theme-init.js` with a new `src/components/atoms/ThemeInit.astro` component. It uses Astro's `is:inline define:vars` pattern to inject the server-side theme value cleanly, without global window pollution.

**Props:** `{ theme?: 'system' | 'light' | 'dark' | 'monochrome' }`

**Inline script logic:**
1. If `ssrTheme` is `null` (unauthenticated), fall back to `localStorage` key `'theme'`, then OS `prefers-color-scheme`.
2. Resolve `'system'` to `'light'` or `'dark'` based on `prefers-color-scheme`.
3. Set `document.documentElement.setAttribute('data-theme', resolvedTheme === 'monochrome' ? 'light' : resolvedTheme)`.
4. Set `document.documentElement.style.filter = resolvedTheme === 'monochrome' ? 'grayscale(100%)' : ''`.
5. Re-run on `astro:after-swap` to persist across view transitions.

**Monochrome:** Uses `filter: grayscale(100%)` on `<html>`. The underlying theme is `light`. No new DaisyUI theme is needed.

---

### 3. Layout Integration

**`src/layouts/ProtectedLayout.astro`:**
- Fetch user's theme via `userMetaService.getUserMeta(user.id, 'theme')` (defaults to `'system'` if unset).
- Replace `public/scripts/theme-init.js` script tag with `<ThemeInit theme={ssrTheme} />`.

**`src/layouts/PublicLayout.astro`:**
- Replace `public/scripts/theme-init.js` with `<ThemeInit />` (no prop = localStorage/system fallback).
- Keep `<ThemeToggle>` component (light/dark only, for unauthenticated users).

**`src/components/layouts/Header.astro`:**
- Remove `<ThemeToggle size="sm" className="lg:hidden" />` (mobile toggle).

**`src/layouts/MainLayout.astro`:**
- Remove `<ThemeToggle className="hidden lg:block fixed bottom-6 right-6 z-40" />` (desktop floating toggle).

**`public/scripts/theme-init.js`:** Delete this file (fully replaced by `ThemeInit.astro`).

---

### 4. API Endpoint — `src/pages/api/user/theme.ts`

New `PUT` endpoint:

- **Request body:** `{ theme: 'system' | 'light' | 'dark' | 'monochrome' }`
- **Success:** `200 { theme }`
- **Error:** `400` on invalid value, `401` on unauthenticated
- Calls `userMetaService.setUserMeta(userId, USER_META_KEYS.THEME, theme)`
- Uses CSRF headers (consistent with other user API endpoints)

A dedicated endpoint is preferred over extending `/api/user/profile` because theme is an immediate-save interaction (no form submit).

---

### 5. Profile UI — Appearances Section

**New file: `src/components/organisms/ManageAppearancesForm.astro`**

- Heading: "Appearances"
- Four theme option cards (radio-button style): System, Light, Dark, Monochrome
- Current theme pre-selected from SSR-fetched user meta
- Styled consistently with existing DaisyUI form components in the design system
- No submit button — selecting a card fires `PUT /api/user/theme` immediately

**New file: `src/components/organisms/ManageAppearancesForm.client.ts`**

- Listens for card selection
- Calls `PUT /api/user/theme`
- On success: applies theme to DOM using shared theme-application logic and shows a success toast
- On error: shows error toast, reverts selection

**`src/pages/profile.astro`:**
- Fetch `theme` from user meta (alongside existing profile data)
- Pass to `<ManageAppearancesForm currentTheme={theme} />`
- Render `ManageAppearancesForm` below `ManageAccountForms`

---

## Data Flow

```
User selects theme card
  → ManageAppearancesForm.client.ts
  → PUT /api/user/theme
  → userMetaService.setUserMeta(userId, 'theme', value)
  → 200 OK
  → Apply theme to DOM (data-theme + filter)
  → Show success toast

Next page load (authenticated)
  → ProtectedLayout SSR fetches theme from DB
  → ThemeInit.astro renders inline script with ssrTheme
  → Script runs in <head>, sets data-theme before first paint
  → Zero FOUC
```

---

## Error Handling

- Invalid theme value: API returns 400 with validation message
- DB write failure: API returns 500, client shows error toast and reverts selection
- Theme meta not set: defaults to `'system'` (resolved at both SSR and client)

---

## Testing

- Unit test: `user-meta-keys.ts` schema validates all four theme values and rejects invalid values
- Integration test: `PUT /api/user/theme` accepts valid values, rejects invalid, requires auth
- UI regression test: Verify `data-theme` and `filter` attributes are applied correctly for each theme option
