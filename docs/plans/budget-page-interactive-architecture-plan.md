# Budget Page Interactive Architecture Plan

**Version:** 1.0.0
**Date:** 2025-01-27
**Status:** Draft

## Executive Summary

This document outlines the plan to refactor the Budget page (`src/pages/budget/index.astro`) to use the **Interactive Page Architecture** pattern documented in `docs/architecture/002-interactive-pages.md`. Additionally, the AI Rebalancer "Coming Soon" modal will be migrated to use the reusable `Modal` component.

## Background

### Current State

The Budget page currently:

1. Uses direct service calls in the frontmatter for data fetching
2. Has an inline `<script>` tag with ~250 lines of client-side JavaScript
3. Contains duplicated logic between server and client (formatting, status calculation)
4. Uses a raw `<dialog>` element for the AI Rebalancer modal instead of the reusable `Modal` component

### Target State

After refactoring:

1. Server-rendered HTML fragments (partials) as single source of truth
2. API endpoint supports `_render=html` for dynamic updates
3. Clean separation: API Client → Renderer → Orchestrator
4. No duplicated formatting logic (server handles all rendering)
5. AI Rebalancer modal uses the `Modal` component with proper animations

## Technical Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           SERVER (Astro)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ budget/         │    │ Partial         │    │ API Endpoint   │  │
│  │ index.astro     │    │ Components      │    │ /api/budget/   │  │
│  │ (SSR)           │    │                 │    │ overview.ts    │  │
│  │                 │    │ BudgetSummary   │    │                │  │
│  │ Uses partials   │───▶│ Partial.astro   │◀───│ ?_render=html  │  │
│  │ for initial     │    │                 │    │ Renders same   │  │
│  │ render          │    │ BudgetCardGrid  │    │ partials       │  │
│  │                 │    │ Partial.astro   │    │                │  │
│  └─────────────────┘    └─────────────────┘    └────────────────┘  │
│                                                        │            │
└────────────────────────────────────────────────────────┼────────────┘
                                                         │
                                                         │ HTML fragments
                                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (JavaScript)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ budgetApi       │    │ BudgetRenderer  │    │ BudgetPage     │  │
│  │ Client.ts       │    │ .client.ts      │    │ .client.ts     │  │
│  │                 │    │                 │    │                │  │
│  │ fetchBudget     │───▶│ renderSummary   │◀───│ Event handlers │  │
│  │ OverviewHtml()  │    │ Html()          │    │ State mgmt     │  │
│  │                 │    │ renderCardsHtml │    │ Orchestration  │  │
│  └─────────────────┘    └─────────────────┘    └────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── components/
│   ├── partials/
│   │   ├── BudgetSummaryPartial.astro      # NEW: Summary section
│   │   ├── BudgetCardGridPartial.astro     # NEW: Cards grid section
│   │   └── BudgetAdviceBannerPartial.astro # NEW: Advice banner section
│   │
│   ├── organisms/
│   │   ├── BudgetActions.astro             # UPDATE: Use Modal component
│   │   ├── BudgetRenderer.client.ts        # NEW: HTML injection + animations
│   │   └── BudgetPage.client.ts            # NEW: Event handling + orchestration
│   │
│   └── molecules/
│       └── Modal.astro                     # EXISTING: Reusable modal
│
├── lib/
│   └── api/
│       └── budgetApiClient.ts              # NEW: Budget API client with HTML support
│
└── pages/
    ├── api/
    │   └── budget/
    │       └── overview.ts                 # UPDATE: Add _render=html support
    │
    └── budget/
        └── index.astro                     # UPDATE: Use partials + client modules
```

---

## Implementation Phases

### Phase 1: Create Partial Components

Create server-rendered partial components that can be used both for initial SSR and API responses.

#### BudgetSummaryPartial.astro

```astro
---
/**
 * BudgetSummaryPartial
 *
 * Server-rendered partial for budget summary section.
 * Used by both initial page render and API HTML responses.
 */
import BudgetSummary from '@components/organisms/BudgetSummary.astro';
import type { AllocationDistribution } from '@/lib/utils/budget';

export interface Props {
  totalAllocated: number;
  totalSpent: number;
  distribution: AllocationDistribution[];
  currency: 'IDR' | 'USD';
}

const { totalAllocated, totalSpent, distribution, currency } = Astro.props;
---

<BudgetSummary
  totalAllocated={totalAllocated}
  totalSpent={totalSpent}
  distribution={distribution}
  currency={currency}
  loading={false}
/>
```

#### BudgetCardGridPartial.astro

```astro
---
/**
 * BudgetCardGridPartial
 *
 * Server-rendered partial for budget cards grid.
 * Includes data attributes for client-side updates.
 */
import BudgetCardGrid from '@components/organisms/BudgetCardGrid.astro';
import type { BudgetCategorySummary } from '@/services';

export interface Props {
  budgets: BudgetCategorySummary[];
  currency: 'IDR' | 'USD';
}

const { budgets, currency } = Astro.props;
---

<BudgetCardGrid budgets={budgets} currency={currency} loading={false} />
```

#### BudgetAdviceBannerPartial.astro

```astro
---
/**
 * BudgetAdviceBannerPartial
 *
 * Server-rendered partial for budget advice banner.
 */
import BudgetAdviceBanner from '@components/organisms/BudgetAdviceBanner.astro';

export interface Props {
  adviceData: {
    categoryName: string;
    status: 'exceeded' | 'warning';
    amount: string;
    percentageUsed?: number;
  } | null;
}

const { adviceData } = Astro.props;
---

{
  adviceData && (
    <BudgetAdviceBanner
      categoryName={adviceData.categoryName}
      status={adviceData.status}
      amount={adviceData.amount}
      percentageUsed={adviceData.percentageUsed}
      ctaText="Review spending"
      ctaUrl="/transactions"
      show={true}
      dismissible={true}
    />
  )
}
```

---

### Phase 2: Update API Endpoint

Extend `/api/budget/overview.ts` to support HTML rendering.

```typescript
// src/pages/api/budget/overview.ts
import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { budgetService } from '@/services';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { calculateAllocationDistribution } from '@/lib/utils/budget';

// Import partials for HTML rendering
import BudgetSummaryPartial from '@components/partials/BudgetSummaryPartial.astro';
import BudgetCardGridPartial from '@components/partials/BudgetCardGridPartial.astro';
import BudgetAdviceBannerPartial from '@components/partials/BudgetAdviceBannerPartial.astro';

export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { url } = context;
    const render = createRenderHelper(url);

    // Parse query params
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');
    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD') || 'IDR';
    const partial = url.searchParams.get('_partial') || 'all';

    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

    // Fetch data
    const budgetData = await budgetService.getMonthlyOverview(userId, year, month, currency);
    const alerts = await budgetService.getAlerts(userId, currency);

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const htmlParts: string[] = [];

      // Render requested partials
      if (partial === 'all' || partial === 'summary') {
        const distribution = calculateAllocationDistribution(
          budgetData.categories.map((cat) => ({
            name: cat.category_name,
            budget_amount: cat.budget_amount,
            spent_amount: cat.spent_amount,
          }))
        );

        const summaryHtml = await container.renderToString(BudgetSummaryPartial, {
          props: {
            totalAllocated: parseFloat(budgetData.total_budget || '0'),
            totalSpent: parseFloat(budgetData.total_spent || '0'),
            distribution,
            currency,
          },
        });
        htmlParts.push(`<!-- PARTIAL:summary -->\n${summaryHtml}`);
      }

      if (partial === 'all' || partial === 'cards') {
        const cardsHtml = await container.renderToString(BudgetCardGridPartial, {
          props: {
            budgets: budgetData.categories,
            currency,
          },
        });
        htmlParts.push(`<!-- PARTIAL:cards -->\n${cardsHtml}`);
      }

      if (partial === 'all' || partial === 'advice') {
        const adviceData = generateAdviceData(alerts, currency);
        const adviceHtml = await container.renderToString(BudgetAdviceBannerPartial, {
          props: { adviceData },
        });
        htmlParts.push(`<!-- PARTIAL:advice -->\n${adviceHtml}`);
      }

      return render.html(htmlParts.join('\n\n'));
    }

    // Default: JSON response
    return render.json(budgetData);
  } catch (error) {
    // Error handling...
  }
};
```

---

### Phase 3: Create API Client

```typescript
// src/lib/api/budgetApiClient.ts
/**
 * Budget API Client
 *
 * Client-side API functions for fetching budget data.
 * Supports both JSON and HTML response formats.
 */

export interface FetchBudgetHtmlResponse {
  html: string;
  partials: {
    summary?: string;
    cards?: string;
    advice?: string;
  };
}

export interface BudgetFetchOptions {
  partial?: 'summary' | 'cards' | 'advice' | 'all';
  currency?: 'IDR' | 'USD';
}

let activeController: AbortController | null = null;

export function cancelPendingRequest(): void {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

function parseHtmlPartials(html: string): FetchBudgetHtmlResponse['partials'] {
  const partials: FetchBudgetHtmlResponse['partials'] = {};

  const summaryMatch = html.match(/<!-- PARTIAL:summary -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  const cardsMatch = html.match(/<!-- PARTIAL:cards -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  const adviceMatch = html.match(/<!-- PARTIAL:advice -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);

  if (summaryMatch) partials.summary = summaryMatch[1].trim();
  if (cardsMatch) partials.cards = cardsMatch[1].trim();
  if (adviceMatch) partials.advice = adviceMatch[1].trim();

  return partials;
}

export async function fetchBudgetOverviewHtml(
  year: number,
  month: number,
  options: BudgetFetchOptions = {}
): Promise<FetchBudgetHtmlResponse> {
  cancelPendingRequest();
  activeController = new AbortController();

  const params = new URLSearchParams();
  params.set('year', year.toString());
  params.set('month', month.toString());
  params.set('_render', 'html');
  params.set('_partial', options.partial || 'all');
  if (options.currency) params.set('currency', options.currency);

  const url = `/api/budget/overview?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      signal: activeController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const html = await response.text();
    activeController = null;

    return {
      html,
      partials: parseHtmlPartials(html),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { html: '', partials: {} };
    }
    activeController = null;
    throw error;
  }
}
```

---

### Phase 4: Create Client-Side Modules

#### BudgetRenderer.client.ts

```typescript
// src/components/organisms/BudgetRenderer.client.ts
/**
 * Budget Renderer
 *
 * Handles HTML injection and animations for budget page sections.
 */
import { animate } from 'motion';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function announceToScreenReader(message: string): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}

export function renderSummaryHtml(html: string): void {
  const container = document.getElementById('budget-summary-container');
  if (!container) return;

  container.innerHTML = html;

  if (!prefersReducedMotion()) {
    animate(container, { opacity: [0, 1] }, { duration: 0.3 });
  }

  announceToScreenReader('Budget summary updated');
}

export function renderCardsHtml(html: string): void {
  const container = document.getElementById('budget-cards-container');
  if (!container) return;

  container.innerHTML = html;

  if (!prefersReducedMotion()) {
    const cards = container.querySelectorAll('[data-budget-card]');
    cards.forEach((card, i) => {
      animate(card, { opacity: [0, 1], y: [10, 0] }, { delay: i * 0.05, duration: 0.3 });
    });
  }

  announceToScreenReader(
    `${container.querySelectorAll('[data-budget-card]').length} budget cards loaded`
  );
}

export function renderAdviceHtml(html: string): void {
  const container = document.getElementById('budget-advice-container');
  if (!container) return;

  container.innerHTML = html;

  if (!prefersReducedMotion() && html.trim()) {
    animate(container, { opacity: [0, 1], x: [-20, 0] }, { duration: 0.4 });
  }
}
```

#### BudgetPage.client.ts

```typescript
// src/components/organisms/BudgetPage.client.ts
/**
 * Budget Page Orchestrator
 *
 * Coordinates fetching, rendering, and event handling for the budget page.
 */
import { fetchBudgetOverviewHtml, cancelPendingRequest } from '@/lib/api/budgetApiClient';
import { renderSummaryHtml, renderCardsHtml, renderAdviceHtml } from './BudgetRenderer.client';

interface PageState {
  year: number;
  month: number;
  currency: 'IDR' | 'USD';
}

let state: PageState | null = null;

function getPageState(): PageState | null {
  const container = document.querySelector('[data-budget-page]');
  if (!container) return null;

  return {
    year: parseInt(container.getAttribute('data-year') || '0', 10),
    month: parseInt(container.getAttribute('data-month') || '0', 10),
    currency: (container.getAttribute('data-currency') as 'IDR' | 'USD') || 'IDR',
  };
}

export async function refreshBudgetData(): Promise<void> {
  if (!state) return;

  try {
    const response = await fetchBudgetOverviewHtml(state.year, state.month, {
      partial: 'all',
      currency: state.currency,
    });

    if (response.partials.summary) renderSummaryHtml(response.partials.summary);
    if (response.partials.cards) renderCardsHtml(response.partials.cards);
    if (response.partials.advice) renderAdviceHtml(response.partials.advice);
  } catch (error) {
    console.error('Failed to refresh budget data:', error);
  }
}

async function handleBudgetUpdated(event: CustomEvent): Promise<void> {
  // Refresh the entire budget view to ensure consistency
  await refreshBudgetData();
}

function handleBudgetsCopied(event: CustomEvent): void {
  const { targetMonth, targetYear, copiedCount } = event.detail;

  if (copiedCount > 0 && state) {
    const params = new URLSearchParams();
    params.set('year', targetYear.toString());
    params.set('month', targetMonth.toString());
    params.set('currency', state.currency);
    window.location.href = `/budget?${params.toString()}`;
  }
}

export function initBudgetPage(): void {
  state = getPageState();
  if (!state) return;

  document.addEventListener('budget-updated', handleBudgetUpdated as EventListener);
  document.addEventListener('budgets-copied', handleBudgetsCopied as EventListener);
}

export function cleanup(): void {
  cancelPendingRequest();
  document.removeEventListener('budget-updated', handleBudgetUpdated as EventListener);
  document.removeEventListener('budgets-copied', handleBudgetsCopied as EventListener);
  state = null;
}
```

---

### Phase 5: Update Budget Page

Update `src/pages/budget/index.astro` to use the new architecture.

**Key changes:**

1. Import and use partial components for initial render
2. Add container elements with IDs for HTML injection
3. Add data attributes for page state
4. Replace inline script with client module imports
5. Remove duplicated client-side utility functions

```astro
---
// ... existing imports and data fetching ...

import BudgetSummaryPartial from '@components/partials/BudgetSummaryPartial.astro';
import BudgetCardGridPartial from '@components/partials/BudgetCardGridPartial.astro';
import BudgetAdviceBannerPartial from '@components/partials/BudgetAdviceBannerPartial.astro';
---

<ProtectedLayout title={`Budget - ${currentMonthName} ${selectedYear}`} currentPath={currentPath}>
  <div
    class="max-w-7xl mx-auto sm:px-2 lg:px-6 space-y-6 sm:space-y-8"
    data-budget-page
    data-year={selectedYear}
    data-month={selectedMonth}
    data-currency={selectedCurrency}
  >
    <BudgetPageHeader ... />

    {
      error ? (
        <div class="alert alert-error" role="alert">
          ...
        </div>
      ) : (
        <>
          <div id="budget-summary-container">
            <BudgetSummaryPartial
              totalAllocated={parseFloat(budgetData.total_budget || '0')}
              totalSpent={parseFloat(budgetData.total_spent || '0')}
              distribution={allocationDistribution}
              currency={selectedCurrency}
            />
          </div>

          <div id="budget-cards-container">
            <BudgetCardGridPartial
              budgets={budgetData?.categories || []}
              currency={selectedCurrency}
            />
          </div>

          <div id="budget-advice-container">
            <BudgetAdviceBannerPartial adviceData={adviceData} />
          </div>
        </>
      )
    }
  </div>

  <SetNewBudgetModal ... />
  <CopyBudgetModal ... />
</ProtectedLayout>

<script>
  import { initBudgetPage, cleanup } from '@components/organisms/BudgetPage.client';

  // Initialize
  initBudgetPage();

  // Cleanup on page transitions
  document.addEventListener('astro:before-swap', cleanup, { once: true });

  // Re-initialize on Astro page load
  document.addEventListener('astro:page-load', initBudgetPage);
</script>
```

---

### Phase 6: Replace AI Rebalancer Modal

Update `BudgetActions.astro` to use the `Modal` component.

```astro
---
import Modal from '@components/molecules/Modal.astro';
import { Sparkles, History, Plus, Copy, Tags } from '@lucide/astro';
// ... rest of imports and props ...
---

{/* ... existing buttons ... */}

{/* AI Rebalancer Modal - Using Modal Component */}
{
  showAiRebalancer && (
    <Modal
      id="ai-rebalancer-modal"
      title="AI Rebalancer"
      size="sm"
      closable={true}
      backdropClose={true}
    >
      <div class="text-center">
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Sparkles size={32} class="text-accent" aria-hidden="true" />
          </div>
        </div>
        <p class="text-base-content/70 mb-4">
          Smart budget optimization powered by AI is coming soon. This feature will analyze your
          spending patterns and suggest optimal budget allocations.
        </p>
        <div class="badge badge-accent badge-outline">Coming Soon</div>
      </div>
      <div slot="actions" class="modal-action justify-center">
        <form method="dialog">
          <button class="btn btn-ghost rounded-xl">Close</button>
        </form>
      </div>
    </Modal>
  )
}
```

---

## Quality Gates

Quality gates are run at checkpoints throughout the implementation:

| Checkpoint | After Tasks                   | Validation                                         |
| ---------- | ----------------------------- | -------------------------------------------------- |
| 1          | Partial components created    | lint, stylelint, format, typecheck                 |
| 2          | API endpoint + client updated | lint, stylelint, format, typecheck, API testing    |
| 3          | Client modules created        | lint, stylelint, format, typecheck                 |
| 4          | Page integration complete     | lint, stylelint, format, typecheck, manual testing |
| 5          | Final cleanup                 | All quality gates + OpenAPI validation             |

### Quality Gate Commands

```bash
# Run all quality gates
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck

# Check for bun: imports in shared code
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"

# Validate OpenAPI (after updating)
npx @redocly/cli lint openapi.yml
```

### Manual Testing Checklist

- [ ] Budget page loads correctly with server-rendered content
- [ ] Month navigation updates content dynamically
- [ ] Budget cards display with correct data and styling
- [ ] Edit budget button opens modal with pre-filled data
- [ ] Budget updates reflect immediately in UI without full page reload
- [ ] Copy budgets to next month works correctly
- [ ] AI Rebalancer modal opens with smooth animations
- [ ] Modal backdrop click closes modal
- [ ] Keyboard navigation (Tab, Esc) works for modal
- [ ] Mobile responsive layout renders correctly
- [ ] Screen reader announcements work for dynamic updates

---

## Benefits of This Refactor

| Aspect               | Before                              | After                              |
| -------------------- | ----------------------------------- | ---------------------------------- |
| **Code Duplication** | Formatting logic in server + client | Single source of truth (server)    |
| **Maintainability**  | Update both SSR and client code     | Update once in partials            |
| **Bundle Size**      | ~250 lines inline JS                | Smaller, tree-shakeable modules    |
| **Consistency**      | Can drift between SSR/client        | Always consistent                  |
| **Testing**          | Test both render paths              | Test one component                 |
| **Modal UX**         | Basic dialog                        | Premium animations + accessibility |

---

## OpenAPI Documentation Updates

After implementation, update `openapi/paths/budget.yml`:

```yaml
/api/budget/overview:
  get:
    summary: Get budget overview
    parameters:
      - name: year
        in: query
        schema:
          type: integer
      - name: month
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 12
      - name: currency
        in: query
        schema:
          type: string
          enum: [IDR, USD]
      - name: _render
        in: query
        schema:
          type: string
          enum: [json, html]
          default: json
        description: Response format
      - name: _partial
        in: query
        schema:
          type: string
          enum: [summary, cards, advice, all]
          default: all
        description: Which partial(s) to render (only when _render=html)
    responses:
      '200':
        description: Budget overview
        content:
          application/json:
            schema:
              $ref: '../schemas/BudgetOverviewResponse.yml'
          text/html:
            schema:
              type: string
              description: Server-rendered HTML fragments with PARTIAL markers
```

---

## Success Criteria

1. **Architecture compliance**: Page follows Interactive Page Architecture pattern
2. **No code duplication**: All formatting/rendering happens server-side
3. **Modal component usage**: AI Rebalancer uses reusable Modal with animations
4. **Quality gates pass**: All lint, stylelint, format, and typecheck pass
5. **Accessibility**: Screen reader announcements for dynamic updates
6. **Performance**: No regression in page load or interaction responsiveness
7. **Mobile support**: Responsive layout works on all breakpoints

---

## References

- `docs/architecture/002-interactive-pages.md` - Interactive Page Architecture
- `src/components/molecules/Modal.astro` - Modal component
- `src/lib/api/transactionsApiClient.ts` - Reference API client implementation
- `src/components/organisms/TransactionsRenderer.client.ts` - Reference renderer
- `src/components/organisms/TransactionsPage.client.ts` - Reference orchestrator
- `docs/constitution.md` - Development Constitution
- `design-system/START.md` - Design System Guidelines

---

**Next Steps**: Review this plan and begin Phase 1 implementation with partial components.
