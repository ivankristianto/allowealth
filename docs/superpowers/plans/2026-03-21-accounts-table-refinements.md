# Accounts Table Refinements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make table view the default accounts experience, restyle table group headers to follow the design system, and restore quick inline history for table users.

**Architecture:** Keep both card and table views server-rendered, but swap the default render state to table. Refine `AccountTable.astro` and `AccountTableRow.astro` to use semantic token-driven group styling and to render inline history containers for desktop rows and mobile table cards. Extend the existing inline-history/search client scripts so they can target the correct companion container while both views exist in the DOM.

**Tech Stack:** Astro 5.x, Tailwind v4 + DaisyUI v5, vanilla TypeScript client scripts, bun:test, happy-dom

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/molecules/AccountFilterControls.astro` | Modify | Change default toggle state to table |
| `src/pages/accounts/index.astro` | Modify | Render table visible by default and card hidden initially |
| `src/components/organisms/AccountTable.astro` | Modify | Replace hardcoded group colors with semantic ledger-band styling; add mobile inline history containers |
| `src/components/molecules/AccountTableRow.astro` | Modify | Add visible History button and expandable inline history row for desktop table |
| `src/components/molecules/AccountInlineHistory.client.ts` | Modify | Support explicit inline history toggles and container ids across card/table DOM |
| `src/components/organisms/AccountSearch.client.ts` | Modify | Hide/show companion history containers for both card and table rows |
| `src/__tests__/account-table.test.ts` | Modify | Assert semantic styling and mobile/desktop history affordances |
| `src/__tests__/account-table-row.test.ts` | Modify | Assert history toggle and companion detail row wiring |
| `src/__tests__/accounts-table-view.test.ts` | Modify | Assert table default render path and control defaults |
| `src/components/organisms/AccountSearch.client.test.ts` | Modify | Verify search hides matching table history containers correctly |
| `src/components/molecules/AccountInlineHistory.client.test.ts` | Create | Verify inline history toggles open, close, and switch containers correctly |

---

### Task 1: Lock the new default-view contract in tests

**Files:**
- Modify: `src/__tests__/accounts-table-view.test.ts`
- Modify: `src/components/organisms/accounts-table.client.test.ts`
- Modify: `src/components/molecules/AccountFilterControls.astro`
- Modify: `src/pages/accounts/index.astro`

- [ ] **Step 1: Write failing assertions for table-first rendering**

Add assertions that:
- `AccountFilterControls.astro` defaults `defaultView` to `'table'`
- `src/pages/accounts/index.astro` renders card view with `class="hidden"`
- `src/pages/accounts/index.astro` renders table view without the initial `hidden` class

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `bun test ./src/__tests__/accounts-table-view.test.ts ./src/components/organisms/accounts-table.client.test.ts`

Expected: FAIL because the component/page still default to card-first behavior.

- [ ] **Step 3: Implement the minimal default-view change**

Update `AccountFilterControls.astro` and `src/pages/accounts/index.astro` so table is the initial server-rendered view while existing localStorage preference support stays unchanged.

- [ ] **Step 4: Re-run the focused tests and confirm pass**

Run: `bun test ./src/__tests__/accounts-table-view.test.ts ./src/components/organisms/accounts-table.client.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/AccountFilterControls.astro src/pages/accounts/index.astro src/__tests__/accounts-table-view.test.ts src/components/organisms/accounts-table.client.test.ts
git commit -m "fix(accounts): default accounts to table view"
```

### Task 2: Move table group styling onto design-system tokens

**Files:**
- Modify: `src/components/organisms/AccountTable.astro`
- Modify: `src/__tests__/account-table.test.ts`

- [ ] **Step 1: Write failing tests for semantic header styling**

Add assertions that `AccountTable.astro`:
- no longer contains hardcoded hex gradient classes
- uses semantic classes like `text-accent`, `text-warning`, `text-info`
- uses a neutral band surface such as `bg-base-200/70` or equivalent token-based classes

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `bun test ./src/__tests__/account-table.test.ts`

Expected: FAIL because the component still uses hardcoded hex gradients.

- [ ] **Step 3: Implement the ledger-band styling**

Refactor the group color map in `AccountTable.astro` so it describes semantic token classes rather than custom hex colors. Keep the group headers visually distinct but theme-aware.

- [ ] **Step 4: Re-run the focused test and confirm pass**

Run: `bun test ./src/__tests__/account-table.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/AccountTable.astro src/__tests__/account-table.test.ts
git commit -m "fix(accounts): align table group headers with design system"
```

### Task 3: Restore quick inline history in table view

**Files:**
- Modify: `src/components/molecules/AccountTableRow.astro`
- Modify: `src/components/organisms/AccountTable.astro`
- Modify: `src/components/molecules/AccountInlineHistory.client.ts`
- Create: `src/components/molecules/AccountInlineHistory.client.test.ts`
- Modify: `src/__tests__/account-table-row.test.ts`

- [ ] **Step 1: Write failing tests for table inline history wiring**

Add static assertions for:
- visible `data-inline-history-toggle` button wiring in `AccountTableRow.astro`
- companion inline history container row with `data-history-container`

Create `src/components/molecules/AccountInlineHistory.client.test.ts` with DOM tests that:
- clicking a table history button expands the addressed container and loads fetched HTML
- clicking the same button again collapses it
- clicking a second history button closes the first container and opens the second

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `bun test ./src/__tests__/account-table-row.test.ts ./src/components/molecules/AccountInlineHistory.client.test.ts`

Expected: FAIL because the table row has no inline toggle/container and the client script does not support targeted table history expansion.

- [ ] **Step 3: Implement the minimal inline history path**

Add a visible `History` button plus a hidden companion history row/container in table view, then extend `AccountInlineHistory.client.ts` so it can drive both card rows and explicit table/mobile history toggles.

- [ ] **Step 4: Re-run the focused tests and confirm pass**

Run: `bun test ./src/__tests__/account-table-row.test.ts ./src/components/molecules/AccountInlineHistory.client.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/AccountTableRow.astro src/components/organisms/AccountTable.astro src/components/molecules/AccountInlineHistory.client.ts src/components/molecules/AccountInlineHistory.client.test.ts src/__tests__/account-table-row.test.ts
git commit -m "feat(accounts): add inline history to table view"
```

### Task 4: Keep search and responsive behavior correct with inline history

**Files:**
- Modify: `src/components/organisms/AccountSearch.client.ts`
- Modify: `src/components/organisms/AccountSearch.client.test.ts`
- Modify: `src/__tests__/account-table.test.ts`

- [ ] **Step 1: Write failing tests for history-container search handling**

Update search tests to assert that filtering a table row also hides its companion history container.

If needed, add/adjust static `AccountTable.astro` assertions for mobile history affordances so desktop and mobile table markup stay aligned.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `bun test ./src/components/organisms/AccountSearch.client.test.ts ./src/__tests__/account-table.test.ts`

Expected: FAIL because search currently only tracks card history containers.

- [ ] **Step 3: Implement the minimal search fix**

Update `AccountSearch.client.ts` to resolve account ids from either `data-account-row` or `data-account-table-row` and hide/show matching `data-history-container` nodes in the active view.

- [ ] **Step 4: Re-run the focused tests and confirm pass**

Run: `bun test ./src/components/organisms/AccountSearch.client.test.ts ./src/__tests__/account-table.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/AccountSearch.client.ts src/components/organisms/AccountSearch.client.test.ts src/__tests__/account-table.test.ts
git commit -m "fix(accounts): keep table history aligned with search"
```

### Task 5: Full verification

**Files:**
- Modify only if verification uncovers issues

- [ ] **Step 1: Run the targeted feature tests**

Run:

```bash
bun test ./src/__tests__/account-table-row.test.ts ./src/__tests__/account-table.test.ts ./src/__tests__/accounts-table-view.test.ts ./src/components/organisms/AccountSearch.client.test.ts ./src/components/organisms/accounts-table.client.test.ts ./src/components/molecules/AccountInlineHistory.client.test.ts
```

Expected: PASS

- [ ] **Step 2: Run required quality gates**

Run:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: PASS

- [ ] **Step 3: Run a production build**

Run: `bun run build`

Expected: PASS

- [ ] **Step 4: Manual browser verification**

Check on the accounts page:
- table is the first view on page load
- card toggle still works and persists
- each table group header uses semantic token styling in both themes
- desktop table History button expands inline content beneath the row
- mobile table cards expose a working History toggle
- search hides non-matching rows and their open history containers

- [ ] **Step 5: Commit any verification fixes**

```bash
git add <relevant files>
git commit -m "fix(accounts): polish table refinement behavior"
```
