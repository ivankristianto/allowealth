# ADR 001: Toast Notification Architecture

## Status

Accepted

## Context

The codebase standardizes on a single toast notification implementation:

- `ToastContainer.astro` - Client-side implementation with Nano Stores

The previous `Toast.astro` component was unused and removed to avoid duplicated patterns.

## Decision

**Standardize on ToastContainer only and remove Toast.astro.**

### Implementation Summary

#### ToastContainer.astro

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

## Consequences

### Positive

- Single, consistent toast implementation across the app
- ToastContainer provides sophisticated features for production use

### Negative

- Loss of the declarative, SSR-only toast variant

### Mitigations

- Shared animation config (`@/lib/animations/toast.ts`) ensures consistency
- ToastContainer remains documented as the primary implementation in AGENTS.md

## Future Considerations

- Monitor toast UX and performance as usage grows

## References

- ToastContainer.astro: src/components/molecules/ToastContainer.astro
- toastStore.ts: src/lib/stores/toastStore.ts
- AGENTS.md: Toast notification guidelines
