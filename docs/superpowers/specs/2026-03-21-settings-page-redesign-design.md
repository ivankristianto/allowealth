# Settings Page Redesign — Design Spec

**Issue:** ALL-60 / [#350](https://github.com/ivankristianto/allowealth/issues/350)
**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Improve the settings page by fixing design system inconsistencies, rewriting the invite modal, redesigning the data management panel, and adding a server stats section for admins.

---

## 1. Modal Component Fix

**Problem:** `Modal.astro` opens dialogs by toggling the `modal-open` CSS class via a `MutationObserver`. This bypasses the native `<dialog>` API, breaking Escape key support and focus trapping.

**Fix:**

- Remove the `MutationObserver`. Replace it with a `toggle` event listener on the dialog element. The `toggle` event fires natively when a `<dialog>` transitions between open and closed states (via `showModal()` or `close()`). Use `e.newState === 'open'` to trigger the enter animation.
- Intercept `keydown` on the dialog to catch Escape (`key === 'Escape'`): call `e.preventDefault()`, run exit animation, then `modal.close()`.
- Intercept `form[method="dialog"]` submit events for the animated exit (already in place — keep as-is).
- Update all callers that use `modal.classList.add('modal-open')` to call `modal.showModal()` instead. In `InviteMemberModal`, also update the `setTimeout` success-close path (line ~203) from `modal.classList.remove('modal-open')` to `modal.close()`.
- The existing `cancel-invitation-modal` raw `<dialog>` on the settings page (lines ~679–706) must also be migrated to use `Modal.astro` in this scope, so all modals on the settings page use the same component and animation system. Use `Modal.astro` with `closable={true}` and a `slot="actions"` for the Keep/Cancel buttons.
- The `toggle` event on `<dialog>` requires Chrome 117+, Firefox 127+, Safari 17.4+. This is acceptable for this project's target audience.

**InviteMemberModal rewrite:**

- Use `closable={true}` so Modal renders the X close button.
- Replace the cancel button with `<form method="dialog">` wrapping a ghost button, so Modal's animation interceptor handles the close. Move form reset and error/success message hide logic from the cancel click handler into the modal's `close` event listener, so cleanup runs regardless of how the modal is dismissed (X button, Escape, or Cancel).
- Replace the success-path `modal.classList.remove('modal-open')` with `modal.close()`.
- Replace the actions row layout from `flex` with `grid grid-cols-3`: Cancel button is `col-span-1`, Send Invitation button is `col-span-2`. This satisfies the design system grid pattern requirement.
- Remove the `window.openInviteMemberModal` global function — call `modal.showModal()` directly from the settings page script.

---

## 2. Save Button

**Problem:** Save button uses hardcoded `className="h-14 w-full"` instead of the Button `size` prop. It also appears on every tab regardless of whether that tab has saveable state.

**Fix:**

- Replace `className="h-14 w-full"` with `size="lg" className="w-full"`.
- Move the save button inside the General panel `<section>`, below the form.
- Members, Notifications, and Data panels have no save button — each panel manages its own actions inline.

---

## 3. Data Panel Redesign

The existing placeholder (disabled buttons, "coming soon" note) is replaced with a fully functional layout split into two sections.

### 3a. Danger Zone

Both actions are **admin-only**. Non-admin users see the section with buttons disabled and a tooltip: "Admin access required."

Confirmation modals for both actions must use the `Modal.astro` component (not raw `<dialog>` markup), consistent with the modal standardisation work in section 1. Import from `@/components/molecules/Modal.astro`. Props: `id`, `size`, `closable`, `backdropClose`; slot `default` for body content, slot `actions` for buttons.

Escape closes both confirmation modals normally via the animated close path — no suppression needed.

**Clear Transaction History**
- Description: "Permanently deletes all transactions. Accounts, budgets, and categories are kept."
- Warning banner (`alert-warning`): "This cannot be undone."
- Button: `variant="danger"` label "Clear History"
- Opens a confirmation modal:
  - Title: "Clear Transaction History"
  - Body: "Are you sure? All transactions will be permanently deleted. This cannot be undone."
  - Actions: Cancel (ghost) / Confirm (danger)

**Factory Reset**
- Description: "Deletes everything — transactions, accounts, budgets, categories, and workspace settings. Members are kept."
- Error banner (`alert-error`): "This is irreversible."
- Button: `variant="danger"` label "Factory Reset"
- Opens a confirmation modal with typed confirmation:
  - Title: "Factory Reset"
  - Body: instruction to type `RESET` to confirm
  - Text input: placeholder `RESET`, must match exactly before confirm button enables
  - Actions: Cancel (ghost) / Confirm (danger, disabled until input matches)

### 3b. Backup & Restore (coming soon)

**Scope note:** The original ALL-60 acceptance criterion includes a working backup/restore feature. After discussion, the decision was made to defer the implementation to [#351](https://github.com/ivankristianto/allowealth/issues/351) and ship only the UI shell in this issue. The ALL-60 criterion is intentionally not fully met in this scope.

- Grayed-out card showing two disabled placeholders: "Download Backup" and "Restore from Backup"
- "Coming soon" badge
- Link to GitHub issue [#351](https://github.com/ivankristianto/allowealth/issues/351) for follow-up
- No API wiring in this scope — UI only

**Backup format (decided for #351):** SQL dump (`.sql` file). Cloudflare D1 supports SQL import/export natively; local SQLite supports `.dump` producing the same format.

---

## 4. Server Stats Section (admin only)

A new tab added to the settings sidebar nav: **"Server Stats"** with a `Server` icon.

- Tab and panel are only rendered server-side when `user.role === 'admin'` — not just hidden, fully absent from DOM for non-admins. Implement by conditionally appending the tab to the `navItems` array: `if (isAdmin) navItems.push({ id: 'server-stats', label: 'Server Stats', icon: Server })`.
- Panel renders `DiagnosticsDisplay` with data fetched via `DiagnosticsService`. Import `DiagnosticsDisplay` from `@/components/organisms/DiagnosticsDisplay.astro`; import `DiagnosticsService` from `@/services/diagnostics.service`. Props: `data` typed as `DiagnosticsData`. Follow the same pattern as `/admin/diagnostics.astro` lines 26–31 and 63–73 exactly. Wrap in its own try/catch separate from the workspace data fetch; on error, render an `alert-error` banner and omit `DiagnosticsDisplay`.
- No refresh button in this scope; page reload serves that purpose.

---

## Implementation Order

Following the project's UI → Service → API convention:

1. Fix `Modal.astro` (shared component — unblocks InviteMemberModal)
2. Rewrite `InviteMemberModal.astro`
3. Update settings page — save button scoping + General panel
4. Redesign Data panel (UI + confirmation modals, no API wiring for clear/reset yet)
5. Add Server Stats tab + panel

> **Note:** Clear Transaction History and Factory Reset UI is built in this scope. API endpoints (`DELETE /api/workspace/data/transactions`, `POST /api/workspace/reset`) are a follow-up and not part of ALL-60.

---

## Out of Scope

- Backup & Restore implementation (tracked in [#351](https://github.com/ivankristianto/allowealth/issues/351))
- Clear Transaction History and Factory Reset API endpoints
- Real-time diagnostics refresh
- Notification settings (already marked "coming soon")
