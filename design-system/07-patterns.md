# UI Patterns

Common page and component compositions.

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
    <TransactionFilters />
  </Card>

  <TransactionList transactions={transactions} />
</MainLayout>
```

### Form Page

```astro
<MainLayout title="Add Transaction">
  <a href="/transactions" class="text-primary hover:underline mb-6 inline-flex items-center gap-1">
    <Icon name="arrow-left" size="sm" />
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
      <Icon name="home" size="sm" />
      <span>Dashboard</span>
    </a>
    <a
      href="/transactions"
      class="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/10 text-primary"
    >
      <Icon name="list" size="sm" />
      <span>Transactions</span>
    </a>
  </nav>
</aside>
```

## Lists

### Simple List

```html
<div class="space-y-3">
  {items.map(item => (
  <div class="flex items-center justify-between p-3 hover:bg-neutral-50 rounded-lg">
    <div class="flex items-center gap-3">
      <Icon name="{item.icon}" />
      <div>
        <div class="font-medium">{item.title}</div>
        <div class="text-sm text-neutral-500">{item.subtitle}</div>
      </div>
    </div>
    <Currency amount="{item.amount}" currency="{item.currency}" />
  </div>
  ))}
</div>
```

### With Actions

```html
<div class="flex items-center justify-between p-4 border rounded-lg">
  <div>{item.title}</div>
  <div class="flex gap-2">
    <button variant="ghost" size="sm"><Icon name="edit" /></button>
    <button variant="ghost" size="sm"><Icon name="trash" /></button>
  </div>
</div>
```

## Filters

```html
<div class="flex flex-col md:flex-row gap-4">
  <input type="text" placeholder="Search..." className="flex-1" />
  <select class="select select-bordered w-full md:w-48">
    <option value="">All Categories</option>
  </select>
  <select class="select select-bordered w-full md:w-48">
    <option value="">All Time</option>
  </select>
  <button variant="outline" size="sm">Clear</button>
</div>
```

## Modals

### Confirmation

```astro
<Modal id="confirm-delete" title="Confirm Deletion" size="sm">
  <p>Are you sure? This cannot be undone.</p>
  <div slot="actions">
    <Button variant="secondary" onclick="close()">Cancel</Button>
    <Button variant="danger" onclick="confirmDelete()">Delete</Button>
  </div>
</Modal>
```

### Form Modal

```astro
<Modal id="add-category" title="Add Category">
  <form class="space-y-4">
    <div class="form-control">
      <Label htmlFor="name" required>Name</Label>
      <Input id="name" name="name" />
    </div>
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
  <Icon name="alert-circle" />
  <div>
    <div class="font-semibold">Error loading data</div>
    <div class="text-sm">Please try again</div>
  </div>
  <button variant="outline" size="sm" onclick="retry()">Retry</button>
</div>
```

## Loading

```html
<!-- Skeleton -->
<div class="animate-pulse space-y-4">
  <div class="h-6 bg-neutral-200 rounded w-1/3"></div>
  <div class="h-4 bg-neutral-200 rounded w-2/3"></div>
</div>

<!-- Spinner -->
<div class="flex items-center justify-center py-12">
  <span class="loading loading-spinner loading-lg text-primary"></span>
</div>
```

## Pagination

```html
<div class="flex items-center justify-between mt-6">
  <div class="text-sm text-neutral-500">Showing {startItem} to {endItem} of {totalItems}</div>
  <div class="flex gap-2">
    <button variant="outline" size="sm" disabled="{page" ="" ="" ="1}">Previous</button>
    <button variant="outline" size="sm" disabled="{page" ="" ="" ="totalPages}">Next</button>
  </div>
</div>
```
