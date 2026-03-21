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

- Remove the `MutationObserver` approach.
- Patch `dialog.showModal` on each dialog element so the enter animation fires before the native `showModal()` call.
- Intercept `keydown` on the dialog to catch Escape: run the exit animation, then call `modal.close()`.
- Intercept `form[method="dialog"]` submit events for the animated exit (already in place — keep as-is).
- Update all callers that use `modal.classList.add('modal-open')` to call `modal.showModal()` instead.

**InviteMemberModal rewrite:**

- Use `closable={true}` so Modal renders the X close button.
- Replace cancel button with `<form method="dialog">` so Modal's animation interceptor handles it.
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

- Grayed-out card showing two disabled placeholders: "Download Backup" and "Restore from Backup"
- "Coming soon" badge
- Link to GitHub issue [#351](https://github.com/ivankristianto/allowealth/issues/351)
- No API wiring in this scope — UI only

**Backup format (for #351):** SQL dump (`.sql` file). Cloudflare D1 supports SQL import/export natively; local SQLite supports `.dump` producing the same format.

---

## 4. Server Stats Section (admin only)

A new tab added to the settings sidebar nav: **"Server Stats"** with a `Server` icon.

- Tab and panel are only rendered server-side when `user.role === 'admin'` — not just hidden, fully absent from DOM for non-admins.
- Panel renders `DiagnosticsDisplay` with data fetched via `DiagnosticsService` — same pattern as `/admin/diagnostics`.
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
