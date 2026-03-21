# Accounts Table Refinements Design

**Ticket:** ALL-57
**Status:** Approved
**Date:** 2026-03-21

## Problem

The first pass of the accounts table added grouping, sorting, and view persistence, but three UX gaps remain:

1. The accounts page still opens in card view by default even though the new table is the faster scanning surface.
2. Group header colors use hardcoded hex gradients that do not follow the design system's semantic, theme-aware color rules.
3. Table users lost the quick inline history affordance that card users still get through expandable per-account history.

## Solution

Refine the accounts page so table view becomes the default presentation, group headers adopt a calmer design-system-aligned "ledger band" treatment, and each table row gains a visible inline history toggle that expands a compact server-rendered history panel directly beneath the account.

## Design Direction

Use a restrained editorial finance tone instead of saturated section banners. The updated group headers should feel like annotated ledger dividers: neutral surfaces, disciplined spacing, uppercase labels, and one semantic accent per class. The memorable detail is the inline history row under the table account itself - history appears where the user is already scanning instead of sending them to a different context.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default view | Table | The table is now the primary browsing surface and should open without a view switch |
| Header color system | Semantic tokens on neutral surface | Matches design-system rules and remains theme-aware |
| Liquid accent | `accent` | Best semantic fit for healthy liquid cash position |
| Debt accent | `warning` | Signals caution without overusing destructive error styling |
| Non-liquid accent | `info` | Distinguishes long-term assets without conflicting with liquid cash |
| Inline history interaction | Dedicated History button + expandable row | Restores quick-scan history while preserving row readability |
| Existing timeline modal | Keep in overflow menu | Modal remains available for deeper timeline inspection |
| Mobile behavior | Table view keeps stacked cards, each with a History toggle | Maintains responsive layout while restoring parity with desktop quick history |

## Default View Behavior

- The server-rendered accounts page should show `data-view="table"` by default and render `data-view="card"` hidden initially.
- `AccountFilterControls.astro` should default its `defaultView` prop to `table`.
- The client preference in `localStorage` (`accounts-view-mode`) still wins after first render if the user already chose card view.

## Group Header Styling

Replace custom class gradients and hardcoded hex values with a shared neutral band and semantic accent tokens.

### Desktop and Mobile Header Structure

- **Surface:** `bg-base-200/70` with `border-base-300`
- **Class marker:** slim accent rail or chip using semantic token
- **Class label:** uppercase, tracked text in semantic color
- **Subtitle and totals:** `text-base-content` with lower-emphasis opacity variants
- **Count and allocation pills:** semantic tinted pill styles (`accent`, `warning`, `info`) built from theme-aware utility classes

### Class Accent Mapping

| Group | Semantic token usage |
|-------|----------------------|
| Liquid | `text-accent`, `bg-accent/10`, `border-accent/20` |
| Debt | `text-warning`, `bg-warning/10`, `border-warning/20` |
| Non-Liquid | `text-info`, `bg-info/10`, `border-info/20` |

## Quick History in Table View

### Desktop

- Each non-historical table row gets a visible `History` button in the actions cluster.
- Clicking the button expands a secondary `<tr>` immediately below that row.
- The expanded row spans the full table width and contains a server-rendered history container with the same fetched HTML partial currently used by card view inline history.
- Only one inline history panel stays open at a time.

### Mobile

- Each stacked card in table mode gets a small `History` button near the balance/footer area.
- The button expands a compact history container directly under that card.
- The same one-open-at-a-time rule applies.

### Accessibility

- History toggles must be real `<button>` elements.
- Each toggle uses `aria-expanded` and `aria-controls`.
- Each expanded panel uses `role="region"`, `aria-live="polite"`, and an account-specific label.
- Historical month view still suppresses update/history actions and does not render inline history containers.

## Client Behavior

Extend `AccountInlineHistory.client.ts` so it supports both:

- existing card-view row toggles
- explicit inline history buttons in table desktop rows and mobile table cards

The script should target the exact container referenced by the clicked button instead of assuming a single container per account across the whole page. This keeps behavior correct when both card and table markup are present in the DOM simultaneously.

## Search Interaction

Client-side search must continue to hide/show rows in the active view only and must also hide any companion inline-history container associated with a filtered-out table row or card.

## Files

### Modify

- `src/components/molecules/AccountFilterControls.astro`
- `src/components/molecules/AccountInlineHistory.client.ts`
- `src/components/molecules/AccountTableRow.astro`
- `src/components/organisms/AccountTable.astro`
- `src/components/organisms/AccountSearch.client.ts`
- `src/pages/accounts/index.astro`

### Test

- `src/__tests__/account-table-row.test.ts`
- `src/__tests__/account-table.test.ts`
- `src/__tests__/accounts-table-view.test.ts`
- `src/components/organisms/AccountSearch.client.test.ts`
- `src/components/organisms/accounts-table.client.test.ts`
- `src/components/molecules/AccountInlineHistory.client.test.ts`

## Out of Scope

- New backend endpoints or data shapes
- Replacing the existing timeline modal
- Changing account sorting defaults beyond preserving the current balance-desc behavior
- Reworking the card view visual design beyond keeping it as the secondary option
