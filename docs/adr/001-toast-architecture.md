# ADR 001: Toast Notification Architecture

## Status

Accepted

## Context

The codebase contains two separate toast notification implementations:

- `Toast.astro` - Server-side renderable Astro component
- `ToastContainer.astro` - Client-side implementation with Nano Stores

This duplication created confusion about which implementation to use and potential state management inconsistencies.

## Decision

**Retain both implementations with clearly documented use cases.**

### Implementation Summary

#### ToastContainer.astro (Primary/Recommended)

Client-side toast system using Nano Stores for global state management.

**Usage:**

```typescript
import { addToast } from '@/lib/stores/toastStore';
addToast('Changes saved!', 'success');
```

**Features:**

- Global state management via Nano Stores
- Aria-live regions for screen reader announcements (polite/assertive)
- Focus restoration on manual dismiss
- Timeout management with race condition handling
- Dynamic DOM creation and reconciliation
- Auto-included in BaseLayout.astro

**Use Cases:**

- User action feedback (form submissions, API responses)
- App-wide notifications from any client-side script
- When state needs to persist across page navigations

#### Toast.astro (Alternative/Declarative)

Server-side renderable Astro component with local state management.

**Usage:**

```astro
<Toast id="welcome-toast" message="Welcome!" type="info" duration={5000} />
```

**Features:**

- Server-side rendering
- Self-contained animation and dismiss logic
- Component-based declarative usage
- No external state dependency

**Use Cases:**

- Static notification messages rendered at page load
- Declarative template usage
- Server-rendered pages without client-side initialization
- Testing and storybook demonstrations

## Consequences

### Positive

- Both implementations serve valid but different use cases
- ToastContainer provides sophisticated features for production use
- Toast.astro enables SSR and declarative patterns
- No breaking changes required

### Negative

- Potential confusion about which to use
- Maintenance burden for two implementations
- Animation config must be kept in sync (addressed by shared config)

### Mitigations

- Documentation clearly explains use cases
- Shared animation config (`@/lib/animations/toast.ts`) ensures consistency
- ToastContainer is documented as primary implementation in AGENTS.md

## Future Considerations

- Consider integrating Toast.astro with toastStore for state consistency
- Evaluate deprecating Toast.astro if usage is minimal
- Monitor for state synchronization issues between implementations

## References

- Toast.astro: src/components/molecules/Toast.astro
- ToastContainer.astro: src/components/molecules/ToastContainer.astro
- toastStore.ts: src/lib/stores/toastStore.ts
- AGENTS.md: Toast notification guidelines
