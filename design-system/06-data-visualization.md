# Data Visualization

Financial data display patterns.

## Currency Formatting

```typescript
import { formatCurrency, formatPercentage } from '@/lib/formatting';

formatCurrency(150000, 'IDR'); // "Rp150.000"
formatCurrency(99.99, 'USD'); // "$99.99"

formatPercentage(85.5, 2); // "85.50%"
```

**Client-side scripts:** use `@/lib/formatting/currency-client` to avoid bundling Decimal.js.

### Canonical Formatting Rules

- **Currency metadata**: IDR uses `id-ID` (0 decimals), USD uses `en-US` (2 decimals).
- **Symbol placement**: Always before the number with no space (`Rp150.000`, `$1,000.00`).
- **Negative values**: Negative sign precedes the symbol (`-Rp150.000`, `-$1,000.00`).
- **Precision first**: Always render full values instead of compact `K/M/B` notation.
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

const budgetStatus = getBudgetStatusClass(percentage);
// Returns: 'status-ok' | 'status-warning' | 'status-danger'
```

```astro
---
import ProgressBar from '@/components/atoms/ProgressBar.astro';
import { getBudgetStatusClass } from '@/lib/tokens';

const budgetStatus = getBudgetStatusClass(percentage);
const progressStatus =
  budgetStatus === 'status-danger'
    ? 'danger'
    : budgetStatus === 'status-warning'
      ? 'warning'
      : 'ok';
---

<span class={getBudgetStatusClass(percentage)}>
  {percentage < 80 ? 'Under budget' : percentage < 100 ? 'Near limit' : 'Over budget'}
</span>

<ProgressBar value={percentage} status={progressStatus} showLabel ariaLabel="Budget usage" />
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

```astro
---
import StatCard from '@/components/atoms/StatCard.astro';
import { TrendingUp } from '@lucide/astro';
import { formatCurrency } from '@/lib/formatting';
---

<StatCard
  title="Total Income"
  value={formatCurrency(totalIncome, 'IDR')}
  subtitle="+12% from last month"
  subtitleIcon="trending-up"
  iconVariant="success"
>
  <TrendingUp slot="icon" size={48} class="stroke-current" aria-hidden="true" />
</StatCard>
```

## Charts

Use `@/lib/chart-setup` and `createChartLifecycle` for initialization.

```astro
---
import { colors } from '@/lib/tokens';

const chartColors = [colors.success, colors.info, colors.warning];

const data = {
  labels: ['Savings', 'Investments', 'Cash'],
  datasets: [
    {
      data: [45, 35, 20],
      backgroundColor: chartColors,
      borderWidth: 0,
    },
  ],
};
---

<div data-chart-data={JSON.stringify(data)} data-chart-colors={JSON.stringify(chartColors)}>
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

  document.addEventListener('astro:page-load', init);
</script>
```

## Empty States

```astro
---
import EmptyState from '@/components/atoms/EmptyState.astro';
---

<Card>
  <EmptyState
    title="No transactions yet"
    message="Get started by adding your first transaction"
    iconName="inbox"
    actionLabel="Add Transaction"
    actionHref="/transactions/add"
    variant="centered"
  />
</Card>
```

## Loading States

```astro
---
import Skeleton from '@/components/atoms/Skeleton.astro';
---

<Skeleton variant="rectangular" width="60%" height="16px" />

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
