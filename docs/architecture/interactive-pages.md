# Interactive Pages Architecture

This document describes the standard pattern for making pages interactive in this codebase. We use a **server-rendered HTML fragments** approach (similar to HTMX) instead of client-side DOM construction.

## Core Principle

> **Single Source of Truth**: All HTML rendering happens in Astro components. The client only injects pre-rendered HTML.

This eliminates duplication between server-side rendering (SSR) and client-side updates.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           SERVER (Astro)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ Page Component  │    │ Partial         │    │ API Endpoint   │  │
│  │ (SSR)           │    │ Components      │    │ (?_render=html)│  │
│  │                 │    │                 │    │                │  │
│  │ Uses partials   │───▶│ TransactionList │◀───│ Renders same   │  │
│  │ for initial     │    │ Partial.astro   │    │ partials for   │  │
│  │ render          │    │                 │    │ dynamic updates│  │
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
│  │ API Client      │    │ Renderer        │    │ Page           │  │
│  │                 │    │                 │    │ Orchestrator   │  │
│  │ fetchHtml()     │───▶│ injectHtml()    │◀───│                │  │
│  │ Returns HTML    │    │ Animations      │    │ Event handlers │  │
│  │ fragments       │    │ Accessibility   │    │ State mgmt     │  │
│  └─────────────────┘    └─────────────────┘    └────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Guide

### 1. Create Partial Components

Partials are Astro components that render **only** the dynamic content without page wrappers.

```
src/components/partials/
├── TransactionListPartial.astro
├── TransactionSummaryPartial.astro
└── PaginationPartial.astro
```

**Example: `TransactionListPartial.astro`**

```astro
---
import TransactionCard from '../molecules/TransactionCard.astro';
import type { TransactionOutput } from '@/lib/types/transaction';

export interface Props {
  transactions: TransactionOutput[];
  showActions?: boolean;
}

const { transactions, showActions = true } = Astro.props;
---

{
  transactions.length > 0 ? (
    transactions.map((tx) => <TransactionCard transaction={tx} showActions={showActions} />)
  ) : (
    <div class="empty-state">No transactions found</div>
  )
}
```

### 2. Add HTML Rendering to API Endpoint

Use the `_render=html` query parameter convention to return HTML instead of JSON.

**API Response Utility: `src/lib/api/renderResponse.ts`**

```typescript
import { createRenderHelper } from '@/lib/api/renderResponse';

export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  // Fetch data...
  const data = await fetchData();

  if (render.wantsHtml()) {
    // Use Astro Container API to render components
    const container = await AstroContainer.create();
    const html = await container.renderToString(MyPartial, {
      props: { data },
    });
    return render.html(html);
  }

  // Default: JSON response
  return render.json(data);
};
```

**Query Parameters:**

| Parameter   | Values                                 | Description                       |
| ----------- | -------------------------------------- | --------------------------------- |
| `_render`   | `html`, `json`                         | Response format (default: `json`) |
| `_partial`  | `list`, `summary`, `pagination`, `all` | Which partial(s) to render        |
| `_currency` | `IDR`, `USD`                           | Currency for formatting           |

### 3. Create API Client Functions

Add HTML-specific fetch functions to the API client.

**Example: `src/lib/api/transactionsApiClient.ts`**

```typescript
export interface FetchHtmlResponse {
  html: string;
  partials: {
    list?: string;
    summary?: string;
    pagination?: string;
  };
}

export async function fetchTransactionsHtml(
  filters: Filters,
  options: { partial?: string; currency?: string }
): Promise<FetchHtmlResponse> {
  const params = new URLSearchParams();
  params.set('_render', 'html');
  params.set('_partial', options.partial || 'all');

  const response = await fetch(`/api/transactions?${params}`);
  const html = await response.text();

  return {
    html,
    partials: parseHtmlPartials(html),
  };
}
```

### 4. Create Renderer Functions

Simple functions that inject HTML and handle animations.

**Example: `src/components/organisms/MyRenderer.client.ts`**

```typescript
import { animate } from 'motion';

export function renderListHtml(html: string): void {
  const container = document.getElementById('list-container');
  if (!container) return;

  // Inject HTML
  container.innerHTML = html;

  // Animate items
  const items = container.querySelectorAll('[data-item]');
  items.forEach((item, i) => {
    animate(item, { opacity: [0, 1], y: [10, 0] }, { delay: i * 0.05 });
  });

  // Accessibility announcement
  announceToScreenReader(`Showing ${items.length} items`);
}
```

### 5. Wire Up Page Orchestrator

The orchestrator handles events and coordinates fetching/rendering.

**Example: `src/components/organisms/MyPage.client.ts`**

```typescript
async function fetchAndRender(): Promise<void> {
  showLoadingState();

  try {
    const response = await fetchTransactionsHtml(filters, {
      partial: 'all',
      currency: state.currency,
    });

    hideLoadingState();

    if (response.partials.list) {
      renderListHtml(response.partials.list);
    }
    if (response.partials.pagination) {
      renderPaginationHtml(response.partials.pagination);
      reattachPaginationListeners();
    }
  } catch (error) {
    hideLoadingState();
    showError(error.message);
  }
}
```

## File Structure Convention

```
src/
├── components/
│   ├── partials/                    # Server-rendered fragments
│   │   ├── TransactionListPartial.astro
│   │   ├── TransactionSummaryPartial.astro
│   │   └── PaginationPartial.astro
│   │
│   └── organisms/
│       ├── TransactionsRenderer.client.ts   # HTML injection + animations
│       └── TransactionsPage.client.ts       # Event handling + orchestration
│
├── lib/
│   └── api/
│       ├── renderResponse.ts        # _render param utility
│       └── transactionsApiClient.ts # Fetch functions (JSON + HTML)
│
└── pages/
    └── api/
        └── transactions/
            └── index.ts             # Supports both JSON and HTML responses
```

## Partial Comment Markers

When returning multiple partials, use comment markers to separate them:

```html
<!-- PARTIAL:summary -->
<div id="summary-cards-container">...</div>

<!-- PARTIAL:list -->
<article data-transaction-card>...</article>
<article data-transaction-card>...</article>

<!-- PARTIAL:pagination -->
<div id="pagination-container">...</div>
```

Parse them on the client:

```typescript
function parseHtmlPartials(html: string) {
  const partials = {};
  const summaryMatch = html.match(/<!-- PARTIAL:summary -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  if (summaryMatch) partials.summary = summaryMatch[1].trim();
  // ... parse other partials
  return partials;
}
```

## Benefits

| Aspect          | Old Approach (DOM Construction) | New Approach (HTML Injection) |
| --------------- | ------------------------------- | ----------------------------- |
| **Duplication** | Component logic in 2 places     | Single source of truth        |
| **Maintenance** | Update server AND client        | Update once                   |
| **Bundle size** | Large (DOM construction code)   | Small (just injection)        |
| **Consistency** | Can drift between SSR/client    | Always consistent             |
| **Testing**     | Test both render paths          | Test one component            |

## Anti-Patterns to Avoid

### DON'T: Construct DOM manually on the client

```typescript
// ❌ BAD - Duplicates server component logic
function createTransactionRow(tx) {
  const article = document.createElement('article');
  article.className = 'group p-3 sm:p-4...';
  // 200+ lines of DOM construction...
}
```

### DO: Inject server-rendered HTML

```typescript
// ✅ GOOD - Single source of truth
function renderTransactionListHtml(html: string) {
  document.getElementById('list').innerHTML = html;
}
```

### DON'T: Duplicate formatting logic

```typescript
// ❌ BAD - Duplicates server-side formatting
function formatDate(date) { ... }
function formatCurrency(amount) { ... }
function getCategoryIcon(name) { ... }
```

### DO: Let the server handle formatting

```typescript
// ✅ GOOD - Server handles all formatting
// Just inject the pre-formatted HTML
container.innerHTML = serverRenderedHtml;
```

## Migration Checklist

When converting a page to this architecture:

- [ ] Create partial components for each dynamic section
- [ ] Add `_render=html` support to the API endpoint
- [ ] Add HTML fetch function to API client
- [ ] Create simple HTML injection renderer
- [ ] Update page orchestrator to use HTML rendering
- [ ] Remove old DOM construction code
- [ ] Test SSR and client updates render identically
- [ ] Verify animations and accessibility work

## Related Files

- `src/lib/api/renderResponse.ts` - Response format utility
- `src/components/partials/` - Partial components directory
- `src/pages/api/transactions/index.ts` - Reference implementation
- `src/components/organisms/TransactionsRenderer.client.ts` - Reference renderer
- `src/components/organisms/TransactionsPage.client.ts` - Reference orchestrator
