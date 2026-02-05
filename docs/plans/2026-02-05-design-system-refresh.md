# Design System Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh all design-system documentation to match the atomic refactor, current tokens, and component usage.

**Architecture:** Keep the existing `design-system/` file structure and update sections in place with accurate examples. Add a full component inventory, replace stale patterns (custom Icon, raw Chart.js, `animate-pulse`), and align token usage with `@/lib/tokens` and `src/styles/tokens.css`.

**Tech Stack:** Astro 5, DaisyUI v5, Tailwind v4, Lucide icons, Motion, design tokens in `@/lib/tokens`.

### Task 1: Update `START.md` core rules and examples

**Files:**

- Modify: `design-system/START.md`
- Test: `design-system/START.md`

**Step 1: Write the failing test**

```bash
rg "tokenClasses" design-system/START.md
```

**Step 2: Run test to verify it fails**

Run: `rg "tokenClasses" design-system/START.md`
Expected: No matches (exit code 1).

**Step 3: Write minimal implementation**

Update `design-system/START.md` with these replacements:

Replace the header line with:

```markdown
**Version:** 1.1.0 | **Framework:** Astro 5.x + Tailwind v4 + DaisyUI v5
```

Replace the Core Rules list with:

```markdown
1. **Use design tokens** - Import from `@/lib/tokens` (never hardcode)
2. **Use token classes** - Use `tokenClasses` for spacing/typography utilities
3. **DaisyUI first** - Use DaisyUI classes, then Tailwind. Use `design-system/daisyui-llm.md`
4. **Accessibility required** - Keyboard nav + ARIA + contrast
5. **Mobile-first** - Base styles for mobile, enhance for desktop
6. **Server-side** - Astro components are SSR by default
7. **Modern HTML** - Use semantic elements (`<button>`, `<nav>`, `<main>`, `<section>`, `<article>`)
8. **Icons** - Use `@lucide/astro` for all icons
9. **Loading** - Use `Skeleton` or `Spinner` (no raw `animate-pulse`)
10. **Animations** - Use `motion` for complex transitions
11. **Charts** - Use `@/lib/chart-setup` + `createChartLifecycle`
```

Add this section after Core Rules:

```markdown
### Component Inventory

See the full component inventory in `design-system/02-components.md` (atoms, molecules, organisms).
```

Replace the token import block with:

```typescript
import { colors, fontSizes, spacing, tokenClasses } from '@/lib/tokens';
```

Add a Chart Setup snippet after animations import:

```typescript
import { Chart } from '@/lib/chart-setup';
import { createChartLifecycle } from '@/lib/utils/chart-lifecycle';
```

Add Token Classes under Token Quick Reference:

```typescript
tokenClasses.badgePadding;
tokenClasses.textXs;
tokenClasses.marginTopLg;
```

Replace the Form Field example with:

```astro
<FormField label="Name" htmlFor="name" required>
  <Input id="name" name="name" error={!!errors.name} errorMessage={errors.name} />
</FormField>
```

Replace the Loading State example with:

```astro
import Skeleton from '@/components/atoms/Skeleton.astro';

<Skeleton variant="rectangular" width="33%" height="16px" />
```

Add a Status Helpers snippet under Token Quick Reference:

```typescript
import {
  getBudgetStatusClass,
  getProgressBarStatusColors,
  getStatusBadgeClasses,
  toBudgetStatusClassName,
} from '@/lib/tokens';
```

**Step 4: Run test to verify it passes**

Run: `rg "tokenClasses" design-system/START.md`
Expected: Match found (exit code 0).

**Step 5: Commit**

```bash
git add design-system/START.md

git commit -m "docs: refresh design system start guide"
```

### Task 2: Update `01-foundations.md` for tokens and status mapping

**Files:**

- Modify: `design-system/01-foundations.md`
- Test: `design-system/01-foundations.md`

**Step 1: Write the failing test**

```bash
rg "tokenClasses" design-system/01-foundations.md
```

**Step 2: Run test to verify it fails**

Run: `rg "tokenClasses" design-system/01-foundations.md`
Expected: No matches (exit code 1).

**Step 3: Write minimal implementation**

Add a **Token Classes** section under Spacing:

````markdown
## Token Classes

```typescript
import { tokenClasses } from '@/lib/tokens';

const classes = `${tokenClasses.badgePadding} ${tokenClasses.textXs}`;
```
````

````

Add a **Budget Status Mapping** section:

```markdown
## Budget Status Mapping

```typescript
import { type BudgetStatus } from '@/lib/utils/budget';
import { toBudgetStatusClassName } from '@/lib/tokens';

const status: BudgetStatus = 'exceeded';
const className = toBudgetStatusClassName(status); // status-danger
````

````

Update Spacing to include `spacing.cardLg`.

Update Typography sizes to include `fontSizes['4xl']`, `fontSizes['5xl']`, `fontSizes['6xl']`.

**Step 4: Run test to verify it passes**

Run: `rg "tokenClasses" design-system/01-foundations.md`
Expected: Match found (exit code 0).

**Step 5: Commit**

```bash
git add design-system/01-foundations.md

git commit -m "docs: update foundations tokens"
````

### Task 3: Add full component inventory and key component examples

**Files:**

- Modify: `design-system/02-components.md`
- Test: `design-system/02-components.md`

**Step 1: Write the failing test**

```bash
rg "Component Inventory" design-system/02-components.md
```

**Step 2: Run test to verify it fails**

Run: `rg "Component Inventory" design-system/02-components.md`
Expected: No matches (exit code 1).

**Step 3: Write minimal implementation**

Insert after the opening paragraph:

```markdown
## Component Inventory

### Atoms

| Component      | Path                                        | Purpose                     |
| -------------- | ------------------------------------------- | --------------------------- |
| AssetSelect    | `src/components/atoms/AssetSelect.astro`    | Asset dropdown select       |
| Badge          | `src/components/atoms/Badge.astro`          | Status and label badges     |
| Button         | `src/components/atoms/Button.astro`         | Primary buttons             |
| Card           | `src/components/atoms/Card.astro`           | Surface container           |
| CategoryIcon   | `src/components/atoms/CategoryIcon.astro`   | Category icon + color       |
| CategorySelect | `src/components/atoms/CategorySelect.astro` | Category dropdown select    |
| Checkbox       | `src/components/atoms/Checkbox.astro`       | Checkbox control            |
| Currency       | `src/components/atoms/Currency.astro`       | Currency formatting display |
| CurrencyInput  | `src/components/atoms/CurrencyInput.astro`  | Currency input control      |
| DatePicker     | `src/components/atoms/DatePicker.astro`     | Date picker input           |
| EmptyState     | `src/components/atoms/EmptyState.astro`     | Empty state messaging       |
| ErrorMessage   | `src/components/atoms/ErrorMessage.astro`   | Inline or block errors      |
| IconBadge      | `src/components/atoms/IconBadge.astro`      | Badge with icon             |
| Input          | `src/components/atoms/Input.astro`          | Text input                  |
| Label          | `src/components/atoms/Label.astro`          | Form label                  |
| PasswordField  | `src/components/atoms/PasswordField.astro`  | Password input with toggle  |
| Percentage     | `src/components/atoms/Percentage.astro`     | Percentage display          |
| ProgressBar    | `src/components/atoms/ProgressBar.astro`    | Progress bar display        |
| Skeleton       | `src/components/atoms/Skeleton.astro`       | Loading placeholder         |
| Spinner        | `src/components/atoms/Spinner.astro`        | Loading spinner             |
| StatCard       | `src/components/atoms/StatCard.astro`       | Metric card                 |
| StatLabel      | `src/components/atoms/StatLabel.astro`      | Uppercase stat labels       |
| TabToggle      | `src/components/atoms/TabToggle.astro`      | Tab toggle                  |
| ThemeToggle    | `src/components/atoms/ThemeToggle.astro`    | Theme switcher              |

### Molecules

| Component                     | Path                                                           | Purpose                  |
| ----------------------------- | -------------------------------------------------------------- | ------------------------ |
| AllocationBar                 | `src/components/molecules/AllocationBar.astro`                 | Allocation bar chart     |
| AssetForm                     | `src/components/molecules/AssetForm.astro`                     | Asset form fields        |
| AssetItemRow                  | `src/components/molecules/AssetItemRow.astro`                  | Asset row display        |
| AssetPageHeader               | `src/components/molecules/AssetPageHeader.astro`               | Asset page header        |
| AuthValidationMessages        | `src/components/molecules/AuthValidationMessages.astro`        | Auth error summary       |
| BudgetActions                 | `src/components/molecules/BudgetActions.astro`                 | Budget action buttons    |
| BudgetAlertBanner             | `src/components/molecules/BudgetAlertBanner.astro`             | Budget alert banner      |
| BudgetHealthWidget            | `src/components/molecules/BudgetHealthWidget.astro`            | Budget health card       |
| CalculatorResultCard          | `src/components/molecules/CalculatorResultCard.astro`          | Calculator result card   |
| CashFlowItem                  | `src/components/molecules/CashFlowItem.astro`                  | Cash flow row            |
| ConfirmationModal             | `src/components/molecules/ConfirmationModal.astro`             | Confirmation dialog      |
| CSVImportForm                 | `src/components/molecules/CSVImportForm.astro`                 | CSV import form          |
| CurrencySelector              | `src/components/molecules/CurrencySelector.astro`              | Currency selector        |
| DashboardError                | `src/components/molecules/DashboardError.astro`                | Dashboard error block    |
| ForgotPasswordForm            | `src/components/molecules/ForgotPasswordForm.astro`            | Password reset form      |
| FormField                     | `src/components/molecules/FormField.astro`                     | Label + input wrapper    |
| GrowthScheduleTable           | `src/components/molecules/GrowthScheduleTable.astro`           | Forecast schedule table  |
| LoginForm                     | `src/components/molecules/LoginForm.astro`                     | Login form               |
| Modal                         | `src/components/molecules/Modal.astro`                         | Base modal               |
| NotificationDropdown          | `src/components/molecules/NotificationDropdown.astro`          | Notification menu        |
| NotificationItem              | `src/components/molecules/NotificationItem.astro`              | Notification row         |
| PasswordChangeForm            | `src/components/molecules/PasswordChangeForm.astro`            | Change password form     |
| PeriodNavigator               | `src/components/molecules/PeriodNavigator.astro`               | Period navigation        |
| QuickActions                  | `src/components/molecules/QuickActions.astro`                  | Quick actions panel      |
| RecentTransactionsList        | `src/components/molecules/RecentTransactionsList.astro`        | Recent transactions list |
| RegistrationForm              | `src/components/molecules/RegistrationForm.astro`              | Signup form              |
| ReportSelector                | `src/components/molecules/ReportSelector.astro`                | Report period selector   |
| SecurityConnectedAccountsCard | `src/components/molecules/SecurityConnectedAccountsCard.astro` | Connected accounts card  |
| SecurityMfaCard               | `src/components/molecules/SecurityMfaCard.astro`               | MFA card                 |
| SecurityPasskeysCard          | `src/components/molecules/SecurityPasskeysCard.astro`          | Passkeys card            |
| TabSwitcher                   | `src/components/molecules/TabSwitcher.astro`                   | Tab switcher             |
| Toast                         | `src/components/molecules/Toast.astro`                         | Toast notification       |
| ToastContainer                | `src/components/molecules/ToastContainer.astro`                | Toast container          |
| TransactionActionsBar         | `src/components/molecules/TransactionActionsBar.astro`         | Transaction action bar   |
| TransactionCard               | `src/components/molecules/TransactionCard.astro`               | Transaction display      |
| TransactionEntryForm          | `src/components/molecules/TransactionEntryForm.astro`          | Transaction form         |
| TransactionFilters            | `src/components/molecules/TransactionFilters.astro`            | Filter controls          |
| YearToggle                    | `src/components/molecules/YearToggle.astro`                    | Year toggle              |

### Organisms

| Component                 | Path                                                       | Purpose                   |
| ------------------------- | ---------------------------------------------------------- | ------------------------- |
| AssetActions              | `src/components/organisms/AssetActions.astro`              | Asset page actions        |
| AssetCategoryDeleteDialog | `src/components/organisms/AssetCategoryDeleteDialog.astro` | Delete dialog             |
| AssetCategoryModal        | `src/components/organisms/AssetCategoryModal.astro`        | Asset category modal      |
| AssetDeleteConfirmModal   | `src/components/organisms/AssetDeleteConfirmModal.astro`   | Asset delete modal        |
| AssetFormModal            | `src/components/organisms/AssetFormModal.astro`            | Asset form modal          |
| AssetGroupCard            | `src/components/organisms/AssetGroupCard.astro`            | Asset group card          |
| AssetHistoryModal         | `src/components/organisms/AssetHistoryModal.astro`         | Asset history modal       |
| AssetPortfolioSummary     | `src/components/organisms/AssetPortfolioSummary.astro`     | Portfolio summary         |
| AssetUpdateTodoList       | `src/components/organisms/AssetUpdateTodoList.astro`       | Asset update list         |
| AssetUpdateValueModal     | `src/components/organisms/AssetUpdateValueModal.astro`     | Update value modal        |
| BudgetAdviceBanner        | `src/components/organisms/BudgetAdviceBanner.astro`        | Budget advice             |
| BudgetCard                | `src/components/organisms/BudgetCard.astro`                | Budget summary card       |
| BudgetCardGrid            | `src/components/organisms/BudgetCardGrid.astro`            | Budget grid               |
| BudgetHistoryComparison   | `src/components/organisms/BudgetHistoryComparison.astro`   | Budget comparison         |
| BudgetPageHeader          | `src/components/organisms/BudgetPageHeader.astro`          | Budget page header        |
| BudgetSummary             | `src/components/organisms/BudgetSummary.astro`             | Budget summary panel      |
| CashFlowWidget            | `src/components/organisms/CashFlowWidget.astro`            | Cash flow widget          |
| CategoryDeleteDialog      | `src/components/organisms/CategoryDeleteDialog.astro`      | Category delete modal     |
| CategoryDrillDownModal    | `src/components/organisms/CategoryDrillDownModal.astro`    | Category drilldown modal  |
| CategoryIntelligenceTable | `src/components/organisms/CategoryIntelligenceTable.astro` | Category table            |
| CategoryModal             | `src/components/organisms/CategoryModal.astro`             | Category modal            |
| CopyBudgetModal           | `src/components/organisms/CopyBudgetModal.astro`           | Copy budget modal         |
| FinancialVelocityChart    | `src/components/organisms/FinancialVelocityChart.astro`    | Velocity chart            |
| InviteMemberModal         | `src/components/organisms/InviteMemberModal.astro`         | Invite modal              |
| LedgerProjections         | `src/components/organisms/LedgerProjections.astro`         | Projections panel         |
| ManageAccountForms        | `src/components/organisms/ManageAccountForms.astro`        | Account forms             |
| MemberList                | `src/components/organisms/MemberList.astro`                | Member list               |
| NetWorthWidget            | `src/components/organisms/NetWorthWidget.astro`            | Net worth widget          |
| PaymentMethodConfirmModal | `src/components/organisms/PaymentMethodConfirmModal.astro` | Payment confirm modal     |
| PaymentMethodFormModal    | `src/components/organisms/PaymentMethodFormModal.astro`    | Payment form modal        |
| ResourceAllocationChart   | `src/components/organisms/ResourceAllocationChart.astro`   | Allocation chart          |
| SetNewBudgetModal         | `src/components/organisms/SetNewBudgetModal.astro`         | New budget modal          |
| SpendingCard              | `src/components/organisms/SpendingCard.astro`              | Spending card             |
| SpendingChart             | `src/components/organisms/SpendingChart.astro`             | Spending chart            |
| SummaryCards              | `src/components/organisms/SummaryCards.astro`              | Dashboard summary cards   |
| TransactionFiltersBar     | `src/components/organisms/TransactionFiltersBar.astro`     | Filters bar               |
| TransactionList           | `src/components/organisms/TransactionList.astro`           | Transactions list         |
| TransactionModal          | `src/components/organisms/TransactionModal.astro`          | Transaction modal         |
| TransactionSummaryCards   | `src/components/organisms/TransactionSummaryCards.astro`   | Transaction summary cards |
| WealthTrajectory          | `src/components/organisms/WealthTrajectory.astro`          | Wealth trajectory chart   |
```

Add a **Skeleton** example section:

````markdown
### Skeleton (`src/components/atoms/Skeleton.astro`)

```astro
<Skeleton variant="rectangular" width="100%" height="16px" />
<Skeleton variant="circular" width="32px" height="32px" />
```
````

````

Add a **StatCard** example section:

```markdown
### StatCard (`src/components/atoms/StatCard.astro`)

```astro
<StatCard title="TOTAL INCOME" value="Rp 9.750.000" subtitle="PERIOD TOTAL">
  <div slot="icon">
    <TrendingUp size={24} class="stroke-current" aria-hidden="true" />
  </div>
</StatCard>
````

````

Add a **ConfirmationModal** example section:

```markdown
### ConfirmationModal (`src/components/molecules/ConfirmationModal.astro`)

```astro
<ConfirmationModal
  id="confirm-delete"
  title="Delete category"
  description="This action cannot be undone."
  confirmLabel="Delete"
  confirmVariant="error"
  confirmTestId="confirm-delete-btn"
/>
````

````

**Step 4: Run test to verify it passes**

Run: `rg "Component Inventory" design-system/02-components.md`
Expected: Match found (exit code 0).

**Step 5: Commit**

```bash
git add design-system/02-components.md

git commit -m "docs: add component inventory"
````

### Task 4: Refresh Forms, Accessibility, and Responsive docs

**Files:**

- Modify: `design-system/03-forms.md`
- Modify: `design-system/04-accessibility.md`
- Modify: `design-system/05-responsive.md`
- Test: `design-system/03-forms.md`

**Step 1: Write the failing test**

```bash
rg "FormField" design-system/03-forms.md
```

**Step 2: Run test to verify it fails**

Run: `rg "FormField" design-system/03-forms.md`
Expected: No matches (exit code 1).

**Step 3: Write minimal implementation**

Update Form Structure example in `design-system/03-forms.md` to use:

```astro
<FormField label="Name" htmlFor="name" required>
  <Input id="name" name="name" error={!!errors.name} errorMessage={errors.name} required />
</FormField>
```

Update Error Display section to:

```astro
<FormField label="Email" htmlFor="email" error={!!errors.email} errorMessage={errors.email}>
  <Input id="email" name="email" type="email" error={!!errors.email} />
</FormField>
```

Add a **Disabled Controls** section to `design-system/04-accessibility.md`:

````markdown
## Disabled Controls

Always use the native `disabled` attribute on buttons and inputs. `aria-disabled` alone is not sufficient.

```astro
<button type="button" disabled={isDisabled} aria-disabled={isDisabled}>Next</button>
```
````

````

Update `design-system/05-responsive.md` to note MainLayout padding:

```markdown
`MainLayout` applies base padding and vertical offsets: `px-4 lg:px-6 pt-24 sm:pt-28 pb-24 lg:pb-6`.
Do not add extra mobile horizontal padding on top of this.
````

**Step 4: Run test to verify it passes**

Run: `rg "FormField" design-system/03-forms.md`
Expected: Match found (exit code 0).

**Step 5: Commit**

```bash
git add design-system/03-forms.md design-system/04-accessibility.md design-system/05-responsive.md

git commit -m "docs: refresh forms and accessibility"
```

### Task 5: Refresh data visualization, patterns, and animations

**Files:**

- Modify: `design-system/06-data-visualization.md`
- Modify: `design-system/07-patterns.md`
- Modify: `design-system/08-animations.md`
- Test: `design-system/06-data-visualization.md`

**Step 1: Write the failing test**

```bash
rg "chart-setup" design-system/06-data-visualization.md
```

**Step 2: Run test to verify it fails**

Run: `rg "chart-setup" design-system/06-data-visualization.md`
Expected: No matches (exit code 1).

**Step 3: Write minimal implementation**

Update Charts section in `design-system/06-data-visualization.md` to:

````markdown
Use `@/lib/chart-setup` and `createChartLifecycle` for initialization.

```astro
<div data-chart-data={JSON.stringify(data)} data-chart-colors={JSON.stringify(colors)}>
  <div data-chart-container class="h-[180px] w-[180px]"></div>
</div>

<script>
  import { Chart } from '@/lib/chart-setup';
  import { createChartLifecycle } from '@/lib/utils/chart-lifecycle';

  const { init } = createChartLifecycle({
    containerSelector: '[data-chart-container]',
    onInit: (container, data) => {
      new Chart(container, { type: 'doughnut', data });
    },
  });

  init();
  document.addEventListener('astro:page-load', init);
</script>
```
````

````

Replace Loading States to use Skeleton:

```astro
import Skeleton from '@/components/atoms/Skeleton.astro';

<Skeleton variant="rectangular" width="60%" height="16px" />
````

Update `design-system/07-patterns.md` list page to use `TransactionFiltersBar` and `TransactionList`, replace any custom `Icon name=` usage with Lucide imports, and replace any `animate-pulse` loading example with `Skeleton`.

Update `design-system/08-animations.md` to include:

```markdown
import { animate } from 'motion';
import { animationDuration } from '@/lib/tokens';

animate(element, { opacity: [0, 1] }, { duration: animationDuration.normal, easing: 'easeOut' });
```

**Step 4: Run test to verify it passes**

Run: `rg "chart-setup" design-system/06-data-visualization.md`
Expected: Match found (exit code 0).

**Step 5: Commit**

```bash
git add design-system/06-data-visualization.md design-system/07-patterns.md design-system/08-animations.md

git commit -m "docs: refresh patterns and animations"
```

```

```
