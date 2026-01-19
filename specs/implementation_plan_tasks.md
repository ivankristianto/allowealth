# Toast Notifications & Client Utils Refactor

Implement a centralized Toast notification system using Nano Stores and Framer Motion (within Astro) to replace legacy string-based alert injection and DOM manipulation utilities.

## Summary

We are replacing the fragile `eval`-based injection of `createSuccessAlert`, `createErrorAlert`, and `setButtonLoading` with a modern, reactive Toast notification system. This involves creating a Nano Store for toast state and an Astro component that uses client-side JavaScript with Framer Motion for smooth animations.

### Proposed Changes

#### New Files

- `src/lib/stores/toastStore.ts`
- `src/components/molecules/ToastContainer.astro`

#### Modified Files

- `src/layouts/BaseLayout.astro`
- `src/pages/settings/index.astro`
- `src/components/molecules/PasswordChangeForm.astro`
- `src/lib/client-utils.ts` (Cleanup)
- `design-system/02-components.md` (Documentation)
- `design-system/07-patterns.md` (Documentation)
- `design-system/01-foundations.md` or new `08-animations.md` (Documentation)
- `AGENTS.md` (Documentation)

## Detailed Tasks

### 1. Install Dependencies (P0)

**Goal:** Install state management and animation libraries.

**Checklist:**

- [x] Install `nanostores`
- [x] ~~Install `framer-motion`~~ (Changed: Using CSS transitions instead for Astro compatibility)

**Command:**

```bash
bun add nanostores framer-motion
```

Estimated Time: 0.2 hours

### 2. Create Toast Store (P0)

**Goal:** Implement the state management for toast notifications with auto-dismiss and multi-toast support.

**Checklist:**

- [x] Create `src/lib/stores/toastStore.ts` with `addToast`, `removeToast`, and types.
- [x] Export `ToastType` and `ToastMessage` interfaces.
- [x] Implement auto-dismiss with configurable duration.
- [x] Implement max visible toasts limit (default: 5).
- [x] Handle toast queue when max is reached.
- [x] Added `clearAllToasts()` for cleanup on navigation (memory leak fix)
- [x] Added timeout tracking to prevent race conditions

**Files to modify:**

- `src/lib/stores/toastStore.ts`

**Code Structure:**

```typescript
import { atom } from 'nanostores';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number; // ms, 0 = persistent
}

interface ToastOptions {
  duration?: number; // Default: 5000ms for success/info/warning, 0 for error
}

const MAX_VISIBLE_TOASTS = 5;

export const toasts = atom<ToastMessage[]>([]);

export function addToast(
  message: string,
  type: ToastType = 'info',
  options?: ToastOptions
): string {
  const id = crypto.randomUUID();
  const duration = options?.duration ?? getDefaultDuration(type);

  const toast: ToastMessage = { id, message, type, duration };

  toasts.set([...toasts.get().slice(-MAX_VISIBLE_TOASTS + 1), toast]);

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }

  return id;
}

export function removeToast(id: string): void {
  toasts.set(toasts.get().filter((t) => t.id !== id));
}

function getDefaultDuration(type: ToastType): number {
  return type === 'error' ? 0 : 5000; // Errors persist until dismissed
}
```

Estimated Time: 0.75 hours

### 3. Create Toast UI Component (P0)

**Goal:** Create an Astro component to subscribe to the store and render toasts using DaisyUI with CSS animations.

**Checklist:**

- [x] Create `src/components/molecules/ToastContainer.astro`.
- [x] Add a container `div` with DaisyUI classes (`toast toast-top toast-end`).
- [x] Ensure proper z-index to appear above modals (`z-50`).
- [x] Add a `<script>` tag that:
  - Imports `toasts`, `removeToast`, `clearAllToasts` from `@/lib/stores/toastStore`.
  - Subscribes to the store.
  - Reconciles the DOM based on the active toasts (creates/removes alert elements).
  - Applies enter animation (fade-in + slide from right) using CSS transitions.
  - Applies exit animation (fade-out + slide to right) using CSS transitions.
  - Handles proper styling for different toast types using DaisyUI alert classes.
  - Cleans up on page navigation to prevent memory leaks.
- [x] Add accessibility attributes:
  - `role="region"` and `aria-label="Notifications"` on container.
  - `role="alert"` on each toast.
  - `aria-live="polite"` for success/info/warning toasts.
  - `aria-live="assertive"` for error toasts.
- [x] Add dismiss button for all toasts with Lucide X icon SVG.

**Files to modify:**

- `src/components/molecules/ToastContainer.astro`

**DaisyUI Classes Reference:**

```html
<!-- Container -->
<div class="toast toast-top toast-end z-50" role="region" aria-label="Notifications">
  <!-- Individual toast -->
  <div class="alert alert-success" role="alert" aria-live="polite">
    <span>Message here</span>
    <button class="btn btn-ghost btn-xs" aria-label="Dismiss">✕</button>
  </div>
</div>
```

**Framer Motion Animation:**

```typescript
import { animate } from 'framer-motion';

// Enter animation
animate(element, { opacity: [0, 1], x: [50, 0] }, { duration: 0.3, easing: 'easeOut' });

// Exit animation
animate(element, { opacity: [1, 0], x: [0, 50] }, { duration: 0.2, easing: 'easeIn' }).then(() =>
  element.remove()
);
```

Estimated Time: 1.5 hours

### 4. Integrate Toast Container (P0)

**Goal:** Add the ToastContainer to the global layout so it's available everywhere.

**Checklist:**

- [x] Import `ToastContainer` in `src/layouts/BaseLayout.astro`.
- [x] Add `<ToastContainer />` to the body (before closing `</body>` tag).

**Files to modify:**

- `src/layouts/BaseLayout.astro`

Estimated Time: 0.2 hours

### 5. Refactor Settings Page (P1)

**Goal:** Replace legacy utils in `settings/index.astro` with `addToast`.

**Current Issue:** Uses `define:vars` and `eval` to inject stringified functions.

**Checklist:**

- [ ] Change `<script define:vars...>` to `<script>` (module script).
- [ ] Import `addToast` from `@/lib/stores/toastStore`.
- [ ] Import `setButtonLoading` from `@/lib/client-utils`.
- [ ] Replace `createSuccessAlert(msg)` with `addToast(msg, 'success')`.
- [ ] Replace `createErrorAlert(msg)` with `addToast(msg, 'error')`.
- [ ] Use `setButtonLoading(btn, true/false)` directly (no `eval`).
- [ ] Remove the `innerHTML` assignments for alerts.
- [ ] Remove any `<div id="alert-container">` or similar legacy containers.

**Files to modify:**

- `src/pages/settings/index.astro`

Estimated Time: 1 hour

### 6. Refactor Password Change Form (P1)

**Goal:** Replace legacy utils in `PasswordChangeForm.astro`.

**Checklist:**

- [ ] Change `<script define:vars...>` to `<script>` (module script).
- [ ] Import `addToast` from `@/lib/stores/toastStore`.
- [ ] Import `setButtonLoading` from `@/lib/client-utils`.
- [ ] Replace usage of `createSuccessAlert`, `createErrorAlert`.
- [ ] Use `setButtonLoading(btn, true/false)` directly.
- [ ] Remove any legacy alert container elements.

**Files to modify:**

- `src/components/molecules/PasswordChangeForm.astro`

Estimated Time: 1 hour

### 7. Cleanup Client Utils (P2)

**Goal:** Remove unused legacy functions, modernize `setButtonLoading`, and clean up legacy alert infrastructure.

**Checklist:**

- [ ] Remove `createSuccessAlert` from `src/lib/client-utils.ts`.
- [ ] Remove `createErrorAlert` from `src/lib/client-utils.ts`.
- [ ] Refactor `setButtonLoading` to be a pure function that:
  - Accepts `HTMLButtonElement`.
  - Toggles `disabled` attribute.
  - Swaps text with DaisyUI's `loading loading-spinner loading-xs` classes.
  - Stores original content in `data-original-content` attribute for restoration.
- [ ] Search codebase for any remaining usages of legacy functions.
- [ ] Remove any orphaned CSS for old alert system.
- [ ] Remove any `<div id="alert-container">` elements from other templates.

**Files to modify:**

- `src/lib/client-utils.ts`

**Search Commands:**

```bash
# Find any remaining legacy function usage
grep -r "createSuccessAlert\|createErrorAlert" src/
grep -r "alert-container" src/
```

**setButtonLoading Implementation:**

```typescript
export function setButtonLoading(button: HTMLButtonElement, isLoading: boolean): void {
  if (isLoading) {
    button.dataset.originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalContent ?? button.innerHTML;
    delete button.dataset.originalContent;
  }
}
```

Estimated Time: 0.75 hours

### 8. Update Design System Documentation (P1)

**Goal:** Document the Toast component and Framer Motion animation patterns in the design system.

**Checklist:**

- [ ] Add Toast section to `design-system/02-components.md`:
  - Component location and import
  - Toast types (success, error, warning, info)
  - Usage examples with `addToast()`
  - DaisyUI classes used
  - Accessibility attributes
- [ ] Add Toast Notifications pattern to `design-system/07-patterns.md`:
  - When to use toasts vs inline errors vs banners
  - Auto-dismiss behavior (5s for success, persistent for errors)
  - Multi-toast stacking
  - Animation patterns with Framer Motion
- [ ] Add Framer Motion animation section to `design-system/01-foundations.md` or create new `08-animations.md`:
  - Standard animation durations and easings
  - Enter/exit animation patterns
  - Usage with `animate()` function

**Files to modify:**

- `design-system/02-components.md`
- `design-system/07-patterns.md`
- `design-system/01-foundations.md` (or new `design-system/08-animations.md`)

**Toast Component Documentation:**

```markdown
### Toast (`src/components/molecules/ToastContainer.astro`)

Global toast notification system. Automatically included in BaseLayout.

**Usage (in client-side scripts):**

\`\`\`typescript
import { addToast } from '@/lib/stores/toastStore';

// Basic usage
addToast('Profile saved!', 'success');
addToast('Failed to save', 'error');
addToast('Please review', 'warning');
addToast('New update available', 'info');

// Custom duration (ms)
addToast('Quick message', 'success', { duration: 2000 });

// Persistent (manual dismiss)
addToast('Action required', 'warning', { duration: 0 });
\`\`\`

**Types:** `success` | `error` | `warning` | `info`

**Behavior:**

- Success/info/warning: Auto-dismiss after 5 seconds
- Error: Persistent until manually dismissed
- Maximum 5 toasts visible at once
- Positioned top-right with slide animations
```

**Animation Documentation:**

```markdown
## Animations (Framer Motion)

Standard animation patterns using `framer-motion`.

### Enter/Exit

\`\`\`typescript
import { animate } from 'framer-motion';

// Fade + slide in
animate(element, { opacity: [0, 1], x: [50, 0] }, { duration: 0.3, easing: 'easeOut' });

// Fade + slide out
animate(element, { opacity: [1, 0], x: [0, 50] }, { duration: 0.2, easing: 'easeIn' });
\`\`\`

### Standard Durations

- **Fast:** 0.15s - Micro-interactions (hover, focus)
- **Normal:** 0.3s - Enter animations, transitions
- **Slow:** 0.5s - Page transitions, large elements

### Standard Easings

- **easeOut:** Enter animations (elements appearing)
- **easeIn:** Exit animations (elements disappearing)
- **easeInOut:** State changes, transforms
```

Estimated Time: 1 hour

### 9. Update AGENTS.md (P1)

**Goal:** Update project documentation to reflect new toast system, store pattern, and animation library.

**Checklist:**

- [ ] Add `nanostores` and `framer-motion` to Tech Stack section.
- [ ] Add `src/lib/stores/` to Project Structure with `toastStore.ts`.
- [ ] Add Toast usage guideline to Component Guidelines section.
- [ ] Document the pattern for using stores in Astro client scripts.

**Files to modify:**

- `AGENTS.md`

**Tech Stack Addition:**

```markdown
- **State Management:** Nano Stores (client-side reactive state)
- **Animations:** Framer Motion (client-side animations)
```

**Project Structure Addition:**

```markdown
├── lib/
│ ├── stores/ # Nano Stores for client-side state
│ │ └── toastStore.ts # Toast notification state
│ └── tokens.ts # Design tokens & helpers
```

**Component Guidelines Addition:**

```markdown
### Toast Notifications

Use the toast system for user feedback instead of inline alerts:

\`\`\`typescript
// In client-side <script> tags
import { addToast } from '@/lib/stores/toastStore';

// After successful action
addToast('Changes saved!', 'success');

// After error
addToast('Failed to save. Please try again.', 'error');
\`\`\`

**When to use:**

- Form submission feedback
- API response notifications
- Background task completion
- Error messages that don't block UI

**When NOT to use:**

- Form validation errors (use inline errors)
- Critical blocking errors (use error page/modal)
- Confirmation dialogs (use Modal)
```

Estimated Time: 0.5 hours

## How to Test

### Manual Test Steps

1. **Toast Rendering:** Open browser console and run:

   ```javascript
   import { addToast } from '@/lib/stores/toastStore';
   addToast('Test message', 'success');
   addToast('Error message', 'error');
   ```

   Verify toasts appear in top-right with proper animations.

2. **Auto-Dismiss:** Trigger a success toast, verify it disappears after 5 seconds. Trigger an error toast, verify it persists until manually dismissed.

3. **Multi-Toast Stacking:** Trigger 6+ toasts rapidly, verify only 5 are visible and they stack properly.

4. **Accessibility:** Use screen reader (VoiceOver/NVDA) to verify toasts are announced.

5. **Settings Update:** Go to `/settings`, update profile. Verify "Profile updated!" toast appears with enter animation.

6. **Error Handling:** Trigger an error (e.g., empty required field or network failure). Verify error toast appears and persists.

7. **Password Change:** Try changing password. Verify success/error toasts with proper animations.

8. **Button Loading:** Verify button shows DaisyUI loading spinner during submission and restores original content afterwards.

9. **Toast Dismiss:** Click dismiss button on error toast, verify exit animation plays and toast is removed.

10. **Console Errors:** Check browser console for any JavaScript errors or memory leak warnings.

### Dependencies

#### Required Services

- None (Client-side only)

#### Browser Support

- Framer Motion requires browsers with Web Animations API support (all modern browsers)

## Success Criteria

- [x] Toast notifications appear for success and error actions.
- [x] Toasts have smooth enter/exit animations via CSS transitions.
- [x] Success/info/warning toasts auto-dismiss after 5 seconds.
- [x] Error toasts persist until manually dismissed.
- [x] Maximum 5 toasts visible at once.
- [x] Toasts are accessible (proper ARIA attributes, screen reader support).
- [x] React is NOT used.
- [ ] No `eval` used for alert/loading functions in modified files. (P1 tasks)
- [ ] `createSuccessAlert` and `createErrorAlert` removed from codebase. (P1 tasks)
- [ ] `setButtonLoading` is a clean ES module function using DaisyUI spinner. (Already implemented)
- [x] Type-safe toast implementation.
- [x] No console errors or memory leaks.
- [x] Unit tests passing (18 tests).
- [ ] Design system documentation updated with Toast component and animation patterns. (P1 tasks)
- [ ] AGENTS.md updated with new libraries, stores directory, and toast usage guidelines. (P1 tasks)

## Estimated Effort

| Task                      | Time     | Priority |
| :------------------------ | :------- | :------- |
| Install Dependencies      | 0.2h     | P0       |
| Create Store              | 0.75h    | P0       |
| Create Component          | 1.5h     | P0       |
| Integration               | 0.2h     | P0       |
| Refactor Settings         | 1h       | P1       |
| Refactor Password Form    | 1h       | P1       |
| Cleanup                   | 0.75h    | P2       |
| Update Design System Docs | 1h       | P1       |
| Update AGENTS.md          | 0.5h     | P1       |
| **Total**                 | **6.9h** |          |

## Notes

### Page Navigation Consideration

With Astro's full-page navigation, Nano Store state resets on page change. This is acceptable for the current use case since toasts are triggered by in-page actions (form submissions, API calls). If View Transitions are enabled in the future, the toast state will persist across navigations automatically.

### Future Enhancements (Out of Scope)

- Toast positioning options (top-left, bottom-right, etc.)
- Custom toast content (JSX/HTML)
- Toast grouping/deduplication
- Undo action support

## Code Quality & Accessibility Improvements (Priority: P3)

**Note:** This section is reserved for follow-up improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability.

### P2 Items (Should Fix - Non-blocking)

1. **Design System Compliance** - The close button uses inline SVG instead of `@lucide/astro` icon component. This is necessary due to Astro SSR limitations for client-side scripts, but should be documented as an exception.

2. **Add JSDoc comment to `addToast`** - Document that older toasts are silently removed when max visible toasts limit is reached.

3. **Defensive coding for `crypto.randomUUID()`** - Add fallback for environments where crypto API is not available.

### P3 Items (Nice to Have)

4. **Focus management** - When toast is dismissed, return focus to the element that had focus before toast appeared.

5. **Single shared `aria-live` region** - Instead of individual `aria-live` on each toast, use a single shared region for all announcements.

6. **Test coverage gaps** - Add tests for:
   - Empty message handling
   - Very long message handling
   - Rapidly adding/removing toasts (stress test)
   - Multiple simultaneous toast additions

7. **Extract magic numbers** - Animation durations (300ms, 200ms) and distances (50px) should be CSS custom properties.
