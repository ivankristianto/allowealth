# UI Patterns

Common page and component compositions.

All icon examples use `@lucide/astro` (import the specific icons you need).

## Page Layouts

### Dashboard

```astro
<MainLayout title="Dashboard">
  <h1 class="text-3xl font-bold mb-8">Dashboard</h1>

  <SummaryCards data={summaryData} />

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
    <div class="lg:col-span-2">
      <RecentTransactionsList transactions={transactions} />
    </div>
    <aside>
      <BudgetHealthWidget budgets={budgets} />
    </aside>
  </div>
</MainLayout>
```

### List Page

```astro
<MainLayout title="Transactions">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold">Transactions</h1>
    <Button variant="primary" href="/transactions/add">Add Transaction</Button>
  </div>

  <Card className="mb-6">
    <TransactionFiltersBar
      typeFilter={filters.type}
      searchValue={filters.search}
      categoryIds={filters.categoryIds}
      categories={categories}
      availableMonths={availableMonths}
      selectedMonth={filters.month}
      currentMonth={currentMonth}
    />
  </Card>

  <TransactionList transactions={transactions} />
</MainLayout>
```

### Form Page

```astro
<MainLayout title="Add Transaction">
  <a href="/transactions" class="text-primary hover:underline mb-6 inline-flex items-center gap-1">
    <ArrowLeft size={16} class="stroke-current" aria-hidden="true" />
    Back
  </a>

  <h1 class="text-3xl font-bold mb-6">Add Transaction</h1>

  <Card className="max-w-2xl">
    <TransactionForm />
  </Card>
</MainLayout>
```

## Navigation

### Sidebar

```astro
<aside class="w-64 border-r">
  <nav class="p-4 space-y-2">
    <a href="/" class="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-neutral-100">
      <Home size={16} class="stroke-current" aria-hidden="true" />
      <span>Dashboard</span>
    </a>
    <a
      href="/transactions"
      class="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/10 text-primary"
    >
      <List size={16} class="stroke-current" aria-hidden="true" />
      <span>Transactions</span>
    </a>
  </nav>
</aside>
```

## Lists

### Simple List

```astro
<div class="space-y-3">
  {
    items.map(({ icon: Icon, title, subtitle, amount, currency }) => (
      <div class="flex items-center justify-between p-3 hover:bg-neutral-50 rounded-lg">
        <div class="flex items-center gap-3">
          <Icon size={16} class="stroke-current text-base-content/60" aria-hidden="true" />
          <div>
            <div class="font-medium">{title}</div>
            <div class="text-sm text-neutral-500">{subtitle}</div>
          </div>
        </div>
        <Currency amount={amount} currency={currency} />
      </div>
    ))
  }
</div>
```

### With Actions

```astro
<div class="flex items-center justify-between p-4 border rounded-lg">
  <div>{item.title}</div>
  <div class="flex gap-2">
    <Button variant="ghost" size="sm" aria-label="Edit">
      <Edit size={16} class="stroke-current" aria-hidden="true" />
    </Button>
    <Button variant="ghost" size="sm" aria-label="Delete">
      <Trash2 size={16} class="stroke-current" aria-hidden="true" />
    </Button>
  </div>
</div>
```

## Filters

```astro
<TransactionFiltersBar
  typeFilter={filters.type}
  searchValue={filters.search}
  categoryIds={filters.categoryIds}
  categories={categories}
  availableMonths={availableMonths}
  selectedMonth={filters.month}
  currentMonth={currentMonth}
/>
```

## Modals

### Confirmation

```astro
<ConfirmationModal
  id="confirm-delete"
  title="Confirm deletion"
  description="Are you sure? This cannot be undone."
  confirmLabel="Delete"
  confirmVariant="error"
  cancelLabel="Cancel"
/>
```

### Form Modal

```astro
<Modal id="add-category" title="Add Category">
  <form class="space-y-4">
    <FormField label="Name" htmlFor="name" required>
      <Input id="name" name="name" />
    </FormField>
    <div class="flex gap-2 justify-end">
      <Button variant="secondary" onclick="close()">Cancel</Button>
      <Button variant="primary" type="submit">Add</Button>
    </div>
  </form>
</Modal>
```

## Errors

### Inline

```html
<input error="{!!errors.email}" errorMessage="{errors.email}" />
```

### Banner

```html
<div class="alert alert-error mb-6" role="alert">
  <AlertCircle size="{16}" class="stroke-current" aria-hidden="true" />
  <div>
    <div class="font-semibold">Error loading data</div>
    <div class="text-sm">Please try again</div>
  </div>
  <button variant="outline" size="sm" onclick="retry()">Retry</button>
</div>
```

## Toast Notifications

Toast notifications provide feedback for user actions, API responses, and background task completion. The toast system uses Nano Stores for state management and Motion for smooth animations.

### When to Use Toasts

**Use toasts for:**

- Form submission feedback (success/error)
- API response notifications
- Background task completion
- Non-blocking error messages
- Informational updates

**Do NOT use toasts for:**

- Form validation errors (use inline errors)
- Critical blocking errors (use error page/modal)
- Confirmation dialogs (use Modal)

### Basic Usage

```astro
<script>
  import { addToast } from '@lib/stores/toastStore';

  // Success toast (auto-dismisses after 5 seconds)
  addToast('Profile updated successfully!', 'success');

  // Error toast (persistent until dismissed)
  addToast('Failed to save. Please try again.', 'error');

  // Warning toast (auto-dismisses after 5 seconds)
  addToast('Budget limit approaching', 'warning');

  // Info toast (auto-dismisses after 5 seconds)
  addToast('New feature available', 'info');
</script>
```

### Advanced Usage

```astro
<script>
  import { addToast, removeToast, clearAllToasts } from '@lib/stores/toastStore';

  // Custom duration (in milliseconds)
  addToast('Quick notification', 'success', { duration: 2000 });

  // Persistent toast (manual dismiss only)
  addToast('Important: Action required', 'warning', { duration: 0 });

  // Remove specific toast programmatically
  const toastId = addToast('Loading...', 'info');
  // ... later
  removeToast(toastId);

  // Clear all toasts (useful for navigation cleanup)
  clearAllToasts();
</script>
```

### Toast Types and Behavior

| Type    | Auto-Dismiss | Duration   | ARIA Live | Use Case                          |
| ------- | ------------ | ---------- | --------- | --------------------------------- |
| success | Yes          | 5 seconds  | polite    | Successful actions, confirmations |
| error   | No           | Persistent | assertive | Errors requiring attention        |
| warning | Yes          | 5 seconds  | polite    | Warnings, cautions                |
| info    | Yes          | 5 seconds  | polite    | Informational messages            |

### Multi-Toast Stacking

The toast system displays a maximum of 5 toasts at once. When the limit is reached, older toasts are automatically removed:

```javascript
// Rapidly adding toasts
for (let i = 0; i < 10; i++) {
  addToast(`Message ${i}`, 'info');
}
// Only the last 5 toasts will be visible
```

### Animation Patterns

Toasts use CSS transitions for smooth enter/exit animations:

- **Enter**: Fade in + slide from right (300ms, easeOut)
- **Exit**: Fade out + slide to right (200ms, easeIn)

### Example: Form Submission

```astro
<script>
  import { addToast } from '@lib/stores/toastStore';

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      addToast('Settings saved successfully!', 'success');
    } catch (error) {
      addToast('Failed to save settings. Please try again.', 'error');
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <!-- Form fields -->
</form>
```

## Loading

```astro
---
import Skeleton from '@/components/atoms/Skeleton.astro';
---

<div class="space-y-4">
  <Skeleton variant="heading" width="33%" />
  <Skeleton variant="text" width="66%" />
</div>

<div class="flex items-center justify-center py-12">
  <span class="loading loading-spinner loading-lg text-primary"></span>
</div>
```

## Pagination

```astro
<div class="flex items-center justify-between mt-6">
  <div class="text-sm text-neutral-500">Showing {startItem} to {endItem} of {totalItems}</div>
  <div class="flex gap-2">
    <Button variant="outline" size="sm" disabled={page === 1}>Previous</Button>
    <Button variant="outline" size="sm" disabled={page === totalPages}>Next</Button>
  </div>
</div>
```
