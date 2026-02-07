# ADR 009: Logger Abstraction Layer

## Status

Accepted

## Context

The application previously relied on ad-hoc `console.log`, `console.warn`, and `console.error` calls for server-side logging. This approach has several drawbacks:

1. **Lack of Structure**: Logs are plain text, making them difficult to parse and query in production environments like Cloudflare Workers.
2. **Inconsistent Tagging**: Prefixes like `[ServiceName]` were manually added, leading to inconsistencies.
3. **Environment Differences**: Pretty-printing in development and structured logging in production required manual logic across the codebase.
4. **Visibility**: Cloudflare Workers Logs provide better observability when logs are structured as JSON and use proper severity levels.

## Decision

Implement a structured Logger Abstraction Layer using `consola` to provide consistent, leveled, and tagged logging across all server-side modules.

### 1. Architecture Components

- **Logger Module (`src/lib/logger.ts`)**: A thin wrapper around `consola/core`.
- **JSON Reporter**: Production reporter that outputs structured JSON. Cloudflare Workers auto-indexes these JSON fields for easy querying.
- **Pretty Reporter**: Development reporter that outputs human-readable, bracket-prefixed logs (e.g., `[database] connection established`).
- **Tagged Loggers**: Each module/service creates its own logger via `createLogger(tag)`, ensuring all logs from that module are consistently tagged.

### 2. Implementation Pattern

Services and middleware should instantiate a logger with a specific tag:

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('database');

// Usage
log.info('connection established');
log.warn('query taking longer than expected');
log.error('connection failed', error);
```

### 3. Log Levels

- **info**: General operational information (e.g., service start, connection established).
- **warn**: Non-critical issues that don't stop the application but should be investigated.
- **error**: Critical issues that require immediate attention (e.g., database connection failure, auth error).
- **debug**: Detailed information for troubleshooting, typically disabled in production.

### 4. Integration with Cloudflare Workers

The logger routes JSON output to the appropriate `console` method (`console.log`, `console.warn`, `console.error`) based on the log level. This ensures that Cloudflare Workers Logs correctly identifies and displays log severity.

## Consequences

### Positive

- **Observability**: Structured JSON logs allow for powerful querying and filtering in the Cloudflare dashboard.
- **Consistency**: All server-side logs follow the same format and tagging convention.
- **Developer Experience**: Pretty-printed logs in development maintain the familiar bracketed prefix style while providing cleaner output.
- **Maintainability**: Centralized logging logic makes it easy to change reporters or add transports (e.g., Sentry) in the future.

### Negative

- **Dependency**: Adds `consola` as a dependency.
- **Usage Requirement**: Developers must remember to use `createLogger` instead of `console.log`.

## Future Considerations

- Integration with external log aggregators (e.g., Axiom, Better Stack).
- Support for request-scoped trace IDs to correlate logs across a single request lifecycle.
- Global log level configuration via environment variables.

## References

- **Implementation**: `src/lib/logger.ts`
- **Design Document**: `docs/done/2026-02-04-logger-abstraction.md`
- **Library**: [Consola](https://github.com/unjs/consola)
