# Service Layer Architecture

## Core Philosophy

The service layer is **interface-agnostic business logic**. Same services power REST API, CLI, MCP server, and any future interfaces (GraphQL, WebSocket, queue workers).

## Key Patterns

### 1. Dependency Injection (DI)

Services receive `db: IDatabase` via constructor, never import it directly:

```typescript
export class CategoryService {
  constructor(private db: IDatabase) {
    this.crud = createCrudService(db, config);
  }
}
```

**Why:** Testability - inject mock DB in tests, real DB in production.

### 2. Factory Pattern

Three base factories eliminate boilerplate:

| Factory                | Purpose                | Location                |
| ---------------------- | ---------------------- | ----------------------- |
| `createCrudService()`  | Generic CRUD ops       | `base/crud.factory.ts`  |
| `createMetaService()`  | Key-value meta storage | `base/meta.factory.ts`  |
| `createTokenService()` | Token generation       | `base/token.factory.ts` |

### 3. Singleton Exports (Production)

```typescript
// src/services/index.ts
export const categoryService = new CategoryService(db);
```

Used by: REST API, quick scripts

### 4. Fresh Instances (CLI/Tests)

```typescript
// CLI commands
async createService() {
  const [{ db }, { CategoryService }] = await Promise.all([
    import('@/db'),
    import('@/services/category.service'),
  ]);
  return new CategoryService(db);
}
```

Used by: CLI commands, unit tests

### 5. Error Hierarchy

All service errors extend `ServiceError` with typed codes:

```typescript
ServiceError (base)
├── CategoryServiceError
├── TransactionServiceError
├── AccountServiceError
└── ...
```

**Why:** Type-safe error handling; API maps to HTTP codes, CLI shows friendly messages.

### 6. Cross-Cutting Concerns

- **Caching:** `cacheOrFetch()`, `invalidateTags()` with TTL and tags
- **Performance:** `trackQuery()` for query timing
- **Validation:** Valibot schemas (outside services)
- **Security:** Workspace-scoped queries built-in

## Interface Usage

### REST API

```typescript
import { categoryService } from '@/services'; // Singleton
const categories = await categoryService.findAll(workspaceId, filters);
```

### CLI

```typescript
const service = await deps.createService(); // Fresh DI instance
const result = await service.create(input);
```

### MCP Server

```typescript
const accounts = await ctx.services.account.findAll(workspaceId); // From context
```

## Creating New Services

1. **Class-based with DI:**

```typescript
export class NewService {
  constructor(private db: IDatabase) {}
  async findById(id: string, workspaceId: string) { ... }
}
```

2. **Add to index.ts:**

```typescript
export class NewService { ... }
export const newService = new NewService(db);
```

3. **Create service-specific errors:**

```typescript
export class NewServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string) {
    super(code, message);
    this.name = 'NewServiceError';
  }
}
```

4. **Add error codes to ServiceErrorCode enum**

## Testing

Always inject mock database:

```typescript
import { NewService } from '@/services/new.service';
const mockDb = createMockDatabase();
const service = new NewService(mockDb);
```

## Key Files

- `src/services/index.ts` - All exports and singletons
- `src/services/service-errors.ts` - Error classes and codes
- `src/services/base/*.factory.ts` - Base factories
- `src/services/__tests__/` - Service tests (all use DI)

## Reference

**For full architecture details, rationale, and integration examples:**
📄 `docs/architecture/014-service-layer-architecture.md` (ADR)
