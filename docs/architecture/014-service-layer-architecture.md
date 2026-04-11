# ADR 014: Service Layer Architecture

**Status:** Accepted  
**Date:** 2026-04-11  
**Deciders:** Ivan

## Context

Allowealth needs business logic that works across multiple interfaces:

- REST API (Astro endpoints)
- CLI commands (citty)
- MCP server (Model Context Protocol)
- Future: GraphQL, WebSocket, queue workers

The challenge: avoid duplicating business logic while keeping each interface thin and focused on its responsibility.

## Decision

Implement a **service layer** with these characteristics:

1. **Framework-agnostic** - No HTTP, CLI, or MCP dependencies
2. **Dependency injection** - Database injected via constructor
3. **Factory composition** - Common patterns via factories
4. **Typed errors** - Domain-specific error hierarchy
5. **Cross-cutting concerns** - Caching, performance, validation outside services

## Architecture

### Service Structure

```
src/services/
├── index.ts              # Singleton exports and types
├── service-errors.ts     # Error hierarchy
├── base/
│   ├── crud.factory.ts   # Generic CRUD operations
│   ├── meta.factory.ts   # Key-value meta storage
│   └── token.factory.ts  # Token generation
├── category.service.ts   # Domain service example
└── __tests__/            # All tests use DI
```

### Key Patterns

#### 1. Dependency Injection

Services never import the database directly. It is injected via constructor:

```typescript
// src/services/category.service.ts
export class CategoryService {
  constructor(private db: IDatabase) {
    this.crud = createCrudService(db, config);
  }
}
```

**Benefits:**

- Testability: Inject mock database in unit tests
- Flexibility: Same service works with SQLite (dev) and D1 (prod)
- No hidden dependencies: All dependencies are explicit

#### 2. Factory Pattern

Three factories eliminate repetitive CRUD boilerplate:

| Factory                | Purpose           | Example Use                           |
| ---------------------- | ----------------- | ------------------------------------- |
| `createCrudService()`  | Standard CRUD     | CategoryService, AccountService       |
| `createMetaService()`  | Key-value storage | UserMetaService, WorkspaceMetaService |
| `createTokenService()` | Token lifecycle   | Email verification, password reset    |

Factories are configured per-entity:

```typescript
this.crud = createCrudService<any, any, any>(db, {
  getTable: () => getActiveSchema().categories,
  getQuery: () => db.query.categories,
  getId: () => getActiveSchema().categories.id,
  getWorkspaceId: () => getActiveSchema().categories.workspace_id,
});
```

#### 3. Dual Usage Patterns

**Singleton (Production):**

```typescript
// src/services/index.ts
export const categoryService = new CategoryService(db);

// REST API usage
import { categoryService } from '@/services';
```

**Fresh Instances (CLI/Tests):**

```typescript
// CLI command
async createService() {
  const [{ db }, { CategoryService }] = await Promise.all([
    import('@/db'),
    import('@/services/category.service'),
  ]);
  return new CategoryService(db);
}

// Unit test
const mockDb = createMockDatabase();
const service = new CategoryService(mockDb);
```

#### 4. Error Hierarchy

All service errors extend a base class with typed codes:

```typescript
// src/services/service-errors.ts
export enum ServiceErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  // ... domain-specific codes
}

export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

export class CategoryServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string) {
    super(code, message);
    this.name = 'CategoryServiceError';
  }
}
```

**Benefits:**

- Type-safe error handling
- API layer maps to appropriate HTTP status codes
- CLI shows user-friendly error messages
- Tests can assert specific error types

#### 5. Cross-Cutting Concerns

Services focus on business logic. Supporting concerns are layered:

| Concern     | Implementation                       | Location            |
| ----------- | ------------------------------------ | ------------------- |
| Caching     | `cacheOrFetch()`, `invalidateTags()` | `@/lib/cache`       |
| Performance | `trackQuery()` timing                | `@/lib/perf`        |
| Validation  | Valibot schemas                      | `@/lib/validation`  |
| Security    | Workspace-scoped queries             | Built into services |

### Interface Integration

#### REST API (Astro)

```typescript
// src/pages/api/categories/index.ts
import { categoryService } from '@/services';

export const GET: APIRoute = async (context) => {
  const auth = getAuthenticatedUser(context);
  const perf = context.locals.perf;

  const categories = await categoryService.findAll(auth.workspaceId, filters, perf);

  return successResponse(categories);
};
```

#### CLI (citty)

```typescript
// src/cli/commands/categories.ts
export async function runCreate(args: Record<string, unknown>, deps: CategoriesDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const service = await deps.createService(); // Fresh instance

  const result = await service.create(mapCreatePayload(args));
  output.write(result);
}
```

#### MCP Server

```typescript
// apps/mcp/src/tools/accounts.ts
export async function handleListAccounts(_args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const accounts = await ctx.services.account.findAll(workspaceId);

  return {
    content: [{ type: 'text', text: JSON.stringify({ accounts }) }],
  };
}
```

## Consequences

### Positive

1. **Single source of truth** - Business logic exists in one place
2. **Testable** - Mock database injection enables fast unit tests
3. **Portable** - Same services work across all interfaces
4. **Maintainable** - Changes propagate to all consumers automatically
5. **Type-safe** - Full TypeScript coverage with typed errors
6. **Flexible** - Easy to add new interfaces (GraphQL, gRPC, etc.)

### Negative

1. **Learning curve** - Developers must understand DI and factory patterns
2. **Boilerplate** - Error classes and service exports add files
3. **Coupling** - Services must maintain backward compatibility for all interfaces

## Implementation Guidelines

### Creating a New Service

1. **Create service class with DI:**

```typescript
// src/services/new-feature.service.ts
import { type IDatabase, getActiveSchema } from '@/db';
import { NewFeatureServiceError, ServiceErrorCode } from './service-errors';

export class NewFeatureService {
  constructor(private db: IDatabase) {}

  async findById(id: string, workspaceId: string) {
    // Implementation
  }
}
```

2. **Export from index.ts:**

```typescript
// src/services/index.ts
export { NewFeatureService } from './new-feature.service';
export const newFeatureService = new NewFeatureService(db);
```

3. **Add error class:**

```typescript
// src/services/service-errors.ts
export class NewFeatureServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'NewFeatureServiceError';
  }
}
```

4. **Add error codes:**

```typescript
// src/services/service-errors.ts
export enum ServiceErrorCode {
  // ... existing codes
  NEW_FEATURE_NOT_FOUND = 'NEW_FEATURE_NOT_FOUND',
}
```

5. **Write tests with DI:**

```typescript
// src/services/__tests__/new-feature.test.ts
import { describe, it, expect } from 'bun:test';
import { NewFeatureService } from '@/services/new-feature.service';
import { createMockDatabase } from '@/tests/mocks/db';

describe('NewFeatureService', () => {
  it('should find by id', async () => {
    const db = createMockDatabase();
    const service = new NewFeatureService(db);

    const result = await service.findById('id', 'workspace');

    expect(result).toBeDefined();
  });
});
```

## Related Decisions

- ADR 006: Database Connection Architecture - Provides `IDatabase` interface
- ADR 008: Cache Abstraction - `cacheOrFetch()` integration
- ADR 010: MCP Server Architecture - Tool context with injected services

## References

- `src/services/index.ts` - Service exports
- `src/services/service-errors.ts` - Error hierarchy
- `src/services/base/*.factory.ts` - Base factories
- `src/cli/commands/` - CLI command examples
- `apps/mcp/src/tools/` - MCP tool examples
