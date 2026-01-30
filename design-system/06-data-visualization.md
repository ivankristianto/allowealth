# Data Visualization

Financial data display patterns.

## Currency Formatting

```typescript
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercentage,
  formatCompactNumber,
} from '@/lib/formatting';

formatCurrency(150000, 'IDR'); // "Rp150.000"
formatCurrencyCompact(1500000, 'IDR'); // "Rp1.5M"
formatCurrency(99.99, 'USD'); // "$99.99"

formatPercentage(85.5, 2); // "85.50%"
formatCompactNumber(1500000); // "1.5M"
```

**Client-side scripts:** use `@/lib/formatting/currency-client` to avoid bundling Decimal.js.

### Canonical Formatting Rules

- **Currency metadata**: IDR uses `id-ID` (0 decimals), USD uses `en-US` (2 decimals).
- **Symbol placement**: Always before the number with no space (`Rp150.000`, `$1,000.00`).
- **Negative values**: Negative sign precedes the symbol (`-Rp150.000`, `-$1,000.00`).
- **Compact notation**: `K/M/B` suffixes with one decimal (trim trailing `.0`, dot decimal separator).
- **Invalid values**: Non-finite values format as zero in the requested currency.

### Component

```astro
<Currency amount={150000} currency="IDR" className="currency-idr" />
```

### Colors

```html
<span class="currency-idr">Rp 150.000</span>
<!-- green -->
<span class="currency-usd">$99.99</span>
<!-- blue -->
```

## Budget Status

```typescript
import { getBudgetStatusClass } from '@/lib/tokens';

const statusClass = getBudgetStatusClass(percentage);
// Returns: 'status-ok' | 'status-warning' | 'status-danger'
```

```html
<span class="{getBudgetStatusClass(percentage)}">
  {percentage < 80 ? 'Under budget' : percentage < 100 ? 'Near limit' : 'Over budget'}
</span>

<!-- Progress bar -->
<div class="relative w-full h-2 bg-neutral-200 rounded-full">
  <div class="{`h-full" rounded-full ${ percentage>
    = 100 ? 'bg-status-danger' : percentage >= 80 ? 'bg-status-warning' : 'bg-status-ok' }`}
    style={`width: ${Math.min(percentage, 100)}%`} >
  </div>
</div>
```

## Tables

```html
<table class="table w-full">
  <thead>
    <tr>
      <th>Date</th>
      <th>Description</th>
      <th class="text-right">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="text-sm text-neutral-600">{date}</td>
      <td class="font-medium">{description}</td>
      <td class="font-mono text-right">
        <Currency amount="{amount}" currency="{currency}" />
      </td>
    </tr>
  </tbody>
</table>
```

**Right-align numbers, use monospace font.**

## Summary Cards

```html
<Card>
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm text-neutral-500 uppercase">Total Income</div>
      <div class="text-2xl font-bold mt-2">
        <Currency amount="{totalIncome}" currency="IDR" />
      </div>
      <div class="text-sm text-success mt-1">
        <Icon name="arrow-up" size="xs" />
        +12% from last month
      </div>
    </div>
    <div class="p-3 bg-success/10 rounded-lg">
      <Icon name="trending-up" size="lg" className="text-success" />
    </div>
  </div>
</Card>
```

## Charts

**Use Chart.js** for financial charts.

```typescript
const chartColors = {
  income: '#10b981',
  expenses: '#ef4444',
  categories: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
};
```

```astro
<canvas id="chart"></canvas>

<script>
  import Chart from 'chart.js/auto';

  new Chart(document.getElementById('chart'), {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [
        {
          label: 'Expenses',
          data: [1500000, 1800000, 1600000],
          backgroundColor: '#ef4444',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => `Rp ${context.parsed.y.toLocaleString('id-ID')}`,
          },
        },
      },
    },
  });
</script>
```

## Empty States

```html
<Card>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <Icon name="inbox" size="2xl" className="text-neutral-300 mb-4" />
    <h3 class="text-lg font-semibold mb-2">No transactions yet</h3>
    <p class="text-neutral-500 mb-4">Get started by adding your first transaction</p>
    <button variant="primary" href="/transactions/add">Add Transaction</button>
  </div>
</Card>
```

## Loading States

```html
<!-- Skeleton -->
<div class="animate-pulse">
  <div class="h-4 bg-neutral-200 rounded w-1/3 mb-3"></div>
  <div class="h-8 bg-neutral-200 rounded w-1/2"></div>
</div>

<!-- Spinner -->
<span class="loading loading-spinner loading-lg text-primary"></span>
```

## Checklist

- [ ] Use formatting functions (never format inline)
- [ ] Apply currency colors (currency-idr, currency-usd)
- [ ] Use budget status colors (status-ok, status-warning, status-danger)
- [ ] Right-align numeric data
- [ ] Monospace font for numbers
- [ ] Provide empty states
- [ ] Show loading states
- [ ] Make tables responsive
