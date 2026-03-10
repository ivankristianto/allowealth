# User Theme Preference Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist user theme preference (system/light/dark/monochrome) in `user_meta`, expose a profile Appearances section, and remove in-app toggle buttons from authenticated layouts.

**Architecture:** SSR injects the user's resolved theme as `data-theme` + `data-theme-server="true"` on `<html>` via `BaseLayout.astro` props. The external `theme-init.js` is updated to detect this server-set marker and skip localStorage override, while still handling monochrome (grayscale filter) and the `system` fallback for unauthenticated users. A new `PUT /api/user/theme` endpoint saves preference; `ManageAppearancesForm` in `/profile` provides the UI.

> **Design doc divergence:** The approved design proposed a `ThemeInit.astro` component with `define:vars`. However, `BaseLayout.astro` has a CSP-driven constraint: the theme bootstrap *must* remain an external static script (`public/scripts/theme-init.js`) — confirmed by `src/__tests__/public-static-security.test.ts`. We instead pass the SSR theme via `data-*` HTML attributes on `<html>`, which achieves zero FOUC without inline scripts.

**Tech Stack:** Astro (SSR), DaisyUI, Drizzle ORM (SQLite/PostgreSQL), Zod, Bun test, `user_meta` key-value table, Nanostores toasts

---

## Task 1: Extend `user-meta-keys.ts` with the THEME key

**Files:**
- Modify: `src/lib/constants/user-meta-keys.ts`

### Step 1: Write failing test

Add to `src/__tests__/lib/user-meta-keys.test.ts` (create file):

```typescript
import { describe, expect, it } from 'bun:test';
import {
  USER_META_KEYS,
  META_VALUE_SCHEMAS,
  META_DEFAULTS,
  VALID_META_KEYS,
  metaKeySchema,
} from '@/lib/constants/user-meta-keys';

describe('USER_META_KEYS.THEME', () => {
  it('has THEME key defined', () => {
    expect(USER_META_KEYS.THEME).toBe('theme');
  });

  it('THEME is in VALID_META_KEYS', () => {
    expect(VALID_META_KEYS).toContain('theme');
  });

  it('metaKeySchema accepts "theme"', () => {
    expect(() => metaKeySchema.parse('theme')).not.toThrow();
  });

  it('META_VALUE_SCHEMAS.theme accepts all four valid values', () => {
    const schema = META_VALUE_SCHEMAS[USER_META_KEYS.THEME];
    for (const v of ['system', 'light', 'dark', 'monochrome']) {
      expect(() => schema.parse(v)).not.toThrow();
    }
  });

  it('META_VALUE_SCHEMAS.theme rejects invalid values', () => {
    const schema = META_VALUE_SCHEMAS[USER_META_KEYS.THEME];
    expect(() => schema.parse('purple')).toThrow();
    expect(() => schema.parse('')).toThrow();
  });

  it('META_DEFAULTS.theme is "system"', () => {
    expect(META_DEFAULTS[USER_META_KEYS.THEME]).toBe('system');
  });
});
```

### Step 2: Run test to verify it fails

```bash
bun test src/__tests__/lib/user-meta-keys.test.ts
```

Expected: FAIL — `USER_META_KEYS.THEME` is undefined.

### Step 3: Implement

In `src/lib/constants/user-meta-keys.ts`:

**Add to `USER_META_KEYS`:**
```typescript
THEME: 'theme',
```

**Add to `META_DEFAULTS`:**
```typescript
[USER_META_KEYS.THEME]: 'system',
```

**Add to `META_VALUE_SCHEMAS`:**
```typescript
[USER_META_KEYS.THEME]: z.enum(['system', 'light', 'dark', 'monochrome'], {
  message: 'Value must be "system", "light", "dark", or "monochrome"',
}),
```

**Add to `metaKeySchema` enum array:**
```typescript
USER_META_KEYS.THEME,
```

**Update `UserSettings` interface — add:**
```typescript
theme: string;
```

**Update `DEFAULT_USER_SETTINGS` — add:**
```typescript
theme: 'system',
```

### Step 4: Run test to verify it passes

```bash
bun test src/__tests__/lib/user-meta-keys.test.ts
```

Expected: PASS

### Step 5: Commit

```bash
git add src/lib/constants/user-meta-keys.ts src/__tests__/lib/user-meta-keys.test.ts
git commit -m "feat: add THEME key to user meta constants

Add 'theme' meta key with system/light/dark/monochrome enum validation.
Default value is 'system'. Update UserSettings interface.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Update `getUserSettings` to include theme

**Files:**
- Modify: `src/services/user-meta.service.ts`

### Step 1: Find and update `getUserSettings`

In the `getUserSettings` method (around line 280), add `theme` to the constructed `result` object:

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
  theme: metaAll[USER_META_KEYS.THEME] || DEFAULT_USER_SETTINGS.theme,
};
```

### Step 2: Run typecheck to verify no type errors

```bash
bun run typecheck
```

Expected: 0 errors

### Step 3: Commit

```bash
git add src/services/user-meta.service.ts
git commit -m "feat: include theme in getUserSettings result

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Update `theme-init.js` to support all four themes + SSR marker

**Files:**
- Modify: `public/scripts/theme-init.js`
- Modify: `src/__tests__/public-static-security.test.ts`

### Step 1: Update the security test to expect new behaviour

In `src/__tests__/public-static-security.test.ts`, the existing test `'BaseLayout uses an external theme bootstrap script'` already checks:
```typescript
expect(baseLayout).toContain('src="/scripts/theme-init.js"');
```
This test stays unchanged and must continue to pass. No change needed here — but verify it passes after Task 4 when BaseLayout is modified.

### Step 2: Replace `public/scripts/theme-init.js` with updated logic

Full replacement:

```javascript
(function () {
  function applyTheme() {
    var html = document.documentElement;

    // If the server set a specific theme via SSR, respect it
    if (html.getAttribute('data-theme-server') === 'true') {
      var serverTheme = html.getAttribute('data-theme');
      if (serverTheme === 'monochrome') {
        html.setAttribute('data-theme', 'light');
        html.style.filter = 'grayscale(100%)';
      } else {
        html.style.filter = '';
      }
      return;
    }

    // Unauthenticated / system preference path
    html.style.filter = '';
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      html.setAttribute('data-theme', savedTheme);
      return;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.setAttribute('data-theme', 'dark');
      return;
    }

    html.setAttribute('data-theme', 'light');
  }

  applyTheme();
  document.addEventListener('astro:after-swap', applyTheme);
})();
```

### Step 3: Run security tests

```bash
bun test src/__tests__/public-static-security.test.ts
```

Expected: PASS (the test only checks for the `src="/scripts/theme-init.js"` string in BaseLayout source)

### Step 4: Commit

```bash
git add public/scripts/theme-init.js
git commit -m "feat: update theme-init.js for 4-theme support and SSR marker

Handle data-theme-server attribute set by ProtectedLayout SSR.
Support monochrome via grayscale filter on <html>.
Retain localStorage/system fallback for unauthenticated pages.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Update `BaseLayout.astro` to accept and apply SSR theme

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

### Step 1: Add `ssrTheme` prop and apply to `<html>`

The `<html>` tag currently is: `<html lang="en" data-theme="light">`

Update the frontmatter `Props` interface:
```typescript
interface Props {
  title?: string;
  ssrTheme?: string;
}
```

Update the destructuring:
```typescript
const { title = 'allowealth', ssrTheme } = Astro.props;
```

Compute the resolved SSR theme value. For `system`, we let `theme-init.js` handle it (no server-set marker). For `light`, `dark`, `monochrome` we set the marker:

```typescript
// 'system' or undefined → no server-side override; let theme-init.js handle it
const hasServerTheme = ssrTheme && ssrTheme !== 'system';
```

Update the `<html>` tag:
```astro
<html
  lang="en"
  data-theme={hasServerTheme ? ssrTheme : 'light'}
  data-theme-server={hasServerTheme ? 'true' : undefined}
>
```

### Step 2: Run typecheck

```bash
bun run typecheck
```

Expected: 0 errors

### Step 3: Run the security test (must still pass)

```bash
bun test src/__tests__/public-static-security.test.ts
```

Expected: PASS

### Step 4: Commit

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: add ssrTheme prop to BaseLayout for server-side theme injection

Sets data-theme and data-theme-server attributes on <html> when an
explicit theme is provided. system preference falls back to client-side
theme-init.js. Keeps external script intact for CSP compliance.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Update `ProtectedLayout.astro` to pass SSR theme to `BaseLayout`

**Files:**
- Modify: `src/layouts/ProtectedLayout.astro`
- Modify: `src/layouts/MainLayout.astro` (pass ssrTheme through)

### Step 1: Check how `ProtectedLayout` uses `MainLayout`

`ProtectedLayout` wraps `MainLayout`. `MainLayout` wraps `BaseLayout`. Trace the prop threading:
- `ProtectedLayout` → `MainLayout` → `BaseLayout`

Look at `src/layouts/MainLayout.astro` to see its `Props` interface and how it uses `BaseLayout`.

### Step 2: Thread `ssrTheme` through the layout chain

**In `src/layouts/MainLayout.astro`:**

Add to `Props`:
```typescript
ssrTheme?: string;
```

Destructure it:
```typescript
const { ..., ssrTheme } = Astro.props;
```

Pass to `<BaseLayout>`:
```astro
<BaseLayout title={title} ssrTheme={ssrTheme}>
```

**In `src/layouts/ProtectedLayout.astro`:**

After `userSettings` is populated (line ~150), read the theme:
```typescript
const ssrTheme = userSettings.theme || 'system';
```

Pass to `<MainLayout>`:
```astro
<MainLayout ... ssrTheme={ssrTheme}>
```

### Step 3: Run typecheck

```bash
bun run typecheck
```

Expected: 0 errors

### Step 4: Commit

```bash
git add src/layouts/ProtectedLayout.astro src/layouts/MainLayout.astro
git commit -m "feat: thread ssrTheme from ProtectedLayout through to BaseLayout

Reads theme from userSettings (fetched from user_meta) and passes it
down the layout chain so theme-init.js can apply it before first paint.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Create `PUT /api/user/theme` endpoint

**Files:**
- Create: `src/pages/api/user/theme.ts`
- Create: `src/__tests__/api/user/theme.test.ts`

### Step 1: Write failing tests

Create `src/__tests__/api/user/theme.test.ts`:

```typescript
import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { userMetaService } from '@/services';

let PUT: any;

const originalSetUserMeta = userMetaService.setUserMeta;

function createApiContext(options: {
  body?: Record<string, unknown>;
  user?: { id: string; workspaceId: string; role: 'admin' | 'member' } | null;
}) {
  return {
    request: new Request('http://localhost/api/user/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    locals: {
      user: options.user !== undefined ? options.user : { id: 'user-1', workspaceId: 'ws-1', role: 'member' },
    },
  } as any;
}

describe('PUT /api/user/theme', () => {
  beforeAll(async () => {
    ({ PUT } = await import('@/pages/api/user/theme'));
  });

  afterEach(() => {
    userMetaService.setUserMeta = originalSetUserMeta;
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await PUT(createApiContext({ user: null }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid theme value', async () => {
    const res = await PUT(createApiContext({ body: { theme: 'rainbow' } }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when theme is missing', async () => {
    const res = await PUT(createApiContext({ body: {} }));
    expect(res.status).toBe(400);
  });

  it.each([['system'], ['light'], ['dark'], ['monochrome']])(
    'accepts valid theme "%s"',
    async (theme) => {
      userMetaService.setUserMeta = mock(async () => {}) as any;
      const res = await PUT(createApiContext({ body: { theme } }));
      const payload = await res.json();
      expect(res.status).toBe(200);
      expect(payload.data.theme).toBe(theme);
    }
  );

  it('calls setUserMeta with correct args', async () => {
    let capturedArgs: unknown[] = [];
    userMetaService.setUserMeta = mock(async (...args: unknown[]) => {
      capturedArgs = args;
    }) as any;

    await PUT(createApiContext({ body: { theme: 'dark' } }));
    expect(capturedArgs[0]).toBe('user-1');
    expect(capturedArgs[1]).toBe('theme');
    expect(capturedArgs[2]).toBe('dark');
  });
});
```

### Step 2: Run test to verify it fails

```bash
bun test src/__tests__/api/user/theme.test.ts
```

Expected: FAIL — module not found.

### Step 3: Implement `src/pages/api/user/theme.ts`

```typescript
import type { APIRoute } from 'astro';
import { userMetaService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { UserMetaServiceError } from '@/services/service-errors';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { z } from 'zod';

const updateThemeSchema = z.object({
  theme: z.enum(['system', 'light', 'dark', 'monochrome'], {
    message: 'Theme must be one of: system, light, dark, monochrome',
  }),
});

/**
 * PUT /api/user/theme
 *
 * Persists the authenticated user's theme preference in user_meta.
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateThemeSchema);
    if (isValidationError(validation)) {
      return errorResponse(validation.message, 400, validation.issues);
    }

    const { theme } = validation;
    await userMetaService.setUserMeta(auth.userId, USER_META_KEYS.THEME, theme);

    return successResponse({ theme });
  } catch (error) {
    if (error instanceof UserMetaServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    logError('PUT /api/user/theme', error);
    return errorResponse('Failed to update theme preference', 500);
  }
};
```

### Step 4: Run test to verify it passes

```bash
bun test src/__tests__/api/user/theme.test.ts
```

Expected: PASS (all 7 cases)

### Step 5: Commit

```bash
git add src/pages/api/user/theme.ts src/__tests__/api/user/theme.test.ts
git commit -m "feat: add PUT /api/user/theme endpoint

Validates and persists user theme preference (system/light/dark/monochrome)
in user_meta table. Uses CSRF-protected PUT with Zod validation.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Create `ManageAppearancesForm.astro` organism

**Files:**
- Create: `src/components/organisms/ManageAppearancesForm.astro`

### Step 1: Implement the component

```astro
---
/**
 * ManageAppearancesForm Component
 *
 * Displays a 4-option theme selector card for the profile Appearances section.
 * Theme is saved immediately on selection via PUT /api/user/theme.
 */
import { Palette } from '@lucide/astro';
import IconBadge from '@/components/atoms/IconBadge.astro';

export interface Props {
  currentTheme?: string;
}

const { currentTheme = 'system' } = Astro.props;

const themes = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow OS preference',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Always light',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Always dark',
  },
  {
    value: 'monochrome',
    label: 'Monochrome',
    description: 'Grayscale, no colors',
  },
] as const;
---

<section class="card bg-base-100 shadow border border-base-300">
  <div class="card-body p-6 space-y-6">
    <div class="flex items-center gap-4">
      <IconBadge variant="accent">
        <Palette size={20} />
      </IconBadge>
      <div>
        <h3 class="text-lg font-bold">Appearances</h3>
        <p class="text-xs text-base-content/60 uppercase">Theme preference</p>
      </div>
    </div>

    <div
      id="appearances-form"
      class="grid grid-cols-2 sm:grid-cols-4 gap-3"
      data-current-theme={currentTheme}
    >
      {
        themes.map((theme) => (
          <label class="cursor-pointer">
            <input
              type="radio"
              name="theme"
              value={theme.value}
              class="sr-only peer"
              checked={currentTheme === theme.value}
            />
            <div class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-base-300 peer-checked:border-accent peer-checked:bg-accent/10 hover:border-accent/50 transition-all duration-150 text-center">
              <span class="text-sm font-semibold">{theme.label}</span>
              <span class="text-xs text-base-content/60">{theme.description}</span>
            </div>
          </label>
        ))
      }
    </div>
  </div>
</section>

<script src="./ManageAppearancesForm.client.ts"></script>
```

### Step 2: Run typecheck

```bash
bun run typecheck
```

Expected: 0 errors (or only lint-level hints if `IconBadge` variant values differ — check the component's allowed variants and adjust if needed)

### Step 3: Commit

```bash
git add src/components/organisms/ManageAppearancesForm.astro
git commit -m "feat: add ManageAppearancesForm organism

4-option theme selector card: system/light/dark/monochrome.
Radio inputs styled as cards with accent highlight on selection.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Create `ManageAppearancesForm.client.ts`

**Files:**
- Create: `src/components/organisms/ManageAppearancesForm.client.ts`

### Step 1: Implement

This script handles radio change → API call → DOM theme update → toast feedback.

```typescript
import { addToast } from '@/lib/stores/toastStore';
import { getCsrfHeaders } from '@/lib/csrf-client';

const API_THEME_URL = '/api/user/theme';
const FORM_ID = 'appearances-form';
const CONTROLLER_KEY = '__appearancesFormController';

type Theme = 'system' | 'light' | 'dark' | 'monochrome';

function applyThemeToDom(theme: Theme) {
  const html = document.documentElement;
  if (theme === 'monochrome') {
    html.setAttribute('data-theme', 'light');
    html.setAttribute('data-theme-server', 'true');
    html.style.filter = 'grayscale(100%)';
  } else if (theme === 'system') {
    html.removeAttribute('data-theme-server');
    html.style.filter = '';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    html.setAttribute('data-theme', theme);
    html.setAttribute('data-theme-server', 'true');
    html.style.filter = '';
  }
}

function initAppearancesForm() {
  const prev = (window as Record<string, unknown>)[CONTROLLER_KEY] as AbortController | undefined;
  prev?.abort();
  const controller = new AbortController();
  (window as Record<string, unknown>)[CONTROLLER_KEY] = controller;
  const { signal } = controller;

  const form = document.getElementById(FORM_ID);
  if (!form) return;

  const radios = form.querySelectorAll<HTMLInputElement>('input[type="radio"][name="theme"]');

  radios.forEach((radio) => {
    radio.addEventListener(
      'change',
      async () => {
        if (!radio.checked) return;
        const theme = radio.value as Theme;
        const previousTheme = form.dataset.currentTheme as Theme | undefined;

        // Apply immediately for instant feedback
        applyThemeToDom(theme);
        form.dataset.currentTheme = theme;

        try {
          const res = await fetch(API_THEME_URL, {
            method: 'PUT',
            headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ theme }),
            signal,
          });

          if (!res.ok) {
            throw new Error('Failed to save theme preference');
          }

          addToast('Theme updated', 'success');
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          // Revert selection
          if (previousTheme) {
            applyThemeToDom(previousTheme);
            form.dataset.currentTheme = previousTheme;
            radios.forEach((r) => {
              r.checked = r.value === previousTheme;
            });
          }
          addToast('Failed to save theme preference', 'error');
        }
      },
      { signal }
    );
  });
}

initAppearancesForm();
document.addEventListener('astro:page-load', initAppearancesForm);
```

### Step 2: Run typecheck

```bash
bun run typecheck
```

Expected: 0 errors

### Step 3: Commit

```bash
git add src/components/organisms/ManageAppearancesForm.client.ts
git commit -m "feat: add ManageAppearancesForm client script

Immediate DOM theme application on selection + PUT /api/user/theme call.
Reverts to previous theme on API error. Uses AbortController lifecycle.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Add Appearances section to `profile.astro`

**Files:**
- Modify: `src/pages/profile.astro`

### Step 1: Import and render `ManageAppearancesForm`

In the frontmatter, add import:
```typescript
import ManageAppearancesForm from '@/components/organisms/ManageAppearancesForm.astro';
import type { UserSettings } from '@/lib/constants/user-meta-keys';
```

Read `userSettings` from locals (already set by `ProtectedLayout`):
```typescript
const userSettings = Astro.locals.userSettings as UserSettings;
const currentTheme = userSettings?.theme || 'system';
```

In the template, add below `<ManageAccountForms ...>`:
```astro
<ManageAppearancesForm currentTheme={currentTheme} />
```

### Step 2: Run typecheck

```bash
bun run typecheck
```

Expected: 0 errors

### Step 3: Commit

```bash
git add src/pages/profile.astro
git commit -m "feat: add Appearances section to profile page

Renders ManageAppearancesForm with server-side current theme from userSettings.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Remove ThemeToggle from authenticated layouts

**Files:**
- Modify: `src/components/layouts/Header.astro`
- Modify: `src/layouts/MainLayout.astro`

### Step 1: Remove from `Header.astro`

Remove (line ~17):
```typescript
import ThemeToggle from '../atoms/ThemeToggle.astro';
```

Remove (line ~130):
```astro
<ThemeToggle size="sm" className="lg:hidden" />
```

Check if `ThemeToggle` is used anywhere else in `Header.astro` — if not, remove the import entirely.

### Step 2: Remove from `MainLayout.astro`

Remove (line ~20):
```typescript
import ThemeToggle from '../components/atoms/ThemeToggle.astro';
```

Remove (line ~98):
```astro
<ThemeToggle className="hidden lg:block fixed bottom-6 right-6 z-40" />
```

Check if `ThemeToggle` is used anywhere else in `MainLayout.astro` — if not, remove the import.

### Step 3: Run typecheck and lint

```bash
bun run typecheck && bun run lint
```

Expected: 0 errors, no unused import warnings

### Step 4: Commit

```bash
git add src/components/layouts/Header.astro src/layouts/MainLayout.astro
git commit -m "feat: remove ThemeToggle from authenticated layouts

Theme is now controlled from Profile > Appearances. The toggle remains
on PublicLayout for unauthenticated users (light/dark only).

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 11: Final quality gate

### Step 1: Run full test suite

```bash
bun test
```

Expected: all tests pass

### Step 2: Run typecheck + lint + build

```bash
bun run typecheck && bun run lint && bun run build
```

Expected: 0 errors, clean build

### Step 3: Verify `data-theme` is correctly set in browser

Start dev server and:
1. Log in as a test user
2. Go to `/profile` → Appearances section shows, `system` selected by default
3. Select `dark` → page theme switches immediately; reload → still dark (SSR applied)
4. Select `monochrome` → page goes grayscale; reload → still grayscale
5. Select `system` → follows OS; reload → follows OS
6. Log out → public pages still have the floating ThemeToggle (light/dark)

### Step 4: Commit final state (if any outstanding changes)

```bash
git add -A
git commit -m "chore: final quality gate pass for user theme preference"
```

---

## Summary of files changed

| Action | File |
|--------|------|
| Modify | `src/lib/constants/user-meta-keys.ts` |
| Modify | `src/services/user-meta.service.ts` |
| Modify | `public/scripts/theme-init.js` |
| Modify | `src/layouts/BaseLayout.astro` |
| Modify | `src/layouts/MainLayout.astro` |
| Modify | `src/layouts/ProtectedLayout.astro` |
| Modify | `src/components/layouts/Header.astro` |
| Modify | `src/pages/profile.astro` |
| Create | `src/pages/api/user/theme.ts` |
| Create | `src/components/organisms/ManageAppearancesForm.astro` |
| Create | `src/components/organisms/ManageAppearancesForm.client.ts` |
| Create | `src/__tests__/lib/user-meta-keys.test.ts` |
| Create | `src/__tests__/api/user/theme.test.ts` |
