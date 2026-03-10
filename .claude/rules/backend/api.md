---
paths:
  - 'src/pages/api/**/*.ts'
  - 'openapi/**/*.yaml'
---

# API Patterns

## OpenAPI Documentation

**Update `openapi/` files when modifying API endpoints.**

```bash
openapi/
├── README.md              # Documentation structure
├── openapi.yaml           # Main entry point
├── paths/                 # Endpoint definitions
│   ├── budgets.yaml
│   └── transactions.yaml
└── components/
    ├── schemas/           # Data models
    └── responses/         # Response templates
```

**Rules:**

- ✅ **Update OpenAPI files when modifying API endpoints** - keep docs in sync
- ❌ **Use comments only** - OpenAPI provides structured, machine-readable docs

See `openapi/README.md` for full structure.

## Endpoint Naming

```bash
# ✅ Correct: No underscore prefix
src/pages/api/budgets.ts       → /api/budgets
src/pages/api/budgets/[id].ts  → /api/budgets/:id

# ❌ Wrong: Underscore prefix
src/pages/api/_budgets.ts      → 404 (Astro treats as private)
src/pages/api/_internal.ts     → 404
```

**Rules:**

- ❌ **Name Astro API endpoints with `_` prefix** - Astro treats `_`-prefixed files as private, silently 404s

## HTML Rendering Mode

Server-rendered HTML fragments for interactive updates.

```typescript
// API endpoint
export async function GET({ url, locals }) {
  const renderHtml = url.searchParams.get('_render') === 'html';

  if (renderHtml) {
    // Return pre-rendered HTML
    const html = await render(BudgetCard, { budget });
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Return JSON
  return new Response(JSON.stringify({ budget }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**Pattern**: Use `?_render=html` query parameter to return server-rendered HTML instead of JSON.

See `docs/architecture/002-interactive-pages.md` for full details.

## Authentication

```typescript
import { requireAuth } from '@/middleware/auth';

export async function GET({ locals }) {
  // User is guaranteed to exist (middleware redirects if not)
  const user = locals.user!;

  const budgets = await budgetService.getUserBudgets(user.id);
  return new Response(JSON.stringify({ budgets }));
}
```

**Rules:**

- ✅ **Use `locals.user` from middleware** - already authenticated
- ✅ **Add auth checks in service layer** - defense in depth

See `docs/architecture/003-api-authentication.md` for full details.

## Error Handling

```typescript
// ✅ Correct: Surface actual error messages
try {
  const budget = await budgetService.create(data);
  return new Response(JSON.stringify({ budget }), { status: 201 });
} catch (error) {
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to create budget',
    }),
    { status: 500 }
  );
}

// ❌ Wrong: Generic error
return new Response(JSON.stringify({ error: 'Failed to create budget' }), {
  status: 500,
});
```

**Rules:**

- ✅ **Surface actual error messages in API responses** - not generic "Failed to X"

## Request Validation

Use `validateBody()` from `src/lib/api-utils.ts` with a Valibot schema. This parses the request body and returns a normalized `{ path, message, code }` issue shape on failure.

```typescript
import * as v from 'valibot';
import { validateBody, isValidationError, errorResponse } from '@/lib/api-utils';

const createBudgetSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  amount: v.pipe(v.number(), v.minValue(0)),
  currency: v.picklist(['IDR', 'USD']),
});

export async function POST({ request, locals }) {
  const validation = await validateBody(request, createBudgetSchema);
  if (isValidationError(validation)) {
    return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
  }

  const budget = await budgetService.create(validation.data);
  return new Response(JSON.stringify({ budget }), { status: 201 });
}
```

**Rules:**

- ✅ **Validate inputs at system boundaries** (user input, external APIs)
- ✅ **Use Valibot for request validation** — import from `valibot`, never from `zod`
- ✅ **Use `validateBody()` from `@/lib/api-utils`** — normalizes errors into repo-owned `{ path, message, code }` shape
- ❌ **Import from `zod`** — Zod has been removed; use Valibot everywhere

## CSRF Protection

```typescript
import { verifyCsrfToken } from '@/lib/csrf';

export async function POST({ request, locals, cookies }) {
  const token = request.headers.get('X-CSRF-Token');
  if (!verifyCsrfToken(token, cookies)) {
    return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
      status: 403,
    });
  }

  // Process request...
}
```

## Response Formats

### JSON Response

```typescript
return new Response(JSON.stringify({ data }), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### HTML Fragment Response

```typescript
const html = await render(Component, { props });
return new Response(html, {
  status: 200,
  headers: {
    'Content-Type': 'text/html',
  },
});
```

### Error Response

```typescript
return new Response(
  JSON.stringify({
    error: 'Budget not found',
    code: 'BUDGET_NOT_FOUND',
  }),
  {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  }
);
```

## REST Conventions

```bash
GET    /api/budgets           # List budgets
POST   /api/budgets           # Create budget
GET    /api/budgets/:id       # Get budget
PUT    /api/budgets/:id       # Update budget
DELETE /api/budgets/:id       # Delete budget
```

## Query Parameters

```typescript
export async function GET({ url, locals }) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const currency = url.searchParams.get('currency') || 'IDR';

  // Validate
  if (page < 1 || limit < 1 || limit > 100) {
    return new Response(JSON.stringify({ error: 'Invalid pagination' }), {
      status: 400,
    });
  }

  const budgets = await budgetService.list(locals.user!.id, { page, limit, currency });
  return new Response(JSON.stringify({ budgets }));
}
```

## File Uploads

```typescript
export async function POST({ request, locals }) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
    });
  }

  // Validate file type
  if (!file.type.includes('csv')) {
    return new Response(JSON.stringify({ error: 'Invalid file type' }), {
      status: 400,
    });
  }

  // Process file...
  const content = await file.text();
  const result = await importService.importCSV(content, locals.user!.id);

  return new Response(JSON.stringify({ result }), { status: 200 });
}
```

## Pagination

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function GET({ url, locals }) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  const { data, total } = await service.list(locals.user!.id, { page, limit });

  return new Response(
    JSON.stringify({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }),
    { status: 200 }
  );
}
```

## Common Patterns

### Service Layer

```typescript
// API route
export async function POST({ request, locals }) {
  const data = await request.json();

  // Validate
  const validation = await validateBody(request, schema);
  if (isValidationError(validation)) {
    return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
  }

  // Call service
  const budget = await budgetService.create(validation.data, locals.user!.id);

  return new Response(JSON.stringify({ budget }), { status: 201 });
}
```

### Conditional Rendering

```typescript
export async function GET({ url, locals }) {
  const renderHtml = url.searchParams.get('_render') === 'html';
  const budget = await budgetService.get(id, locals.user!.id);

  if (renderHtml) {
    const html = await render(BudgetCard, { budget });
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new Response(JSON.stringify({ budget }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```
