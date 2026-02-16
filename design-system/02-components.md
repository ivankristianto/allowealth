# Components

Component patterns for atoms, molecules, and organisms.

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
| FeaturesGrid                  | `src/components/molecules/landing/FeaturesGrid.astro`          | Landing feature grid     |
| HeroSection                   | `src/components/molecules/landing/HeroSection.astro`           | Landing hero section     |
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
| AssetsWidget              | `src/components/organisms/AssetsWidget.astro`              | Assets overview widget    |
| PaymentMethodFormModal    | `src/components/organisms/PaymentMethodFormModal.astro`    | Payment form modal        |
| ResourceAllocationChart   | `src/components/organisms/ResourceAllocationChart.astro`   | Allocation chart          |
| SetNewBudgetModal         | `src/components/organisms/SetNewBudgetModal.astro`         | New budget modal          |
| SpendingCard              | `src/components/organisms/SpendingCard.astro`              | Spending card             |
| SpendingChart             | `src/components/organisms/SpendingChart.astro`             | Spending chart            |
| SummaryCards              | `src/components/organisms/SummaryCards.astro`              | Dashboard summary cards   |
| TransactionFiltersBar     | `src/components/organisms/TransactionFiltersBar.astro`     | Filters bar               |
| TransactionList           | `src/components/organisms/TransactionList.astro`           | Transactions list         |
| TransactionDrawer         | `src/components/organisms/TransactionDrawer.astro`         | Transaction drawer        |
| TransactionSummaryCards   | `src/components/organisms/TransactionSummaryCards.astro`   | Transaction summary cards |
| WealthTrajectory          | `src/components/organisms/WealthTrajectory.astro`          | Wealth trajectory chart   |

## Structure Template

```astro
---
/**
 * ComponentName - Brief description
 * @param {string} variant - primary | secondary
 */
export interface Props {
  variant?: 'primary' | 'secondary';
  className?: string;
}

const { variant = 'primary', className = '' } = Astro.props;

const classes = ['base-classes', variant === 'primary' && 'primary-classes', className]
  .filter(Boolean)
  .join(' ');
---

<element class={classes}><slot /></element>
```

## Core Components

### Icon (`@lucide/astro`)

**Use Lucide icons** for all icons in the application. They are accessible, consistent, and well-maintained.

```astro
---
import {
  X,
  Plus,
  Edit,
  Trash2,
  Check,
  TriangleAlert,
  Info,
  Search,
  ChevronDown,
  ChevronRight,
} from '@lucide/astro';
---

<!-- Basic icon -->
<Plus size={20} />

<!-- With color -->
<Check size={16} class="text-success" />

<!-- In button -->
<button class="btn btn-primary">
  <Plus size={20} />
  <span>Add New</span>
</button>

<!-- Icon-only button (needs aria-label) -->
<button class="btn btn-ghost btn-square" aria-label="Close">
  <X size={24} />
</button>

<!-- With status -->
<div class="flex items-center gap-2 text-error">
  <TriangleAlert size={16} />
  <span>Error occurred</span>
</div>
```

**Icon Sizing Standards:**

| Context     | Size (px) | Usage Example                    |
| ----------- | --------- | -------------------------------- |
| Extra small | 12        | Compact badges, inline icons     |
| Small       | 16        | Button icons, inline text icons  |
| Medium      | 20        | Form field icons, card headers   |
| Large       | 24        | Alert icons, modal headers       |
| Extra large | 32        | Empty states, hero illustrations |

**Class-based sizing (for inline SVGs):**

| Tailwind Class | Size (px) |
| -------------- | --------- |
| `h-3 w-3`      | 12        |
| `h-4 w-4`      | 16        |
| `h-5 w-5`      | 20        |
| `h-6 w-6`      | 24        |
| `h-8 w-8`      | 32        |

**Common icons:**

- `Plus`, `Minus`, `X` - Actions
- `Edit` (or `Pencil`), `Trash2`, `Save` - CRUD operations
- `Search`, `Download`, `Upload` - Tools
- `Check`, `CircleCheck` - Success/complete
- `TriangleAlert`, `CircleX`, `Info` - Errors/warnings/info
- `ChevronDown`, `ChevronRight`, `ChevronLeft`, `ChevronUp` - Navigation
- `Menu`, `Settings`, `User`, `LogOut` - UI elements
- `Eye`, `EyeOff` - Password visibility toggle
- `Calendar`, `Tag`, `DollarSign` - Data entry icons

**Icon accessibility patterns:**

```astro
<!-- Decorative icon (not announced by screen readers) -->
<Search size={16} class="stroke-current" aria-hidden="true" />

<!-- Icon with adjacent text (no aria-label needed) -->
<button class="btn btn-primary">
  <Plus size={20} class="stroke-current" aria-hidden="true" />
  <span>Add New</span>
</button>

<!-- Icon-only button (aria-label required) -->
<button class="btn btn-ghost btn-circle" aria-label="Close dialog">
  <X size={16} class="stroke-current" aria-hidden="true" />
</button>

<!-- Status icon with text (aria-hidden on icon) -->
<div class="flex items-center gap-2">
  <Check size={16} class="text-success" aria-hidden="true" />
  <span>Changes saved</span>
</div>
```

**Standard icon classes:**

```astro
<!-- For buttons/interactive elements -->
<Icon size={16} class="stroke-current" aria-hidden="true" />

<!-- For flex layouts (prevents shrinking) -->
<Icon size={20} class="shrink-0" aria-hidden="true" />

<!-- For colored icons -->
<Icon size={24} class="text-primary" aria-hidden="true" />

<!-- Combined -->
<Icon size={16} class="stroke-current shrink-0" aria-hidden="true" />
```

**Stroke-width guidance:**

Lucide icons use a default stroke-width of 2, which provides good visual clarity at all standard sizes. **Do NOT explicitly set stroke-width** - use Lucide's default for consistency.

| Size (px) | Default Stroke Width | Visual Effect              |
| --------- | -------------------- | -------------------------- |
| 12        | 2 (default)          | Crisp at small sizes       |
| 16        | 2 (default)          | Standard for buttons       |
| 20        | 2 (default)          | Balanced for UI elements   |
| 24        | 2 (default)          | Clear for alerts/status    |
| 32        | 2 (default)          | Proportionate for emphasis |

**Rationale:** Lucide's default stroke-width is carefully designed for each icon's visual balance. Changing stroke-width can make icons appear too heavy or too light, reducing accessibility and visual consistency.

**Avoid:**

```astro
<!-- Don't explicitly set stroke-width -->
<X size={16} stroke-width={1} />
<Plus size={20} stroke={3} />
```

**Use:**

```astro
<!-- Let Lucide use its default stroke-width -->
<X size={16} class="stroke-current" />
<Plus size={20} class="stroke-current shrink-0" />
```

**Migration note:** The custom `Icon.astro` component has been removed. All icons now use `@lucide/astro` directly. See `docs/icon-migration-guide.md` for migration patterns.

### Skeleton (`src/components/atoms/Skeleton.astro`)

```astro
<Skeleton variant="rectangular" width="100%" height="16px" />
<Skeleton variant="circular" width="32px" height="32px" />
```

### StatCard (`src/components/atoms/StatCard.astro`)

```astro
<StatCard title="TOTAL INCOME" value="Rp 9.750.000" subtitle="PERIOD TOTAL">
  <div slot="icon">
    <TrendingUp size={24} class="stroke-current" aria-hidden="true" />
  </div>
</StatCard>
```

### Button (`src/components/atoms/Button.astro`)

**Button Standards**

- Actionable buttons use `rounded-2xl` by default.
- Outline/ghost buttons must keep accessible borders (`border-accent` or `border-base-300` variants), not low-opacity-only borders like `border-accent/10`.
- `rounded-full` is only for intentional circular non-action UI (status dots, avatars, progress markers), not action buttons.

```astro
<Button variant="primary" type="submit">Save</Button>
<Button variant="outline" size="sm">Filter</Button>
<Button variant="danger" onclick="confirmDelete()">Delete</Button>
<Button loading={isSubmitting}>Submitting...</Button>
```

**Variants:** `primary` | `secondary` | `outline` | `ghost` | `danger` | `warning` | `success`
**Sizes:** `sm` | `md` | `lg` | `xl`

### Card (`src/components/atoms/Card.astro`)

```astro
<Card>Content</Card>
<Card compact>Compact padding</Card>
<Card hoverable>Interactive card</Card>
```

### Input (`src/components/atoms/Input.astro`)

```astro
<Input id="name" name="name" type="text" required />
<Input id="amount" type="number" min={0} step={0.01} />
<Input id="email" type="email" error={!!errors.email} errorMessage={errors.email} />
```

### Modal (`src/components/molecules/Modal.astro`)

**Modal dialogs for focused user interactions.** Use for forms, confirmations, or detailed views that require user attention.

**Key Features:**

- Native HTML `<dialog>` element with enhanced UX
- Smooth Motion animations (respects prefers-reduced-motion)
- Backdrop blur with click-to-close
- Keyboard accessible (Esc to close, Tab navigation)
- ARIA-compliant with proper labels
- Responsive with mobile-first design

**Reference Implementation:** `src/components/organisms/TransactionDrawer.astro` - Best practice example

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
```

#### Basic Usage

```astro
<Modal id="example-modal" title="Modal Title" size="md">
  <p>Modal content goes here.</p>

  <div slot="actions">
    <Button variant="ghost">Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </div>
</Modal>

<script>
  const modal = document.getElementById('example-modal') as HTMLDialogElement;

  // Open modal (preferred: native dialog API)
  if (modal && !modal.open) {
    modal.showModal();
  }

  // Alternative: class toggle (legacy)
  modal?.classList.add('modal-open');

  // Close modal
  modal?.close();
</script>
```

#### Props

| Prop            | Type                           | Default | Description                           |
| --------------- | ------------------------------ | ------- | ------------------------------------- |
| `id`            | `string`                       | -       | **Required.** Unique modal identifier |
| `title`         | `string`                       | `''`    | Modal title (optional)                |
| `open`          | `boolean`                      | `false` | Initial open state                    |
| `size`          | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'`  | Modal width                           |
| `closable`      | `boolean`                      | `true`  | Show close button in header           |
| `backdropClose` | `boolean`                      | `true`  | Allow closing by clicking backdrop    |
| `className`     | `string`                       | `''`    | Additional CSS classes                |

#### Sizes

```typescript
sm: 'max-w-md'; // ~448px - Confirmations, small forms
md: 'max-w-lg'; // ~512px - Standard forms
lg: 'max-w-2xl'; // ~672px - Multi-section forms
xl: 'max-w-4xl'; // ~896px - Complex layouts, data tables
```

#### Pattern 1: Simple Confirmation Modal

```astro
---
import Modal from '@/components/molecules/Modal.astro';
import { Trash2 } from '@lucide/astro';
---

<Modal id="delete-modal" size="sm" closable={false}>
  <div class="flex flex-col gap-6">
    <!-- Header with icon -->
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-error/10">
        <Trash2 size={24} class="stroke-current text-error" aria-hidden="true" />
      </div>
      <div class="flex-1">
        <h2 class="text-2xl font-bold tracking-tight text-primary leading-none">Delete Item</h2>
        <p class="text-neutral text-sm mt-2 font-medium">This action cannot be undone.</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-4">
      <button
        type="button"
        class="btn btn-ghost flex-1 h-14 rounded-full font-bold"
        data-close-modal
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-error flex-1 h-14 rounded-full font-bold"
        data-confirm-delete
      >
        Delete
      </button>
    </div>
  </div>
</Modal>

<script>
  const modal = document.getElementById('delete-modal') as HTMLDialogElement;
  const closeBtn = modal?.querySelector('[data-close-modal]');
  const confirmBtn = modal?.querySelector('[data-confirm-delete]');

  closeBtn?.addEventListener('click', () => modal?.close());

  confirmBtn?.addEventListener('click', async () => {
    // Handle deletion
    await deleteItem();
    modal?.close();
  });
</script>
```

#### Pattern 2: Form Drawer (TransactionDrawer Pattern)

**Best Practice:** Use custom header with icon, type-specific styling, and form integration.

```astro
---
import Modal from '@/components/molecules/Modal.astro';
import { CirclePlus, Sparkles } from '@lucide/astro';
---

<div data-form-modal-container data-id="add-transaction">
  <Modal id="add-transaction" size="md" closable={false} backdropClose={true}>
    <div class="flex flex-col gap-6">
      <!-- Header section -->
      <div class="flex items-center gap-4">
        <!-- Icon with semantic background -->
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-success/10">
          <CirclePlus size={24} class="stroke-current text-success" aria-hidden="true" />
        </div>

        <!-- Title and subtitle -->
        <div class="flex-1">
          <h2 class="text-2xl font-bold tracking-tight text-primary leading-none">
            Add Transaction
          </h2>
          <p class="text-neutral text-sm mt-2 font-medium">Log a new transaction to your ledger.</p>
        </div>

        <!-- Optional action button -->
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 bg-accent/10 text-accent rounded-xl text-xs font-bold"
          data-scan-button
        >
          <Sparkles size={16} class="stroke-current" aria-hidden="true" />
          <span>Scan</span>
        </button>
      </div>

      <!-- Form -->
      <form id="transaction-form" data-transaction-form class="flex flex-col gap-5">
        <!-- Form fields go here -->

        <!-- Global error message -->
        <div id="form-error" class="hidden alert alert-error text-sm" role="alert"></div>

        <!-- Actions -->
        <div class="flex gap-4 pt-4">
          <button
            type="button"
            class="flex-1 btn btn-ghost h-14 rounded-full font-bold"
            data-cancel
          >
            Cancel
          </button>
          <button type="submit" class="flex-[2] btn btn-accent h-14 rounded-full font-bold">
            Save Transaction
          </button>
        </div>
      </form>
    </div>
  </Modal>
</div>

<script>
  import { addToast } from '@/lib/stores/toastStore';

  const container = document.querySelector('[data-form-modal-container]');
  const modal = document.getElementById('add-transaction') as HTMLDialogElement;
  const form = document.getElementById('transaction-form') as HTMLFormElement;
  const cancelBtn = form?.querySelector('[data-cancel]');
  const errorDiv = document.getElementById('form-error');

  // Cancel button - reset and close
  cancelBtn?.addEventListener('click', () => {
    form?.reset();
    errorDiv?.classList.add('hidden');
    modal?.close();
  });

  // Form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = submitBtn?.textContent || 'Save';

    // Clear errors
    errorDiv?.classList.add('hidden');

    // Show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const formData = new FormData(form);
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save');
      }

      // Success
      addToast('Transaction saved!', 'success');
      form.reset();
      modal.close();

      // Dispatch custom event for page updates
      document.dispatchEvent(new CustomEvent('transaction-added'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
      }
      addToast(message, 'error');
    } finally {
      // Reset button state
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
</script>
```

#### Pattern 3: Multi-Step Modal

```astro
<Modal id="wizard-modal" size="lg">
  <div class="flex flex-col gap-6">
    <!-- Progress indicator -->
    <div class="flex gap-2">
      <div class="flex-1 h-1 bg-accent rounded"></div>
      <div class="flex-1 h-1 bg-base-300 rounded"></div>
      <div class="flex-1 h-1 bg-base-300 rounded"></div>
    </div>

    <!-- Step content (dynamically rendered) -->
    <div id="step-content">
      <!-- Step 1, 2, 3... -->
    </div>

    <!-- Actions -->
    <div class="flex justify-between gap-4">
      <button class="btn btn-ghost" data-prev>Back</button>
      <button class="btn btn-accent" data-next>Next</button>
    </div>
  </div>
</Modal>
```

#### Accessibility Checklist

- ✅ **ID required:** Every modal must have a unique `id`
- ✅ **Title linking:** Modal uses `aria-labelledby` to link to title element
- ✅ **Close button:** Include `aria-label="Close modal"` on close button
- ✅ **Keyboard navigation:**
  - `Esc` closes modal (automatic via `<dialog>`)
  - `Tab` cycles through focusable elements
  - Focus trap within modal when open
- ✅ **Screen reader:**
  - Title announced when modal opens
  - Error messages use `role="alert"` with `aria-live="polite"`
- ✅ **Focus management:**
  - Focus moves to modal when opened
  - Focus returns to trigger element when closed

#### Responsive Design

**Mobile-first approach:**

```astro
<!-- Modal automatically adapts -->
<Modal id="responsive" size="md">
  <!-- Mobile: Full-width with padding -->
  <!-- Tablet+: Fixed max-width with centered layout -->
</Modal>
```

**Custom responsive content:**

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Single column on mobile, two columns on desktop -->
</div>
```

#### Animation Details

**Powered by Motion library** with automatic fallback for `prefers-reduced-motion`.

**Enter animation:**

- Backdrop: Fade in (opacity 0 → 1, 200ms)
- Content: Scale up + slide up (scale 0.95 → 1, y 20px → 0, 300ms)

**Exit animation:**

- Content: Scale down + slide down (scale 1 → 0.95, y 0 → 20px, 300ms)
- Backdrop: Instant (no fade out for better UX)

**Configuration:** `src/lib/animations/modal.ts`

#### Best Practices

**DO:**

- ✅ Use semantic HTML (`<dialog>`, `<button>`, `<form>`)
- ✅ Provide clear, action-oriented titles
- ✅ Include icon with colored background for context
- ✅ Use subtitle to explain purpose or consequences
- ✅ Display loading states during async operations
- ✅ Show error messages inline with `role="alert"`
- ✅ Reset form state when closing modal
- ✅ Use toast notifications for success feedback
- ✅ Dispatch custom events for page updates
- ✅ Prevent duplicate initialization with `WeakSet`

**DON'T:**

- ❌ Create modal without unique `id`
- ❌ Use `<div>` instead of `<button>` for close action
- ❌ Forget to disable submit button during loading
- ❌ Navigate away without user confirmation
- ❌ Use modal for non-critical information (use toast instead)
- ❌ Stack multiple modals (use multi-step pattern)
- ❌ Create giant modals (break into steps or use full page)

#### Common Patterns Summary

| Pattern      | Size | Use Case                        | Example                 |
| ------------ | ---- | ------------------------------- | ----------------------- |
| Confirmation | `sm` | Delete, logout, discard changes | DeleteConfirmationModal |
| Form         | `md` | Add/edit items, settings        | TransactionDrawer       |
| Details      | `lg` | View details with actions       | TransactionDetailsModal |
| Complex Form | `xl` | Multi-field forms, data entry   | BudgetPlanningModal     |
| Multi-Step   | `lg` | Wizards, onboarding             | SetupWizardModal        |

#### TypeScript Interface

```typescript
export interface Props {
  id: string; // Required: Unique modal identifier
  title?: string; // Optional: Modal title
  open?: boolean; // Initial open state (default: false)
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Modal width (default: 'md')
  closable?: boolean; // Show close button (default: true)
  backdropClose?: boolean; // Close on backdrop click (default: true)
  className?: string; // Additional CSS classes
}
```

#### Client-Side Utilities

**Opening and closing:**

```typescript
// Open modal by adding class (triggers animation)
const modal = document.getElementById('modal-id') as HTMLDialogElement;
if (modal && !modal.open) {
  modal.showModal();
}

// Alternative: class toggle (legacy)
modal?.classList.add('modal-open');

// Close modal (triggers exit animation)
modal?.close();
```

**Prevent duplicate initialization:**

```typescript
const initializedModals = new WeakSet<Element>();

function initModal(container: Element) {
  if (initializedModals.has(container)) return;
  initializedModals.add(container);

  // Setup event listeners...
}
```

**Form integration:**

```typescript
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Show loading state
  // 2. Submit to API
  // 3. Handle success/error
  // 4. Reset form and close modal
  // 5. Dispatch custom event for page updates
});
```

### Badge (`src/components/atoms/Badge.astro`)

```astro
<Badge variant="success">Paid</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="primary" outline>New</Badge>
```

### Toast (`src/components/molecules/ToastContainer.astro`)

**Global toast notification system** using Nano Stores and Motion for state management and animations. Automatically included in `BaseLayout.astro`.

**Usage (in client-side scripts):**

```astro
<script>
  import { addToast } from '@lib/stores/toastStore';

  // Basic usage
  addToast('Profile saved!', 'success');
  addToast('Failed to save', 'error');
  addToast('Please review', 'warning');
  addToast('New update available', 'info');

  // Custom duration (ms)
  addToast('Quick message', 'success', { duration: 2000 });

  // Persistent (manual dismiss)
  addToast('Action required', 'warning', { duration: 0 });

  // Remove specific toast
  import { removeToast } from '@lib/stores/toastStore';
  const toastId = addToast('Message', 'info');
  removeToast(toastId);

  // Clear all toasts
  import { clearAllToasts } from '@lib/stores/toastStore';
  clearAllToasts();
</script>
```

**Types:** `success` | `error` | `warning` | `info`

**Behavior:**

- Success/info/warning: Auto-dismiss after 5 seconds
- Error: Persistent until manually dismissed
- Maximum 5 toasts visible at once (older toasts removed when limit reached)
- Positioned top-right with slide animations
- Cleaned up on page navigation to prevent memory leaks

**DaisyUI Classes Used:**

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

**Accessibility:**

- Container: `role="region"` and `aria-label="Notifications"`
- Each toast: `role="alert"` with `aria-live="polite"` (success/info/warning) or `aria-live="assertive"` (error)
- Dismissible button with `aria-label`

**Note:** The close button uses inline SVG instead of `@lucide/astro` icon component. This is necessary due to Astro SSR limitations for client-side scripts that dynamically create DOM elements.

## Patterns

### Conditional Classes

```typescript
const classes = [
  'base',
  variant === 'primary' && 'btn-primary',
  disabled && 'opacity-50',
  className,
]
  .filter(Boolean)
  .join(' ');
```

### Variant Mapping

```typescript
const variantClasses: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'bg-neutral-200',
};

const classes = ['base', variantClasses[variant] || variantClasses.primary]
  .filter(Boolean)
  .join(' ');
```

### Prop Defaults

```typescript
const { variant = 'primary', size = 'md', disabled = false, className = '' } = Astro.props;
```

## DaisyUI Classes

```html
<button class="btn btn-primary">
  <input class="input input-bordered" />
  <div class="card card-bordered bg-base-100">
    <span class="badge badge-primary">
      <div class="alert alert-warning">
        <dialog class="modal"></dialog></div
    ></span>
  </div>
</button>
```

## Component Checklist

- [ ] Check existing components first
- [ ] Use design tokens (import from `@/lib/tokens`)
- [ ] TypeScript Props interface
- [ ] Sensible prop defaults
- [ ] DaisyUI classes when available
- [ ] ARIA attributes where needed
- [ ] Keyboard accessible
- [ ] Responsive

## Modern HTML Elements

**Always use semantic HTML elements** instead of generic divs and spans. This improves accessibility, SEO, and code readability.

```html
<!-- Layout elements -->
<header><!-- Site/section header --></header>
<nav><!-- Navigation menu --></nav>
<main><!-- Primary content --></main>
<aside><!-- Sidebar, related content --></aside>
<footer><!-- Site/section footer --></footer>

<!-- Content sectioning -->
<section><!-- Thematic grouping --></section>
<article><!-- Self-contained content --></article>
<figure>
  <img src="..." alt="..." />
  <figcaption>Caption</figcaption>
</figure>

<!-- Interactive elements -->
<button><!-- Clickable action --></button>
<dialog><!-- Modal/popup --></dialog>
<details>
  <summary>Expandable title</summary>
  Content
</details>
```

**Example: Dashboard layout**

```html
<main class="container mx-auto p-6">
  <header class="mb-8">
    <h1 class="text-4xl font-bold">Dashboard</h1>
  </header>

  <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <article class="card">
      <h2 class="text-xl font-semibold">Budget Overview</h2>
      <p>...</p>
    </article>

    <article class="card">
      <h2 class="text-xl font-semibold">Recent Transactions</h2>
      <p>...</p>
    </article>
  </section>
</main>
```

## Anti-Patterns

❌ Hardcoded: `style="color: #10b981"`
✅ Token: `class="text-primary"`

❌ Over-engineered: `<TextWithColorAndSize text="Hello" color="primary" />`
✅ Simple: `<h3 class="text-lg text-primary">Hello</h3>`

❌ No accessibility: `<input placeholder="Name" />`
✅ With label: `<Label htmlFor="name">Name</Label><Input id="name" />`

❌ Generic divs: `<div class="wrapper"><div class="item" onclick="...">Click</div></div>`
✅ Semantic HTML: `<section><button>Click</button></section>`

❌ Custom icons: `<span class="icon">✓</span>`
✅ Lucide icons: `<Check size={16} />`
