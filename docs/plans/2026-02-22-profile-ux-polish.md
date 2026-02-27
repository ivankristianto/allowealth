# Profile Page UX Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four UX issues on the `/profile` page: remove unused bio field, center avatar layout, add phone format hint, and add consistent heading to password card.

**Architecture:** Pure frontend/API polish. Bio removal touches constants → service → API → UI (bottom-up). Layout and heading changes are component-only edits.

**Tech Stack:** Astro components, DaisyUI, Zod validation, Lucide icons

**Design:** `docs/plans/2026-02-22-profile-ux-polish-design.md`

---

### Task 1: Remove bio from constants and types

**Files:**

- Modify: `src/lib/constants/user-meta-keys.ts`

**Step 1: Remove BIO from USER_META_KEYS**

In `src/lib/constants/user-meta-keys.ts`, remove the `BIO` line from the `USER_META_KEYS` object:

```typescript
export const USER_META_KEYS = {
  SHOW_CONVERTED_TOTALS: 'show_converted_totals',
  SHOW_INDIVIDUAL_CURRENCIES: 'show_individual_currencies',
  PHONE: 'phone',
  PENDING_EMAIL: 'pending_email',
} as const;
```

**Step 2: Remove BIO from META_DEFAULTS**

Remove the `[USER_META_KEYS.BIO]: '',` line from `META_DEFAULTS`.

**Step 3: Remove BIO from META_VALUE_SCHEMAS**

Remove the `[USER_META_KEYS.BIO]: z.string().max(500, ...)` line from `META_VALUE_SCHEMAS`.

**Step 4: Remove BIO from metaKeySchema**

Remove `USER_META_KEYS.BIO,` from the `z.enum()` array in `metaKeySchema`.

**Step 5: Remove bio from UserSettings interface and DEFAULT_USER_SETTINGS**

Remove the `bio: string;` line from the `UserSettings` interface.
Remove the `bio: '',` line from `DEFAULT_USER_SETTINGS`.

**Step 6: Run typecheck to see downstream breakage**

Run: `bun run typecheck`
Expected: Errors in `user-meta.service.ts`, `profile.ts`, `ManageAccountForms.astro`, and test files referencing `bio`.

---

### Task 2: Remove bio from user-meta service

**Files:**

- Modify: `src/services/user-meta.service.ts`

**Step 1: Remove bio from getUserSettings**

In `getUserSettings()` method (~line 287), remove the `bio` line from the `result` object:

```typescript
const result: UserSettings = {
  showConvertedTotals: metaValueToBoolean(
    metaAll[USER_META_KEYS.SHOW_CONVERTED_TOTALS],
    DEFAULT_USER_SETTINGS.showConvertedTotals
  ),
  showIndividualCurrencies: metaValueToBoolean(
    metaAll[USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES],
    DEFAULT_USER_SETTINGS.showIndividualCurrencies
  ),
  phone: metaAll[USER_META_KEYS.PHONE] || DEFAULT_USER_SETTINGS.phone,
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: Errors now only in `profile.ts`, `ManageAccountForms.astro`, and test files.

---

### Task 3: Remove bio from profile API endpoint

**Files:**

- Modify: `src/pages/api/user/profile.ts`

**Step 1: Remove bio from Zod schema**

Remove the `bio` line from `updateFullProfileSchema`:

```typescript
const updateFullProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.email({ message: 'Invalid email format' }),
  phone: z.string().max(50, 'Phone must be at most 50 characters').optional().default(''),
});
```

**Step 2: Remove bio from PUT destructuring**

Change line 91 from:

```typescript
const { name, email, phone, bio } = validation.data;
```

to:

```typescript
const { name, email, phone } = validation.data;
```

**Step 3: Remove bio meta write**

Remove the `bio` block (lines 133-135):

```typescript
if (bio !== undefined) {
  metaPromises.push(userMetaService.setUserMeta(auth.userId, 'bio', bio));
}
```

Update the comment on line 127 from `// Update meta values (phone, bio)` to `// Update meta values (phone)`.

**Step 4: Remove bio from PUT response**

Remove `bio: settings.bio,` from the PUT response object (line 147).

**Step 5: Remove bio from GET response**

Remove `bio: settings.bio,` from the GET response object (line 50).

**Step 6: Update JSDoc comment**

Remove `bio` references from the JSDoc comment on the PUT handler (lines 68, 77).

**Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: Errors now only in `ManageAccountForms.astro` and test files.

---

### Task 4: Remove bio from profile UI and center avatar

**Files:**

- Modify: `src/components/organisms/ManageAccountForms.astro`
- Modify: `src/pages/profile.astro`

**Step 1: Remove bio from ManageAccountForms data**

In `ManageAccountForms.astro`, remove `bio` from the `profileDetails` object (line 37-38). Change:

```typescript
const profileDetails = {
  phone: userSettings?.phone || '',
  bio: userSettings?.bio || '',
};
```

to:

```typescript
const profileDetails = {
  phone: userSettings?.phone || '',
};
```

**Step 2: Remove bio textarea from template**

Remove the entire bio form-control div (lines 174-183):

```astro
<div class="form-control">
  <Label htmlFor="bio">Short Bio</Label>
  <textarea
    id="bio"
    name="bio"
    rows={3}
    class="textarea textarea-bordered w-full bg-base-200 rounded-2xl py-4 px-6 text-base border border-base-300 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none"
    placeholder="Tell us a bit about your role">{profileDetails.bio}</textarea
  >
</div>
```

**Step 3: Center avatar above form fields**

Replace the layout container (line 60):

```astro
<div class="flex flex-col gap-6 lg:flex-row">
  <div class="flex flex-col items-center gap-3 lg:w-40"></div>
</div>
```

with:

```astro
<div class="space-y-6">
  <div class="flex flex-col items-center gap-3"></div>
</div>
```

And remove the `flex-1` wrapper div around the form fields grid. Change:

```astro
<div class="flex-1 grid grid-cols-1 gap-4"></div>
```

to:

```astro
<div class="grid grid-cols-1 gap-4"></div>
```

**Step 4: Add phone number format hint**

After the phone `<Input>` component (around line 171), add:

```astro
<p class="mt-1.5 text-xs text-base-content/40">Include country code, e.g. +62 812 3456 7890</p>
```

**Step 5: Remove bio from client-side form submission**

In `src/pages/profile.astro`, remove `bio` from the `profileData` object (line 89). Change:

```typescript
const profileData = {
  name: formData.get('name'),
  email: formData.get('email'),
  phone: formData.get('phone') || '',
  bio: formData.get('bio') || '',
};
```

to:

```typescript
const profileData = {
  name: formData.get('name'),
  email: formData.get('email'),
  phone: formData.get('phone') || '',
};
```

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (all bio references removed from app code).

**Step 7: Commit**

```bash
git add src/lib/constants/user-meta-keys.ts src/services/user-meta.service.ts src/pages/api/user/profile.ts src/components/organisms/ManageAccountForms.astro src/pages/profile.astro
git commit -m "feat(profile): remove bio field, center avatar, add phone hint (#262)

- Remove Short Bio field entirely (constants, service, API, UI)
- Center avatar above form fields instead of side-by-side
- Add format hint below phone number input"
```

---

### Task 5: Add IconBadge heading to PasswordChangeForm

**Files:**

- Modify: `src/components/molecules/PasswordChangeForm.astro`

**Step 1: Add imports**

Add `IconBadge` and `Lock` imports to the frontmatter:

```typescript
import IconBadge from '@/components/atoms/IconBadge.astro';
import { Lock } from '@lucide/astro';
```

**Step 2: Replace heading**

Replace the current heading block (lines 24-29):

```astro
<div>
  <h3 class="text-lg font-bold">Change Password</h3>
  <p class="text-sm text-base-content/70">
    Update your password. You'll need to enter your current password to make changes.
  </p>
</div>
```

with:

```astro
<div class="flex items-center gap-4">
  <IconBadge variant="accent" size="sm">
    <Lock size={20} class="stroke-current" aria-hidden="true" />
  </IconBadge>
  <div>
    <h3 class="text-lg font-bold">Change Password</h3>
    <p class="text-xs uppercase tracking-widest text-base-content/50">Security</p>
  </div>
</div>
<p class="text-sm text-base-content/70">
  Update your password. You'll need to enter your current password to make changes.
</p>
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/molecules/PasswordChangeForm.astro
git commit -m "feat(profile): add icon badge heading to password card (#262)

Consistent heading style with profile card: Lock icon + 'Security' subtitle."
```

---

### Task 6: Update tests

**Files:**

- Modify: `src/__tests__/api/user/profile-email-change.test.ts`
- Modify: `src/services/user-meta.service.test.ts`

**Step 1: Update profile API test mocks**

In `src/__tests__/api/user/profile-email-change.test.ts`:

- Line 52: Remove `bio: 'Hello'` from mock return → `({ phone: '123' })`
- Line 62: Remove `expect(payload.data.bio).toBe('Hello');`
- Line 78: Remove `bio: 'Updated'` from mock return → `({ phone: '987' })`
- Line 88: Remove `bio: 'Updated',` from PUT body
- Line 131: Remove `bio: 'Will not persist',` from PUT body

**Step 2: Update user-meta service test assertions**

In `src/services/user-meta.service.test.ts`:

- Line 378: Remove `bio: '',` from expected result
- Line 392: Remove `bio: '',` from expected result

**Step 3: Run tests**

Run: `bun run test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/__tests__/api/user/profile-email-change.test.ts src/services/user-meta.service.test.ts
git commit -m "test(profile): update tests after bio field removal (#262)"
```

---

### Task 7: Update OpenAPI schema

**Files:**

- Modify: `openapi/schemas/UserProfileResponse.yml`

**Step 1: Remove bio from response schema**

Remove lines 34-36 from `UserProfileResponse.yml`:

```yaml
bio:
  type: string
  description: User bio
```

**Step 2: Commit**

```bash
git add openapi/schemas/UserProfileResponse.yml
git commit -m "docs(openapi): remove bio from profile response schema (#262)"
```

---

### Task 8: Run quality gates and verify in browser

**Step 1: Run all quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: All pass.

**Step 2: Run tests**

```bash
bun run test
```

Expected: All pass.

**Step 3: Build**

```bash
bun run build
```

Expected: Clean build with no errors.

**Step 4: Visual verification in browser**

Start dev server and verify in Chrome:

1. Avatar is centered above the form fields
2. Bio field is gone
3. Phone number has format hint text
4. Password card has Lock icon + "Security" subtitle matching profile card style
5. Both mobile and desktop layouts look correct
