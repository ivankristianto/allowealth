# Migrate Native `<button>` to Custom `<Button>` Component — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate ~190 eligible native `<button>` elements to the custom `<Button>` component across ~120 files in a single PR.

**Architecture:** Extend `Button.astro` with `shape` prop (square/circle) and `xs` size, then systematically replace native buttons file-by-file using a consistent mapping from DaisyUI classes to `<Button>` props.

**Tech Stack:** Astro components, DaisyUI v5, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-15-migrate-buttons-design.md`

---

## Chunk 1: Component Extension & Migration Procedure

### Task 1: Extend Button.astro with `shape` prop and `xs` size

**Files:**
- Modify: `src/components/atoms/Button.astro`

- [ ] **Step 1: Add `shape` and `xs` to the Props interface**

In `src/components/atoms/Button.astro`, update the Props interface and frontmatter:

```typescript
// In the Props interface, add shape prop:
export interface Props extends ButtonAttributes, AnchorAttributes {
  variant?:
    | 'primary'
    | 'accent'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
    | 'warning'
    | 'success';
  shape?: 'default' | 'square' | 'circle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  // ... rest unchanged
}
```

Update the destructured props:

```typescript
const {
  variant = 'primary',
  shape = 'default',
  size = 'md',
  // ... rest unchanged
} = Astro.props;
```

Add shape classes map after `sizeClasses`:

```typescript
const shapeClasses: Record<string, string> = {
  default: '',
  square: 'btn-square',
  circle: 'btn-circle',
};
```

Add `xs` to size classes:

```typescript
const sizeClasses: Record<string, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
  xl: 'btn-xl text-lg',
};
```

Add shape to the combined classes array:

```typescript
const buttonClasses = [
  baseClasses,
  variantClasses[variant] || variantClasses.primary,
  sizeClasses[size] || sizeClasses.md,
  shapeClasses[shape] || '',
  isDisabled ? 'opacity-50 cursor-not-allowed focus:ring-0 focus:ring-offset-0' : 'cursor-pointer',
  className,
]
  .filter(Boolean)
  .join(' ');
```

Update the JSDoc comment at the top:

```typescript
/**
 * @param {string} shape - Button shape: default, square, circle (DaisyUI btn shapes)
 * @param {string} size - Button size: xs, sm, md, lg, xl (DaisyUI btn sizes)
 */
```

- [ ] **Step 2: Run typecheck to verify**

Run: `bun run typecheck`
Expected: 0 errors (existing `<Button>` usages are unchanged)

- [ ] **Step 3: Commit**

```bash
git add src/components/atoms/Button.astro
git commit -m "feat(ALL-52): extend Button component with shape prop and xs size"
```

---

### Migration Procedure (applies to all Tasks 2–8)

Every file migration follows this exact procedure. Subagents MUST read this section before starting any migration task.

#### Exclusion Criteria — DO NOT migrate these buttons:

1. **Modal backdrop buttons** — `<button>` inside `<form method="dialog">`
2. **Tab/toggle buttons** — `role="tab"` or `role="radio"` attributes
3. **Menu item buttons** — `role="menuitem"` attribute
4. **Listbox option buttons** — `role="option"` attribute
5. **Menu list items** — `<button>` inside `<li>` within a DaisyUI `menu` or `dropdown-content` `<ul>`
6. **The Button component itself** — `src/components/atoms/Button.astro` (skip, it IS the component)

#### Class-to-Prop Mapping Table:

| DaisyUI Class(es) | `<Button>` Props |
|---|---|
| `btn-accent` or `btn-primary` | `variant="primary"` |
| `btn-secondary` | `variant="secondary"` |
| `btn-outline` | `variant="outline"` |
| `btn-ghost` | `variant="ghost"` |
| `btn-error` | `variant="danger"` |
| `btn-warning` | `variant="warning"` |
| `btn-success` | `variant="success"` |
| `btn-xs` | `size="xs"` |
| `btn-sm` | `size="sm"` |
| `btn-md` | `size="md"` (default, omit) |
| `btn-lg` | `size="lg"` |
| `btn-xl` | `size="xl"` |
| `btn-square` | `shape="square"` |
| `btn-circle` | `shape="circle"` |

#### Classes to REMOVE (handled by `<Button>` internally):

- `btn` (base class)
- All variant classes: `btn-accent`, `btn-primary`, `btn-ghost`, `btn-outline`, `btn-error`, `btn-secondary`, `btn-warning`, `btn-success`
- All size classes: `btn-xs`, `btn-sm`, `btn-md`, `btn-lg`, `btn-xl`
- All shape classes: `btn-square`, `btn-circle`
- `rounded-2xl`, `rounded-xl` (component uses `rounded-2xl`)
- `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent` (component handles focus)
- `inline-flex items-center justify-center gap-2 font-medium transition-all duration-200` (component base)
- `cursor-pointer` (component handles)
- `shadow-accent-glow` (component handles for primary/accent)

#### Classes to KEEP as `className`:

- Layout: `w-full`, `flex-1`, `flex-[2]`
- Custom sizing: `h-14`, `min-h-[44px]`, `min-w-[44px]`
- Font: `font-bold`
- Spacing: `gap-2` (only when different from component default)
- Responsive: `rounded-lg sm:rounded-xl` (non-standard rounding)
- Active states: `active:scale-95`
- Custom colors/borders: `border border-base-300 bg-base-100`
- Opacity/pointer: `opacity-30 cursor-not-allowed pointer-events-none`
- **Compound variant overrides**: `btn-outline` when combined with a variant like `btn-error` (the `<Button>` component doesn't support compound variants, so keep `btn-outline` in `className` when used alongside `variant="danger"`)
- Any class NOT in the "remove" list above

#### Edge Cases:

- **Bare `btn` without variant class**: If a native button uses just `class="btn"` with no variant modifier, do NOT use the default `variant="primary"` (which adds accent styling + glow). Instead, assess the button's context: use `variant="ghost"` for subtle/secondary actions or `variant="secondary"` for neutral buttons.
- **Ghost variant border difference**: The `<Button variant="ghost">` adds `border border-base-300` that bare `btn-ghost` does not. This is intentional design system enforcement. If a specific ghost button must NOT have a border, add `className="border-0"` to override.

#### Per-file steps:

1. **Read the file** — understand all buttons and which are eligible
2. **Add import** — if not already present: `import Button from '@/components/atoms/Button.astro';` (use `@/` path alias)
3. **For each eligible `<button>`:**
   - Replace `<button` → `<Button` and `</button>` → `</Button>`
   - Map `class`/`class:list` DaisyUI classes to props using the table above
   - Move remaining classes to `className` prop
   - If `class:list` is used with dynamic classes, convert the static DaisyUI portion to props and keep dynamic portion in `className`
   - Keep ALL `data-*`, `aria-*`, `type`, `disabled`, `id`, `tabindex` attributes as-is (they pass through via `...rest`)
   - `type="button"` can be omitted (it's the default)
   - `type="submit"` MUST be kept explicitly
4. **Verify** — run `bun run typecheck` after each file batch

#### Before/After Examples:

**Example 1: Simple action button**
```astro
<!-- BEFORE -->
<button type="button" class="btn btn-ghost btn-sm btn-square rounded-xl" data-bulk-clear aria-label="Clear selection">
  <X size={18} class="stroke-current" aria-hidden="true" />
</button>

<!-- AFTER -->
<Button variant="ghost" size="sm" shape="square" data-bulk-clear aria-label="Clear selection">
  <X size={18} class="stroke-current" aria-hidden="true" />
</Button>
```

**Example 2: Submit button with custom sizing**
```astro
<!-- BEFORE -->
<button type="submit" class="btn btn-accent flex-[2] h-14 rounded-2xl font-bold">
  Save
</button>

<!-- AFTER -->
<Button type="submit" variant="primary" className="flex-[2] h-14 font-bold">
  Save
</Button>
```

**Example 3: Outline button with responsive classes**
```astro
<!-- BEFORE -->
<button type="button" class="btn btn-sm btn-outline gap-2 rounded-lg sm:rounded-xl" aria-haspopup="listbox">
  <FolderPen size={16} class="stroke-current" aria-hidden="true" />
  <span class="hidden sm:inline">Category</span>
</button>

<!-- AFTER -->
<Button variant="outline" size="sm" className="gap-2 rounded-lg sm:rounded-xl" aria-haspopup="listbox">
  <FolderPen size={16} class="stroke-current" aria-hidden="true" />
  <span class="hidden sm:inline">Category</span>
</Button>
```

**Example 4: Ghost button with focus override (classes removed)**
```astro
<!-- BEFORE -->
<button type="button" class="btn btn-ghost flex-1 h-14 rounded-2xl font-bold text-base-content hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent" data-confirm-cancel>
  Cancel
</button>

<!-- AFTER -->
<Button variant="ghost" className="flex-1 h-14 font-bold" data-confirm-cancel>
  Cancel
</Button>
```

**Example 5: Dynamic variant (ConfirmationModal pattern)**
```astro
<!-- BEFORE -->
<button type="button" class:list={['btn flex-1 h-14 rounded-2xl font-bold', confirmVariants[confirmVariant], 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent']} data-confirm-action>
  {confirmLabel}
</button>

<!-- AFTER — requires mapping confirmVariant to Button variant -->
<!-- Add this mapping in the frontmatter: -->
const buttonVariantMap: Record<string, 'danger' | 'warning' | 'success'> = {
  error: 'danger',
  warning: 'warning',
  success: 'success',
};

<Button variant={buttonVariantMap[confirmVariant]} className="flex-1 h-14 font-bold" data-confirm-action>
  {confirmLabel}
</Button>
```

**Example 6: Error outline combination**
```astro
<!-- BEFORE -->
<button type="button" class="btn btn-sm btn-error btn-outline gap-2 rounded-lg sm:rounded-xl" data-bulk-action="delete">
  <Trash2 size={16} class="stroke-current" aria-hidden="true" />
  <span class="hidden sm:inline">Delete</span>
</button>

<!-- AFTER — btn-error takes precedence, keep outline styling in className -->
<Button variant="danger" size="sm" className="btn-outline gap-2 rounded-lg sm:rounded-xl" data-bulk-action="delete">
  <Trash2 size={16} class="stroke-current" aria-hidden="true" />
  <span class="hidden sm:inline">Delete</span>
</Button>
```

---

## Chunk 2: Atoms, Layouts & Molecules — Auth/Security

### Task 2: Migrate atoms and layouts

**Files:**
- Modify: `src/components/atoms/EmptyState.astro`
- Modify: `src/components/atoms/ErrorMessage.astro`
- Modify: `src/components/atoms/PasswordField.astro`
- Modify: `src/components/atoms/ThemeToggle.astro`
- Modify: `src/components/layouts/Header.astro` (already imports Button)
- Modify: `src/components/layouts/Navigation.astro`
- Modify: `src/components/layouts/MobileCommandCenter.astro`
- Modify: `src/components/layouts/MobileNavigation.astro`
- Modify: `src/components/layouts/UserProfile.astro` (already imports Button)

**Exclusions in these files:**
- `CurrencySwitcher.astro` — all buttons are `role="radio"`, skip entire file
- `TabToggle.astro` — all buttons are `role="tab"`, skip entire file
- `Button.astro` — the component itself, skip
- `UserProfile.astro` — skip any `role="menuitem"` buttons

- [ ] **Step 1: Read all 9 files and identify eligible buttons**
- [ ] **Step 2: Add `import Button from '@/components/atoms/Button.astro'` where missing**
- [ ] **Step 3: Migrate each eligible button following the Migration Procedure**
- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/atoms/EmptyState.astro src/components/atoms/ErrorMessage.astro src/components/atoms/PasswordField.astro src/components/atoms/ThemeToggle.astro src/components/layouts/Header.astro src/components/layouts/Navigation.astro src/components/layouts/MobileCommandCenter.astro src/components/layouts/MobileNavigation.astro src/components/layouts/UserProfile.astro
git commit -m "feat(ALL-52): migrate buttons in atoms and layouts"
```

---

### Task 3: Migrate molecules — auth & security

**Files:**
- Modify: `src/components/molecules/LoginForm.astro` (already imports Button)
- Modify: `src/components/molecules/RegistrationForm.astro`
- Modify: `src/components/molecules/ForgotPasswordForm.astro`
- Modify: `src/components/molecules/PasswordChangeForm.astro` (already imports Button)
- Modify: `src/components/molecules/MfaEnableBanner.astro`
- Modify: `src/components/molecules/MfaVerifyForm.astro` (already imports Button)
- Modify: `src/components/molecules/AuthValidationMessages.astro`
- Modify: `src/components/molecules/SecurityMfaCard.astro` (already imports Button)
- Modify: `src/components/molecules/SecurityPasskeysCard.astro` (already imports Button)
- Modify: `src/components/molecules/SecuritySessionsCard.astro` (already imports Button)
- Modify: `src/components/molecules/SecurityConnectedAccountsCard.astro`
- Modify: `src/components/molecules/SecurityConnectedAppsCard.astro`
- Modify: `src/components/molecules/SecurityCard.astro`

- [ ] **Step 1: Read all 13 files and identify eligible buttons**
- [ ] **Step 2: Add Button import where missing**
- [ ] **Step 3: Migrate each eligible button following the Migration Procedure**
- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/LoginForm.astro src/components/molecules/RegistrationForm.astro src/components/molecules/ForgotPasswordForm.astro src/components/molecules/PasswordChangeForm.astro src/components/molecules/MfaEnableBanner.astro src/components/molecules/MfaVerifyForm.astro src/components/molecules/AuthValidationMessages.astro src/components/molecules/SecurityMfaCard.astro src/components/molecules/SecurityPasskeysCard.astro src/components/molecules/SecuritySessionsCard.astro src/components/molecules/SecurityConnectedAccountsCard.astro src/components/molecules/SecurityConnectedAppsCard.astro src/components/molecules/SecurityCard.astro
git commit -m "feat(ALL-52): migrate buttons in auth and security molecules"
```

---

## Chunk 3: Molecules — Actions, Navigation, Budget & Transactions

### Task 4: Migrate molecules — actions, navigation & budget

**Files:**
- Modify: `src/components/molecules/ActionExpandable.astro`
- Modify: `src/components/molecules/BudgetActions.astro`
- Modify: `src/components/molecules/BudgetAlertBanner.astro`
- Modify: `src/components/molecules/BudgetCopyActionButton.astro`
- Modify: `src/components/molecules/BudgetFilterControls.astro`
- Modify: `src/components/molecules/BudgetHeaderControls.astro`
- Modify: `src/components/molecules/ConfirmationModal.astro`
- Modify: `src/components/molecules/DashboardError.astro` (already imports Button)
- Modify: `src/components/molecules/PeriodNavigator.astro`
- Modify: `src/components/molecules/PeriodicSelector.astro`
- Modify: `src/components/molecules/QuickActions.astro`
- Modify: `src/components/molecules/ReportSelector.astro`
- Modify: `src/components/molecules/GreetingHeader.astro`
- Modify: `src/components/molecules/NotificationDropdown.astro`

**Exclusions in these files:**
- `PeriodNavigator.astro` — skip buttons inside `<li>` within `<ul>` dropdown menus; only migrate the prev/next nav buttons and the dropdown trigger button
- `ConfirmationModal.astro` — requires dynamic variant mapping (see Example 5 in Migration Procedure)
- `NotificationDropdown.astro` — skip dropdown toggle buttons

- [ ] **Step 1: Read all 14 files and identify eligible buttons**
- [ ] **Step 2: Add Button import where missing**
- [ ] **Step 3: Migrate each eligible button following the Migration Procedure**
- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/ActionExpandable.astro src/components/molecules/BudgetActions.astro src/components/molecules/BudgetAlertBanner.astro src/components/molecules/BudgetCopyActionButton.astro src/components/molecules/BudgetFilterControls.astro src/components/molecules/BudgetHeaderControls.astro src/components/molecules/ConfirmationModal.astro src/components/molecules/DashboardError.astro src/components/molecules/PeriodNavigator.astro src/components/molecules/PeriodicSelector.astro src/components/molecules/QuickActions.astro src/components/molecules/ReportSelector.astro src/components/molecules/GreetingHeader.astro src/components/molecules/NotificationDropdown.astro
git commit -m "feat(ALL-52): migrate buttons in action, navigation and budget molecules"
```

---

### Task 5: Migrate molecules — transactions & recurring

**Files:**
- Modify: `src/components/molecules/CSVImportForm.astro`
- Modify: `src/components/molecules/RecurringActionsBar.astro`
- Modify: `src/components/molecules/RecurringPendingCard.astro`
- Modify: `src/components/molecules/RecurringSectionActionBar.astro`
- Modify: `src/components/molecules/RecurringTemplateFilterBar.astro`
- Modify: `src/components/molecules/RecurringViewControls.astro`
- Modify: `src/components/molecules/TransactionActionsBar.astro`
- Modify: `src/components/molecules/TransactionEntryForm.astro` (already imports Button)
- Modify: `src/components/molecules/AccountItemRow.astro`
- Modify: `src/components/molecules/landing/FaqSection.astro`

**Exclusions in these files:**
- `AccountItemRow.astro` — skip `role="menuitem"` buttons and dropdown toggles
- `TransactionEntryForm.astro` — skip dropdown-related buttons
- `RecurringViewControls.astro` — these are view mode toggles; if they use `role="tab"`, skip them

- [ ] **Step 1: Read all 10 files and identify eligible buttons**
- [ ] **Step 2: Add Button import where missing**
- [ ] **Step 3: Migrate each eligible button following the Migration Procedure**
- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/CSVImportForm.astro src/components/molecules/RecurringActionsBar.astro src/components/molecules/RecurringPendingCard.astro src/components/molecules/RecurringSectionActionBar.astro src/components/molecules/RecurringTemplateFilterBar.astro src/components/molecules/RecurringViewControls.astro src/components/molecules/TransactionActionsBar.astro src/components/molecules/TransactionEntryForm.astro src/components/molecules/AccountItemRow.astro src/components/molecules/landing/FaqSection.astro
git commit -m "feat(ALL-52): migrate buttons in transaction and recurring molecules"
```

---

## Chunk 4: Organisms

### Task 6: Migrate organisms — high-priority files

These are the files with the highest button counts from the ticket.

**Files:**
- Modify: `src/components/organisms/RecurringTemplateList.astro`
- Modify: `src/components/organisms/RecurringTemplateForm.astro`
- Modify: `src/components/organisms/BulkActionBar.astro`
- Modify: `src/components/organisms/TransactionFiltersBar.astro`
- Modify: `src/components/organisms/BudgetImportModal.astro`
- Modify: `src/components/organisms/MemberList.astro`
- Modify: `src/components/organisms/MfaSetupModal.astro`
- Modify: `src/components/organisms/AccountActions.astro`
- Modify: `src/components/organisms/BudgetCard.astro`
- Modify: `src/components/organisms/DangerZone.astro`
- Modify: `src/components/organisms/ManageAccountForms.astro`
- Modify: `src/components/organisms/InviteMemberModal.astro`
- Modify: `src/components/organisms/PaymentMethodFormModal.astro`
- Modify: `src/components/organisms/RecurringConfirmModal.astro`

**Exclusions in these files:**
- `BulkActionBar.astro` — skip `role="option"` buttons inside listbox dropdowns
- `RecurringTemplateList.astro` — skip `role="menuitem"` buttons
- `MemberList.astro` — skip dropdown-related buttons

- [ ] **Step 1: Read all 14 files and identify eligible buttons**
- [ ] **Step 2: Add Button import where missing**
- [ ] **Step 3: Migrate each eligible button following the Migration Procedure**
- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/RecurringTemplateList.astro src/components/organisms/RecurringTemplateForm.astro src/components/organisms/BulkActionBar.astro src/components/organisms/TransactionFiltersBar.astro src/components/organisms/BudgetImportModal.astro src/components/organisms/MemberList.astro src/components/organisms/MfaSetupModal.astro src/components/organisms/AccountActions.astro src/components/organisms/BudgetCard.astro src/components/organisms/DangerZone.astro src/components/organisms/ManageAccountForms.astro src/components/organisms/InviteMemberModal.astro src/components/organisms/PaymentMethodFormModal.astro src/components/organisms/RecurringConfirmModal.astro
git commit -m "feat(ALL-52): migrate buttons in high-priority organisms"
```

---

### Task 7: Sweep remaining organisms and partials

This task catches any organism or partial files not covered by Task 6.

**Discovery step:** Run this grep to find all remaining files with eligible buttons:

```bash
grep -rl '<button' src/components/organisms/ src/components/partials/ --include='*.astro' | sort
```

Then for each file found, check if it was already handled in Task 6. If not, read it, apply exclusion criteria, and migrate eligible buttons.

**Known additional files (non-exhaustive):**
- `src/components/organisms/StepAllocate.astro`
- `src/components/organisms/StepBasics.astro`
- `src/components/organisms/StepReview.astro`
- `src/components/organisms/TransactionTable.astro`
- `src/components/organisms/TransactionRow.astro`
- `src/components/organisms/AccountAllocationTable.astro`
- `src/components/organisms/CategoryBudgetCard.astro`
- `src/components/organisms/CategoryBudgetTable.astro`
- `src/components/organisms/GrowthProjectionCard.astro`
- `src/components/organisms/ReconciliationPanel.astro`
- `src/components/partials/CategoryDrillDownPartial.astro`
- Any other files found by the grep

- [ ] **Step 1: Run grep to discover all files with native buttons in organisms/ and partials/**
- [ ] **Step 2: Filter out files already handled in Task 6**
- [ ] **Step 3: Read each remaining file and identify eligible buttons**
- [ ] **Step 4: Add Button import where missing**
- [ ] **Step 5: Migrate each eligible button following the Migration Procedure**
- [ ] **Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 7: Commit**

Stage only the files you modified (from the list discovered in Step 2), NOT the entire directory:

```bash
git add <list of files modified in this task>
git commit -m "feat(ALL-52): migrate buttons in remaining organisms and partials"
```

---

## Chunk 5: Pages & Quality Gates

### Task 8: Migrate pages

**Discovery step:** Run this grep to find all page files with eligible buttons:

```bash
grep -rl '<button' src/pages/ --include='*.astro' | sort
```

**Known high-priority pages:**
- `src/pages/settings/index.astro`
- `src/pages/budget/categories/index.astro`
- `src/pages/recurring/index.astro`
- `src/pages/accounts/[id].astro`
- `src/pages/accounts/index.astro`
- `src/pages/admin/users/[id].astro`
- `src/pages/budget/history.astro`
- `src/pages/signup.astro`
- `src/pages/reset-password.astro`
- `src/pages/oauth/authorize.astro`
- Any other files found by the grep

- [ ] **Step 1: Run grep to discover all page files with native buttons**
- [ ] **Step 2: Read each file and identify eligible buttons**
- [ ] **Step 3: Add Button import where missing**
- [ ] **Step 4: Migrate each eligible button following the Migration Procedure**
- [ ] **Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/
git commit -m "feat(ALL-52): migrate buttons in pages"
```

---

### Task 9: Quality gates and final verification

This task runs AFTER all other tasks are complete. It verifies the entire migration.

- [ ] **Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

All must pass with 0 errors.

- [ ] **Step 2: Run build**

```bash
bun run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Audit remaining native buttons**

Run this to see what's left:

```bash
grep -r '<button' src/ --include='*.astro' -l | sort
```

Verify all remaining native `<button>` elements fall into excluded categories:
- `Button.astro` (the component itself)
- `<form method="dialog">` modal backdrop buttons
- `role="tab"`, `role="radio"`, `role="menuitem"`, `role="option"` buttons
- Buttons inside `<li>` in DaisyUI menus
- `TabToggle.astro`, `CurrencySwitcher.astro`, `TabSwitcher.astro`, `YearToggle.astro`

- [ ] **Step 4: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore(ALL-52): formatting fixes from quality gates"
```

(Skip if no changes from quality gates.)

---

## Task Dependencies

```
Task 1 (Button extension) ──blocks──▶ Tasks 2, 3, 4, 5, 6, 7, 8
Tasks 2–8 (all migration) ──blocks──▶ Task 9 (quality gates)
Tasks 2–8 can run in parallel (no shared files)
```

## Parallelization Guide

After Task 1 completes, Tasks 2–8 are fully independent (each modifies different files) and can be dispatched as parallel subagents. Task 9 runs sequentially after all migration tasks complete.
