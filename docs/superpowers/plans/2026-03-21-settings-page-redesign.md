# Settings Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Modal.astro's broken keyboard navigation, rewrite InviteMemberModal, scope the save button to the General tab, redesign the Data panel with danger-zone actions and a coming-soon Backup section, and add an admin-only Server Stats tab.

**Architecture:** Fix the shared Modal component first (using native `toggle` event + `showModal()`), then update all callers on the settings page, then add the new Data and Server Stats panels. No new services or API endpoints are introduced — the Data panel buttons are UI-only stubs in this scope.

**Tech Stack:** Astro 5, DaisyUI v5, Tailwind CSS v4, Lucide icons (`@lucide/astro`), Motion/mini animations, `bun:test` for regression tests.

**Spec:** `docs/superpowers/specs/2026-03-21-settings-page-redesign-design.md`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/components/molecules/Modal.astro` | Replace MutationObserver with `toggle` event; add Escape key handler |
| Modify | `src/components/organisms/InviteMemberModal.astro` | Rewrite to use Modal properly; grid layout; cleanup on `close` |
| Modify | `src/pages/settings/index.astro` | Save button fix; cancel-invitation-modal migration; Server Stats panel |
| Create | `tests/regression/settings-modal-migration.test.ts` | Regression: no raw `modal-open` class usage in settings, no MutationObserver in Modal |

---

## Task 1: Fix Modal.astro — replace MutationObserver with `toggle` event

**Files:**
- Modify: `src/components/molecules/Modal.astro` (lines 117–336, the `<script>` block)

The current `Modal.astro` uses a `MutationObserver` watching for the `modal-open` CSS class to trigger enter animations, and opens dialogs via CSS class rather than `showModal()`. This breaks Escape key support and focus trapping.

Replace the animation trigger mechanism: use the native `<dialog>` `toggle` event (fires when dialog transitions between open/closed states via `showModal()` / `close()`). Add a `keydown` listener for Escape.

- [ ] **Step 1: Replace the script block in Modal.astro**

Open `src/components/molecules/Modal.astro`. Replace the entire `<script>` block (from line 117 `<script>` to line 336 `</script>`) with:

```ts
<script>
  import { animate } from 'motion/mini';
  import {
    MODAL_ANIMATION_CONFIG,
    MODAL_INITIAL_SCALE,
    MODAL_INITIAL_Y_OFFSET,
  } from '@/lib/animations';

  const initializedModals = new WeakSet<Element>();

  function initModal(modal: HTMLDialogElement) {
    if (initializedModals.has(modal)) return;
    initializedModals.add(modal);

    const backdropClose = modal.dataset.backdropClose === 'true';
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => { prefersReducedMotion = e.matches; });

    const getBackdrop = () => modal.querySelector('[data-modal-backdrop]') as HTMLElement | null;
    const getContent = () => modal.querySelector('[data-modal-content]') as HTMLElement | null;

    let isAnimating = false;

    const animateBackdropIn = async () => {
      const backdrop = getBackdrop();
      if (!backdrop) return;
      if (prefersReducedMotion) { backdrop.style.opacity = '1'; return; }
      await animate(backdrop, { opacity: [0, 1] }, MODAL_ANIMATION_CONFIG.backdrop.options);
    };

    const animateContentIn = async () => {
      const content = getContent();
      if (!content) return;
      if (prefersReducedMotion) { content.style.opacity = '1'; content.style.transform = ''; return; }
      await animate(content, MODAL_ANIMATION_CONFIG.content.enter.keyframes, MODAL_ANIMATION_CONFIG.content.enter.options);
    };

    const animateContentOut = async () => {
      const content = getContent();
      if (!content) return;
      if (prefersReducedMotion) {
        content.style.opacity = '0';
        content.style.transform = `scale(${MODAL_INITIAL_SCALE}) translateY(${MODAL_INITIAL_Y_OFFSET}px)`;
        return;
      }
      await animate(content, MODAL_ANIMATION_CONFIG.content.exit.keyframes, MODAL_ANIMATION_CONFIG.content.exit.options);
    };

    const handleShow = async () => {
      if (isAnimating) return;
      isAnimating = true;
      const backdrop = getBackdrop();
      const content = getContent();
      if (prefersReducedMotion) {
        if (backdrop) backdrop.style.opacity = '1';
        if (content) { content.style.opacity = '1'; content.style.transform = ''; }
      } else {
        if (backdrop) backdrop.style.opacity = '0';
        if (content) {
          content.style.opacity = '0';
          content.style.transform = `scale(${MODAL_INITIAL_SCALE}) translateY(${MODAL_INITIAL_Y_OFFSET}px)`;
        }
        await Promise.all([animateBackdropIn(), animateContentIn()]);
      }
      isAnimating = false;
    };

    const handleClose = async (event: Event) => {
      if (isAnimating) return;
      isAnimating = true;
      event.preventDefault();
      if (prefersReducedMotion) {
        modal.close();
      } else {
        await animateContentOut();
        modal.close();
      }
      isAnimating = false;
    };

    // Reset styles after native close completes
    modal.addEventListener('close', () => {
      const backdrop = getBackdrop();
      const content = getContent();
      if (backdrop) backdrop.style.opacity = '';
      if (content) { content.style.opacity = ''; content.style.transform = ''; }
    });

    // Trigger enter animation when dialog opens via showModal()
    modal.addEventListener('toggle', (e) => {
      const toggleEvent = e as ToggleEvent;
      if (toggleEvent.newState === 'open' && !isAnimating) {
        requestAnimationFrame(() => handleShow());
      }
    });

    // Intercept Escape key to run exit animation before closing
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.open && !isAnimating) {
        e.preventDefault();
        handleClose(e);
      }
    });

    // Intercept backdrop click
    if (backdropClose) {
      modal.addEventListener('click', (e) => {
        const rect = modal.getBoundingClientRect();
        const isInDialog =
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width;
        if (!isInDialog && modal.open && !isAnimating) {
          handleClose(e);
        }
      });
    }

    // Intercept close-button form submissions for animated exit
    const closeForms = modal.querySelectorAll('form[method="dialog"]');
    closeForms.forEach((closeForm) => {
      closeForm.addEventListener('submit', (e: Event) => {
        if (modal.open && !isAnimating) {
          handleClose(e);
        }
      });
    });
  }

  function initAllModals() {
    document.querySelectorAll<HTMLDialogElement>('dialog[data-modal]').forEach(initModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllModals);
  } else {
    initAllModals();
  }

  document.addEventListener('astro:page-load', initAllModals);
</script>
```

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors. If `ToggleEvent` is not found, add `/// <reference lib="dom" />` at the top of the script or cast: `const toggleEvent = e as unknown as { newState: string }`.

- [ ] **Step 3: Write regression test**

Create `tests/regression/settings-modal-migration.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Modal.astro — native dialog API', () => {
  it('does not use MutationObserver', () => {
    const source = read('src/components/molecules/Modal.astro');
    expect(source).not.toContain('MutationObserver');
  });

  it('uses toggle event for animation trigger', () => {
    const source = read('src/components/molecules/Modal.astro');
    expect(source).toContain("addEventListener('toggle'");
  });

  it('handles Escape key via keydown listener', () => {
    const source = read('src/components/molecules/Modal.astro');
    expect(source).toContain("key === 'Escape'");
  });
});
```

- [ ] **Step 4: Run the regression test**

```bash
bun test tests/regression/settings-modal-migration.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/Modal.astro tests/regression/settings-modal-migration.test.ts
git commit -m "fix(modal): replace MutationObserver with toggle event, add Escape key support"
```

---

## Task 2: Rewrite InviteMemberModal.astro

**Files:**
- Modify: `src/components/organisms/InviteMemberModal.astro`

The current InviteMemberModal uses `closable={false}`, opens via `modal.classList.add('modal-open')` (bypassing `showModal()`), and has cleanup logic scattered in the cancel click handler. Rewrite to use the fixed `Modal.astro` properly.

Key changes:
- `closable={true}` — Modal renders the X button
- Cancel button becomes `<form method="dialog">` — handled by Modal's animation interceptor
- Actions row: `grid grid-cols-3`, Cancel `col-span-1`, Send Invitation `col-span-2`
- All cleanup (form reset, hide error/success) moves to the `close` event on the dialog
- `window.openInviteMemberModal` removed — callers use `modal.showModal()` directly

- [ ] **Step 1: Replace InviteMemberModal.astro**

Overwrite `src/components/organisms/InviteMemberModal.astro` with:

```astro
---
/**
 * Invite Member Modal Component
 *
 * Modal for inviting new members to the workspace.
 * Admin only functionality.
 *
 * @param {string} id - Modal ID
 */

import Modal from '../molecules/Modal.astro';
import Button from '@/components/atoms/Button.astro';
import Input from '../atoms/Input.astro';
import Label from '../atoms/Label.astro';
import { UserPlus } from '@lucide/astro';

export interface Props {
  id: string;
}

const { id } = Astro.props;
---

<div data-invite-member-modal data-id={id}>
  <Modal id={id} size="md" closable={true} backdropClose={true}>
    <div slot="default" class="flex flex-col gap-6">
      <!-- Header section -->
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-accent/10">
          <UserPlus size={24} class="stroke-current text-accent" aria-hidden="true" />
        </div>
        <div class="flex-1">
          <h2
            class="text-2xl font-bold tracking-tight text-primary leading-none"
            id={`${id}-title`}
          >
            Invite Member
          </h2>
          <p class="text-base-content/60 text-sm mt-2 font-medium">
            Send an invitation to join your workspace.
          </p>
        </div>
      </div>

      <!-- Form -->
      <form id={`${id}-form`} data-invite-form class="flex flex-col gap-5">
        <div class="form-control">
          <Label htmlFor={`${id}-email`} required>Email Address</Label>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            placeholder="colleague@example.com"
            className="rounded-lg py-4 px-6 h-14 text-base font-bold border border-base-300"
          />
        </div>

        <div class="form-control">
          <Label htmlFor={`${id}-role`} required>Role</Label>
          <select
            name="role"
            id={`${id}-role`}
            class="select select-bordered w-full h-14 rounded-lg border border-base-300 bg-base-200 py-4 pl-6 pr-10 text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            required
          >
            <option value="member">Member - Can view and add transactions</option>
            <option value="admin">Admin - Full access including settings</option>
          </select>
          <p class="text-xs text-base-content/50 mt-2 ml-4">
            Members can view and manage transactions. Admins can also manage workspace settings and
            members.
          </p>
        </div>

        <!-- Error message -->
        <div
          id={`${id}-error`}
          class="hidden alert alert-error text-sm rounded-2xl"
          role="alert"
          aria-live="polite"
          data-form-error
        ></div>

        <!-- Success message -->
        <div
          id={`${id}-success`}
          class="hidden alert alert-success text-sm rounded-2xl"
          role="status"
          aria-live="polite"
          data-form-success
        ></div>

        <!-- Actions: grid col-span-1 / col-span-2 pattern -->
        <div class="grid grid-cols-3 gap-4 pt-2">
          <form method="dialog" class="col-span-1">
            <Button
              type="submit"
              variant="ghost"
              className="w-full h-14 font-bold border-0"
            >
              Cancel
            </Button>
          </form>
          <Button type="submit" variant="primary" className="col-span-2 h-14 font-bold">
            Send Invitation
          </Button>
        </div>
      </form>
    </div>
  </Modal>
</div>

<script>
  import { addToast } from '@/lib/stores/toastStore';
  import { getCsrfHeaders } from '@/lib/csrf-client';
  import { setButtonLoading } from '@/lib/client-utils';

  const initializedContainers = new WeakSet<Element>();

  function initInviteMemberModals() {
    document.querySelectorAll('[data-invite-member-modal]').forEach((container) => {
      if (initializedContainers.has(container)) return;
      initializedContainers.add(container);

      const id = container.getAttribute('data-id');
      if (!id) return;

      const modal = document.getElementById(id) as HTMLDialogElement | null;
      const form = container.querySelector('[data-invite-form]') as HTMLFormElement | null;
      const errorEl = container.querySelector('[data-form-error]');
      const successEl = container.querySelector('[data-form-success]');

      if (!modal || !form) return;

      // Cleanup on every close: reset form and hide messages
      modal.addEventListener('close', () => {
        form.reset();
        errorEl?.classList.add('hidden');
        successEl?.classList.add('hidden');
      });

      // Handle form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]:not(form[method="dialog"] *)') as HTMLButtonElement | null;

        errorEl?.classList.add('hidden');
        successEl?.classList.add('hidden');

        if (submitBtn) setButtonLoading(submitBtn, true);

        try {
          const formData = new FormData(form);
          const email = formData.get('email') as string;
          const role = formData.get('role') as string;

          const response = await fetch('/api/workspace/invitations', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
            body: JSON.stringify({ email, role }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to send invitation');
          }

          if (successEl) {
            successEl.textContent = `Invitation sent to ${email}!`;
            successEl.classList.remove('hidden');
          }
          addToast('Invitation sent successfully!', 'success');
          form.reset();

          document.dispatchEvent(new CustomEvent('invitation:created'));

          // Close after brief success display
          setTimeout(() => modal.close(), 2000);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to send invitation';
          if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
          }
        } finally {
          if (submitBtn) setButtonLoading(submitBtn, false);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInviteMemberModals);
  } else {
    initInviteMemberModals();
  }

  document.addEventListener('astro:page-load', initInviteMemberModals);
</script>
```

- [ ] **Step 2: Add regression test for InviteMemberModal**

Add to `tests/regression/settings-modal-migration.test.ts`:

```ts
describe('InviteMemberModal.astro — standard Modal usage', () => {
  it('uses closable={true}', () => {
    const source = read('src/components/organisms/InviteMemberModal.astro');
    expect(source).toContain('closable={true}');
  });

  it('uses grid grid-cols-3 action layout', () => {
    const source = read('src/components/organisms/InviteMemberModal.astro');
    expect(source).toContain('grid grid-cols-3');
    expect(source).toContain('col-span-2');
  });

  it('does not use classList.add modal-open', () => {
    const source = read('src/components/organisms/InviteMemberModal.astro');
    expect(source).not.toContain("classList.add('modal-open')");
    expect(source).not.toContain('classList.add("modal-open")');
  });

  it('does not define openInviteMemberModal global', () => {
    const source = read('src/components/organisms/InviteMemberModal.astro');
    expect(source).not.toContain('openInviteMemberModal');
  });
});
```

- [ ] **Step 3: Run regression tests**

```bash
bun test tests/regression/settings-modal-migration.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/InviteMemberModal.astro tests/regression/settings-modal-migration.test.ts
git commit -m "fix(invite-modal): rewrite to use Modal.astro properly with keyboard nav and grid layout"
```

---

## Task 3: Update settings/index.astro — callers, save button, cancel-invitation-modal

**Files:**
- Modify: `src/pages/settings/index.astro`

Three changes in this task:
1. Update the `openInviteMemberModal()` call to use `modal.showModal()` directly
2. Fix save button: move inside General panel, change to `size="lg" className="w-full"`
3. Migrate `cancel-invitation-modal` raw `<dialog>` to use `Modal.astro`

- [ ] **Step 1: Update the Invite Member button onclick**

In `src/pages/settings/index.astro`, find the Invite Member button (around line 459):

```astro
onclick="openInviteMemberModal()"
```

Replace with:

```astro
onclick="document.getElementById('invite-member-modal')?.showModal()"
```

- [ ] **Step 2: Move and fix the Save button**

Find the Save button section at the bottom of the card (around lines 659–671):

```astro
          {/* Bottom Save Button (visible after scrolling through form) */}
          <div class="border-t border-base-300 pt-6 mt-2">
            <Button
              type="button"
              variant="primary"
              className="h-14 w-full gap-2 font-bold shadow-sm"
              id="save-settings-btn-bottom"
            >
              <Save size={18} class="stroke-current" aria-hidden="true" />
              Save Changes
            </Button>
          </div>
```

Delete this entire block. Then, inside the General panel section, after the closing `</form>` tag (around line 427), add:

```astro
              <div class="border-t border-base-300 pt-6 mt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full gap-2 font-bold shadow-sm"
                  id="save-settings-btn"
                >
                  <Save size={18} class="stroke-current" aria-hidden="true" />
                  Save Changes
                </Button>
              </div>
```

- [ ] **Step 3: Update the save button JS reference**

In the inline `<script>` at the bottom of `index.astro`, find:

```ts
const saveBtnBottom = document.getElementById(
  'save-settings-btn-bottom'
) as HTMLButtonElement | null;
```

Replace with:

```ts
const saveBtnBottom = document.getElementById('save-settings-btn') as HTMLButtonElement | null;
```

Also find:

```ts
if (saveBtnBottom && settingsForm) {
  saveBtnBottom.addEventListener('click', handleSave);
}
```

This can stay as-is since the variable name still works.

- [ ] **Step 4: Migrate cancel-invitation-modal to Modal.astro**

In the frontmatter imports block at the top, `Modal` is not currently imported. Add it:

```astro
import Modal from '@/components/molecules/Modal.astro';
```

Find the raw `<dialog id="cancel-invitation-modal" ...>` block (lines ~680–706):

```astro
  {/* Cancel Invitation Confirmation Modal */}
  <dialog id="cancel-invitation-modal" class="modal" data-cancel-invitation-modal>
    <div class="modal-box max-w-md rounded-card shadow-premium">
      <h3 class="font-bold text-lg text-warning">Cancel Invitation</h3>
      <p class="py-4 text-base-content/70">
        Are you sure you want to cancel the invitation to <span
          class="font-semibold"
          data-invitation-email-display></span>? They will no longer be able to join this workspace
        using the invitation link.
      </p>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn btn-ghost rounded-2xl">Keep Invitation</button>
        </form>
        <Button
          type="button"
          variant="warning"
          data-confirm-cancel-invitation
          data-canceling-invitation-id=""
        >
          Cancel Invitation
        </Button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
```

Replace with:

```astro
  {/* Cancel Invitation Confirmation Modal */}
  <Modal
    id="cancel-invitation-modal"
    size="sm"
    closable={true}
    backdropClose={true}
    ariaLabel="Cancel invitation"
  >
    <div slot="default" data-cancel-invitation-modal>
      <h3 class="font-bold text-lg text-warning mb-2">Cancel Invitation</h3>
      <p class="text-base-content/70">
        Are you sure you want to cancel the invitation to <span
          class="font-semibold"
          data-invitation-email-display></span>? They will no longer be able to join this workspace
        using the invitation link.
      </p>
    </div>
    <div slot="actions" class="modal-action">
      <form method="dialog">
        <Button type="submit" variant="ghost" className="rounded-2xl">Keep Invitation</Button>
      </form>
      <Button
        type="button"
        variant="warning"
        data-confirm-cancel-invitation
        data-canceling-invitation-id=""
      >
        Cancel Invitation
      </Button>
    </div>
  </Modal>
```

- [ ] **Step 5: Update cancel-invitation JS to use showModal()**

In the inline `<script>`, find where the cancel invitation modal is opened (around line 829):

```ts
cancelInvitationModal.showModal();
```

This is already correct (the existing code uses `showModal()`). Verify it's not using `classList.add`. Also update the querySelector for `data-cancel-invitation-modal` since it moved into the slot:

Find:

```ts
const cancelInvitationModal = document.getElementById(
  'cancel-invitation-modal'
) as HTMLDialogElement | null;
const invitationEmailDisplay = cancelInvitationModal?.querySelector(
  '[data-invitation-email-display]'
);
const confirmCancelBtn = cancelInvitationModal?.querySelector(
  '[data-confirm-cancel-invitation]'
) as HTMLButtonElement | null;
```

These selectors work unchanged since `data-invitation-email-display` and `data-confirm-cancel-invitation` are still inside the dialog element. No change needed.

- [ ] **Step 6: Add regression test for settings page**

Add to `tests/regression/settings-modal-migration.test.ts`:

```ts
describe('settings/index.astro — modal callers', () => {
  it('does not call openInviteMemberModal global', () => {
    const source = read('src/pages/settings/index.astro');
    expect(source).not.toContain('openInviteMemberModal()');
  });

  it('save button uses size prop not hardcoded h-14 w-full', () => {
    const source = read('src/pages/settings/index.astro');
    expect(source).not.toContain('h-14 w-full');
    expect(source).toContain('size="lg"');
  });

  it('cancel-invitation-modal uses Modal component', () => {
    const source = read('src/pages/settings/index.astro');
    expect(source).not.toContain('<dialog id="cancel-invitation-modal"');
    expect(source).toContain('id="cancel-invitation-modal"');
  });
});
```

- [ ] **Step 7: Run regression tests + typecheck**

```bash
bun test tests/regression/settings-modal-migration.test.ts
bun run typecheck
```

Expected: all tests pass, 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/settings/index.astro tests/regression/settings-modal-migration.test.ts
git commit -m "fix(settings): scope save button to General tab, migrate modals to Modal.astro"
```

---

## Task 4: Redesign the Data panel

**Files:**
- Modify: `src/pages/settings/index.astro` (Data panel section + new modals)

Replace the placeholder Data panel with two real sections: **Danger Zone** (Clear History + Factory Reset with confirmation modals) and **Backup & Restore** (coming-soon UI). Both destructive actions are admin-only; buttons are disabled with tooltip for non-admins.

- [ ] **Step 1: Replace the Data panel section**

In `src/pages/settings/index.astro`, find the Data panel `<section>` (starts around line 602, `id="settings-panel-data"`). Replace the entire section content with:

```astro
            {/* Data Panel */}
            <section
              id="settings-panel-data"
              data-settings-panel
              data-tab="data"
              role="tabpanel"
              aria-labelledby="settings-tab-data"
              class="hidden"
            >
              <div class="flex flex-col gap-8">
                <header class="space-y-1">
                  <h2 class="text-xl font-semibold text-base-content">Data Management</h2>
                  <p class="text-sm text-base-content/60">
                    Manage workspace data. Destructive actions require admin access.
                  </p>
                </header>
                <div class="divider my-0"></div>

                {/* Danger Zone */}
                <div class="flex flex-col gap-6">
                  <h3 class="text-base font-semibold text-error flex items-center gap-2">
                    <Trash2 size={16} class="stroke-current" aria-hidden="true" />
                    Danger Zone
                  </h3>

                  {/* Clear Transaction History */}
                  <div class="flex flex-col gap-4 rounded-box border border-warning/30 bg-base-200 p-6">
                    <div class="space-y-1">
                      <p class="font-semibold text-base-content">Clear Transaction History</p>
                      <p class="text-sm text-base-content/60">
                        Permanently deletes all transactions. Accounts, budgets, and categories are kept.
                      </p>
                    </div>
                    <div class="alert alert-warning text-sm py-3">
                      <Info size={16} class="shrink-0" aria-hidden="true" />
                      <span>This cannot be undone.</span>
                    </div>
                    <div class={!isAdmin ? 'tooltip tooltip-top w-fit' : ''} data-tip={!isAdmin ? 'Admin access required' : undefined}>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={!isAdmin}
                        data-open-modal="clear-history-modal"
                      >
                        <Trash2 size={14} class="stroke-current" aria-hidden="true" />
                        Clear History
                      </Button>
                    </div>
                  </div>

                  {/* Factory Reset */}
                  <div class="flex flex-col gap-4 rounded-box border border-error/30 bg-base-200 p-6">
                    <div class="space-y-1">
                      <p class="font-semibold text-base-content">Factory Reset</p>
                      <p class="text-sm text-base-content/60">
                        Deletes everything — transactions, accounts, budgets, categories, and workspace settings. Members are kept.
                      </p>
                    </div>
                    <div class="alert alert-error text-sm py-3">
                      <Info size={16} class="shrink-0" aria-hidden="true" />
                      <span>This is irreversible.</span>
                    </div>
                    <div class={!isAdmin ? 'tooltip tooltip-top w-fit' : ''} data-tip={!isAdmin ? 'Admin access required' : undefined}>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={!isAdmin}
                        data-open-modal="factory-reset-modal"
                      >
                        <RotateCcw size={14} class="stroke-current" aria-hidden="true" />
                        Factory Reset
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Backup & Restore — coming soon */}
                <div class="flex flex-col gap-4">
                  <h3 class="text-base font-semibold text-base-content flex items-center gap-2">
                    <Database size={16} class="stroke-current" aria-hidden="true" />
                    Backup & Restore
                    <span class="badge badge-neutral badge-sm">Coming soon</span>
                  </h3>
                  <div class="flex flex-col gap-3 rounded-box border border-base-300 bg-base-200/50 p-6 opacity-60">
                    <div class="flex flex-col sm:flex-row gap-3">
                      <Button type="button" variant="outline" size="sm" disabled className="flex-1">
                        <Database size={14} class="stroke-current" aria-hidden="true" />
                        Download Backup
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled className="flex-1">
                        <RotateCcw size={14} class="stroke-current" aria-hidden="true" />
                        Restore from Backup
                      </Button>
                    </div>
                    <p class="text-xs text-base-content/50">
                      Backup & restore is tracked in
                      <a
                        href="https://github.com/ivankristianto/allowealth/issues/351"
                        class="link link-hover"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        issue #351
                      </a>.
                    </p>
                  </div>
                </div>
              </div>
            </section>
```

- [ ] **Step 2: Add confirmation modals for Clear History and Factory Reset**

Below the `<InviteMemberModal>` and the cancel-invitation `<Modal>`, add two new modals:

```astro
  {/* Clear Transaction History Confirmation Modal */}
  <Modal id="clear-history-modal" size="sm" closable={true} backdropClose={true} ariaLabel="Clear transaction history">
    <div slot="default">
      <h3 class="font-bold text-lg text-warning mb-2">Clear Transaction History</h3>
      <p class="text-base-content/70">
        Are you sure? All transactions will be permanently deleted. Accounts, budgets, and categories are kept. This cannot be undone.
      </p>
    </div>
    <div slot="actions" class="modal-action">
      <form method="dialog">
        <Button type="submit" variant="ghost" className="rounded-2xl">Cancel</Button>
      </form>
      <Button type="button" variant="danger" data-confirm-clear-history>
        Clear History
      </Button>
    </div>
  </Modal>

  {/* Factory Reset Confirmation Modal */}
  <Modal id="factory-reset-modal" size="sm" closable={true} backdropClose={false} ariaLabel="Factory reset">
    <div slot="default">
      <h3 class="font-bold text-lg text-error mb-2">Factory Reset</h3>
      <p class="text-base-content/70 mb-4">
        This will delete all transactions, accounts, budgets, categories, and workspace settings. Members are kept. This is irreversible.
      </p>
      <p class="text-sm font-semibold mb-2">Type <code class="bg-base-300 px-1 rounded">RESET</code> to confirm:</p>
      <input
        type="text"
        id="factory-reset-confirm-input"
        class="input input-bordered w-full"
        placeholder="RESET"
        autocomplete="off"
        data-reset-confirm-input
      />
    </div>
    <div slot="actions" class="modal-action">
      <form method="dialog">
        <Button type="submit" variant="ghost" className="rounded-2xl">Cancel</Button>
      </form>
      <Button type="button" variant="danger" disabled data-confirm-factory-reset>
        Factory Reset
      </Button>
    </div>
  </Modal>
```

- [ ] **Step 3: Add client-side JS for the data panel modals**

In the inline `<script>` block at the bottom of `index.astro`, add after the cancel invitation handlers:

```ts
  // ==================== DATA PANEL ====================

  // Open modal buttons via data-open-modal attribute
  document.querySelectorAll<HTMLButtonElement>('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.openModal;
      if (!modalId) return;
      const modal = document.getElementById(modalId) as HTMLDialogElement | null;
      modal?.showModal();
    });
  });

  // Clear History — stub (API not implemented yet)
  const confirmClearHistoryBtn = document.querySelector(
    '[data-confirm-clear-history]'
  ) as HTMLButtonElement | null;

  if (confirmClearHistoryBtn) {
    confirmClearHistoryBtn.addEventListener('click', () => {
      addToast('Clear History is not yet implemented.', 'info');
      (document.getElementById('clear-history-modal') as HTMLDialogElement | null)?.close();
    });
  }

  // Factory Reset — typed confirmation + stub
  const resetInput = document.getElementById(
    'factory-reset-confirm-input'
  ) as HTMLInputElement | null;
  const confirmResetBtn = document.querySelector(
    '[data-confirm-factory-reset]'
  ) as HTMLButtonElement | null;
  const factoryResetModal = document.getElementById(
    'factory-reset-modal'
  ) as HTMLDialogElement | null;

  if (resetInput && confirmResetBtn) {
    resetInput.addEventListener('input', () => {
      confirmResetBtn.disabled = resetInput.value !== 'RESET';
    });
  }

  // Clear the input whenever the modal closes
  factoryResetModal?.addEventListener('close', () => {
    if (resetInput) resetInput.value = '';
    if (confirmResetBtn) confirmResetBtn.disabled = true;
  });

  if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', () => {
      addToast('Factory Reset is not yet implemented.', 'info');
      factoryResetModal?.close();
    });
  }
```

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Run all regression tests**

```bash
bun test tests/regression/
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/index.astro
git commit -m "feat(settings): redesign Data panel with danger zone actions and coming-soon backup section"
```

---

## Task 5: Add Server Stats tab (admin only)

**Files:**
- Modify: `src/pages/settings/index.astro`

Add a Server Stats tab visible only to admins. Reuses `DiagnosticsDisplay` component with data from `DiagnosticsService`, same pattern as `/admin/diagnostics.astro`.

- [ ] **Step 1: Add imports**

In the frontmatter of `src/pages/settings/index.astro`, add:

```ts
import DiagnosticsDisplay from '@/components/organisms/DiagnosticsDisplay.astro';
import { DiagnosticsService } from '@/services/diagnostics.service';
import { db } from '@/db';
import { Server, CircleAlert } from '@lucide/astro';
```

(`db` is required by `DiagnosticsService`. `CircleAlert` is used in the error banner in Step 4. Both must be in the import list.)

- [ ] **Step 2: Fetch diagnostics data server-side**

After the existing workspace/member data fetch block (after the outer `try/catch` around line 129), add:

```ts
// Server stats (admin only)
let diagnosticsData = null;
let diagnosticsError: string | null = null;

if (isAdmin) {
  try {
    const diagnosticsService = new DiagnosticsService(db);
    diagnosticsData = await diagnosticsService.getDiagnostics();
  } catch (err) {
    console.error('Failed to fetch diagnostics:', err);
    diagnosticsError = err instanceof Error ? err.message : 'Unknown error';
  }
}
```

Also add `import { db } from '@/db';` to the frontmatter imports (if not already present; check first).

- [ ] **Step 3: Add Server Stats to navItems**

Find the `navItems` array definition (around line 133). The current code uses `as const` which makes the array readonly — `.push()` will fail TypeScript. Remove `as const`, keep `const`, and add an explicit type annotation. Then push conditionally:

```ts
const navItems: Array<{ id: string; label: string; icon: typeof Settings }> = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data', icon: Database },
];

if (isAdmin) {
  navItems.push({ id: 'server-stats', label: 'Server Stats', icon: Server });
}
```

**Important:** Remove the `as const` suffix from the original array declaration. Keep `const` — you do not need `let`.

- [ ] **Step 4: Add the Server Stats panel**

Inside the `<article>` panels area, after the Data panel `</section>`, add:

```astro
            {/* Server Stats Panel (admin only) */}
            {
              isAdmin && (
                <section
                  id="settings-panel-server-stats"
                  data-settings-panel
                  data-tab="server-stats"
                  role="tabpanel"
                  aria-labelledby="settings-tab-server-stats"
                  class="hidden"
                >
                  <div class="flex flex-col gap-6">
                    <header class="space-y-1">
                      <h2 class="text-xl font-semibold text-base-content">Server Stats</h2>
                      <p class="text-sm text-base-content/60">
                        Runtime configuration, database, and cache health.
                      </p>
                    </header>
                    <div class="divider my-0"></div>

                    {diagnosticsError && (
                      <div class="alert alert-error rounded-xl" role="alert">
                        <CircleAlert size={20} class="shrink-0" aria-hidden="true" />
                        <div>
                          <h3 class="font-bold">Error Loading Stats</h3>
                          <p class="text-sm">{diagnosticsError}</p>
                        </div>
                      </div>
                    )}

                    {diagnosticsData && <DiagnosticsDisplay data={diagnosticsData} />}
                  </div>
                </section>
              )
            }
```

(`CircleAlert` was added to the lucide imports in Step 1.)

- [ ] **Step 5: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors. If `db` import is missing, add `import { db } from '@/db';`.

- [ ] **Step 6: Run all tests**

```bash
bun test tests/regression/
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/settings/index.astro
git commit -m "feat(settings): add admin-only Server Stats tab using DiagnosticsDisplay"
```

---

## Task 6: Quality gates

- [ ] **Step 1: Run full quality gate suite**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: all pass with 0 errors.

- [ ] **Step 2: Run all regression tests**

```bash
bun test tests/regression/
```

Expected: all pass.

- [ ] **Step 3: Build check**

```bash
bun run build
```

Expected: build completes with 0 errors.

- [ ] **Step 4: Final commit if any lint/format auto-fixes were applied**

```bash
git add -p
git commit -m "style: apply lint and format fixes for ALL-60"
```

---

## Verification Checklist

After all tasks complete, manually verify:

- [ ] Settings page opens — General tab is default, save button visible only on General tab
- [ ] Invite Member button opens modal via `showModal()` — Escape key closes it, X button closes it, Cancel button closes it
- [ ] Inviting a member works end-to-end (if dev server running)
- [ ] Cancel invitation modal opens, Escape closes it, Keep Invitation closes it
- [ ] Data tab → Clear History button opens confirmation modal (shows stub toast on confirm)
- [ ] Data tab → Factory Reset button opens modal, confirm button disabled until "RESET" typed
- [ ] Backup & Restore section shows "Coming soon" badge and link to #351
- [ ] As non-admin: Clear History and Factory Reset buttons are disabled with tooltip
- [ ] As admin: Server Stats tab appears and shows DiagnosticsDisplay
- [ ] As non-admin: Server Stats tab is absent from DOM entirely
