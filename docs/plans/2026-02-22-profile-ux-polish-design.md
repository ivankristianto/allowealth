# Profile Page UX Polish - Design

**Issue:** [#262 - Profile: Short Bio field has no purpose, layout misaligns avatar with form fields](https://github.com/ivankristianto/allowealth/issues/262)
**Date:** 2026-02-22
**Severity:** Low (polish and clarity)

## Summary

Four UX improvements to the `/profile` page addressing layout, unused fields, and visual consistency.

## Changes

### 1. Remove Short Bio Field

Full removal of the bio feature — no UI surface uses it in this personal finance app.

**Remove from:**

- `ManageAccountForms.astro` — textarea element
- `profile.astro` — `bio` from client-side form submission data
- `api/user/profile.ts` — `bio` from PUT handler body parsing
- `user-meta-keys.ts` — `BIO` key constant, default value, validation schema
- `user-meta.service.ts` — `bio` from `UserSettings` type and `getUserSettings` defaults

**No migration needed.** Orphaned `bio` rows in `user_meta` table are harmless since the key is removed from the allowlist.

### 2. Center Avatar Above Form Fields

Replace the current side-by-side (avatar left, fields right) layout with avatar centered above full-width form fields.

```
┌──────────────────────────────────────────┐
│  [User icon] Public Profile              │
│              General Information          │
│                                          │
│              ┌──────┐                    │
│              │  IK  │                    │
│              └──────┘                    │
│            Change Photo                  │
│                                          │
│  Full Name     [_______________________] │
│  Email         [_______________________] │
│  Phone Number  [_______________________] │
│                                          │
│                  [Save Profile Changes]  │
└──────────────────────────────────────────┘
```

**In `ManageAccountForms.astro`:**

- Replace `flex flex-col gap-6 lg:flex-row` with stacked layout
- Avatar section: `flex flex-col items-center gap-3 mb-6` (centered, no `lg:w-40`)
- Form fields: full-width below avatar (remove `flex-1` wrapper)

### 3. Add Phone Number Format Hint

Add helper text below the phone input matching the existing email hint style:

```html
<p class="mt-1.5 text-xs text-base-content/40">Include country code, e.g. +62 812 3456 7890</p>
```

No input masking or validation changes.

### 4. Add Icon + Subtitle to Password Change Card

Make the password card heading consistent with the profile card's `IconBadge + title + subtitle` pattern.

**In `PasswordChangeForm.astro`:**

- Import `IconBadge` and `Lock` icon
- Replace plain `<div>` heading with the flex icon-badge pattern
- Add subtitle: `Security`

## Files Modified

| File                                                | Change                                         |
| --------------------------------------------------- | ---------------------------------------------- |
| `src/components/organisms/ManageAccountForms.astro` | Remove bio, center avatar, add phone hint      |
| `src/components/molecules/PasswordChangeForm.astro` | Add IconBadge heading pattern                  |
| `src/pages/profile.astro`                           | Remove bio from form submission                |
| `src/pages/api/user/profile.ts`                     | Remove bio from PUT handler                    |
| `src/lib/constants/user-meta-keys.ts`               | Remove BIO key, defaults, validation           |
| `src/services/user-meta.service.ts`                 | Remove bio from UserSettings type and defaults |

## Decisions

| Decision           | Choice                           | Rationale                                    |
| ------------------ | -------------------------------- | -------------------------------------------- |
| Bio field          | Remove entirely                  | No UI surface uses it in a finance app       |
| Avatar layout      | Centered above form              | Simpler, uses less horizontal space          |
| Phone validation   | Format hint only                 | No new dependencies, sufficient for guidance |
| Section separation | Icon + subtitle on password card | Matches existing profile card pattern        |
