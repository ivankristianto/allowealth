# Consolidate Primary Actions Design

**Date:** 2026-03-05  
**Status:** Approved for planning  
**Scope:** All `ActionBar` consumers (`Transactions`, `Accounts`, `Budget`, `Recurring`, `Budget Categories`, `Account Categories`)

## 1. Problem Statement

The current page-level action bars over-expose actions with equal visual weight, creating decision friction and visual noise ("button soup"). The issue is most visible on Transactions and Accounts, but the pattern is shared across pages.

## 2. Goals

1. Establish a consistent primary-action hierarchy across all `ActionBar` consumers.
2. Reduce visible action density while preserving access to all actions.
3. Improve Accounts information architecture and row-level action scannability.
4. Keep behavior predictable across mobile and desktop.

## 3. Non-Goals

1. No changes to business logic for transactions/accounts operations.
2. No redesign of global header navigation beyond using existing global `New Transaction` behavior.
3. No API/service/schema changes.

## 4. Global Action Hierarchy

All page action bars follow three levels:

1. **Primary**: main progression/create action.
2. **Secondary (visible)**: high-frequency supporting actions.
3. **Overflow**: lower-frequency or advanced actions in a unified `More` menu.

### Visibility Cap (Balanced)

- **Mobile:** `1 primary + 2 secondary visible`
- **Desktop:** `1 primary + 3 secondary visible`
- All excess actions are placed into overflow.

### Consistency Rules

1. Overflow trigger label is always **`More`** (icon + text), not kebab-only.
2. Action order is intent-based and stable across breakpoints.
3. Utility actions (import/export/scan-like) are secondary or overflow, not primary.
4. Transactions page removes page-level add-expense/add-income because creation is already globally available in header.

## 5. Page-by-Page Mapping

## Transactions

- Remove from action bar: `Add Expense`, `Add Income`.
- Keep visible: `Import CSV`, `Export CSV`.
- Overflow: `Scan Receipt` and future tools.
- Bar may be **secondary-only** (no local primary).

## Accounts

- Primary: `New Account`.
- Visible secondary: `Categories`, `Transfer`, `Bulk Add`.
- Overflow: `Closed` (when present) and future low-frequency actions.
- Historical view keeps layout but disables mutation actions.

## Budget

- Primary: `New Budget`.
- Visible secondary: `Categories`, `Import`, `Export`.
- Overflow: `Copy`, `Initialize All`, and future advanced actions.

## Recurring

- Primary: `New Recurring`.
- Secondary/overflow applied as actions expand.

## Budget Categories

- Primary: `Create Category`.
- Visible secondary: `Back`, `Bulk Add`.
- Overflow-ready for future utilities.

## Account Categories

- Primary: `Add Category`.
- Visible secondary: `Back`.
- Overflow-ready for future utilities.

## 6. Accounts IA Cleanup

1. Keep accordion headers concise (`Liquid Accounts`, `Non-Liquid Accounts`, `Debt Accounts`).
2. Move explanatory copy to muted subtitle and/or tooltip, avoiding paragraph-heavy headers.
3. Row-level actions:
   - Keep one quick inline action (`Update Balance`).
   - Move secondary actions (`Timeline`, `Edit Details`, `Deactivate`) behind a single row overflow menu in both mobile and desktop.

## 7. Architecture

## 7.1 ActionBar Role

`ActionBar` becomes layout-only and supports:

1. `primary` zone
2. `secondary-visible` zone
3. `overflow` zone

It must render correctly when no `primary` exists (Transactions case).

## 7.2 Shared Overflow Primitive

Introduce a shared overflow menu component for all action bars.

Expected action item model:

- `id`
- `label`
- `icon`
- `href` or click handler hook
- `disabled`
- optional helper/tooltip text
- stable test id

## 7.3 Shared Action Contract

Each page defines actions through a structured contract (`primary`, `secondary`, `overflow-candidate`).
A shared selector applies the breakpoint caps and returns:

1. visible secondary actions
2. overflow actions

This removes ad-hoc per-page visibility logic.

## 8. Accessibility and Interaction

1. Overflow trigger uses `aria-haspopup="menu"` + `aria-expanded`.
2. Keyboard interaction: tab navigation, `Esc` close, focus return to trigger.
3. Minimum 44x44 interactive targets maintained.
4. Disabled actions are discoverable with clear reason text.

## 9. Error Handling

1. Keep existing toast/error handling for current action handlers.
2. Preserve link-based actions as progressive enhancement fallbacks.
3. Historical mode and unavailable actions render disabled without breaking layout.

## 10. Testing Strategy

1. Unit/component coverage for action partitioning by breakpoint caps.
2. Regression coverage for existing selectors/data attributes used by page scripts.
3. Accounts row-level regression checks for consolidated overflow behavior.
4. Manual browser QA on mobile + desktop for every `ActionBar` consumer.

## 11. Risks and Mitigations

1. **Risk:** Break existing event bindings tied to current button DOM.
   **Mitigation:** Keep stable `data-*` attributes or provide compatibility aliases during migration.
2. **Risk:** Inconsistent overflow behavior across pages.
   **Mitigation:** Single shared overflow primitive and shared partition logic.
3. **Risk:** Historical view accidentally allows mutation.
   **Mitigation:** Explicit disable rules in action contract with tests.

## 12. Rollout Sequence

1. Introduce shared contract and overflow primitive.
2. Migrate Transactions, Accounts, Budget first.
3. Migrate Recurring and category pages.
4. Run full UI regression and responsive QA.

