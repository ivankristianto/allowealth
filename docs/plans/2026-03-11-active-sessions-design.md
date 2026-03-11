# Active Sessions Design

**Issue:** Session management on Security page
**Date:** 2026-03-11
**Status:** Approved

## Goal

Allow authenticated users to view their active sessions across devices, see the full IP address and a simple device label for each session, revoke a specific non-current session, and revoke all other sessions at once.

## Decisions

| Question | Decision |
| --- | --- |
| Source of truth | Use Better Auth core session-management APIs |
| Current session revoke | Not allowed |
| Revoke all behavior | Revoke all other sessions, keep the current session |
| IP display | Show the full IP address |
| Device display | Show a simple browser + OS label derived from `userAgent` |
| Plugin choice | Do not use Better Auth `multi-session` plugin |

## Architecture

The feature lives on the existing security page at `src/pages/security.astro`. That page already composes account-linking, MFA, passkeys, and API key management, so active sessions belong in the same authenticated surface.

Better Auth remains the source of truth for session state. The app uses Better Auth's core session-management semantics:

- `listSessions` to load the user's active sessions
- `revokeSession` to revoke one specific session
- `revokeOtherSessions` to revoke every session except the current one

The application owns only a thin composition layer on top of those APIs. That layer normalizes Better Auth session records for UI use, marks the current session, derives a simple device label from the stored `userAgent`, and enforces the product rule that the current session cannot be revoked from the page.

## Data Flow

### Page Load

1. `src/pages/security.astro` asks an app-owned session service for the current user's active sessions.
2. The service calls Better Auth session-management APIs with the current authenticated request context.
3. The service maps each session into a UI-friendly shape.
4. The page renders an Active Sessions card with the current session first, followed by other sessions.

### Revoke One Session

1. The user clicks `Revoke` on a non-current session row.
2. A confirmation modal opens.
3. The client submits a request to an app-owned authenticated endpoint.
4. The endpoint validates ownership and current-session protection, then calls Better Auth `revokeSession`.
5. The UI refreshes the card contents and shows success feedback.

### Revoke All Other Sessions

1. The user clicks `Revoke all other sessions`.
2. A confirmation modal opens.
3. The client submits a request to an app-owned authenticated endpoint.
4. The endpoint calls Better Auth `revokeOtherSessions`.
5. The UI refreshes the list so that only the current session remains.

## UI Design

Add a new card to the security page titled `Active Sessions`.

Each session row should include:

- device label such as `Chrome on macOS`
- full IP address
- time metadata for orientation, such as last update time or creation time
- a clear `Current session` badge when the row matches the active request session
- a `Revoke` action only for non-current sessions

The card header should include a destructive action labeled `Revoke all other sessions`.

### Ordering

- Show the current session first.
- Show the remaining sessions after it, newest first.

### Empty State

If the user has no other active sessions, the card should still render and say that no other devices are signed in.

### Fallback Copy

If Better Auth session metadata is incomplete:

- device label: `Unknown device`
- IP address: `Unknown IP`

## Device Labeling

The app should derive a human-readable device label from `userAgent` at read time. The initial scope is intentionally simple:

- browser family
- operating system family

Examples:

- `Chrome on macOS`
- `Safari on iOS`
- `Firefox on Windows`

This should not introduce new persistent schema or a new audit table. It is presentation logic only.

## API Boundary

The app should expose small authenticated endpoints under the existing `/api/user/` namespace so the security page follows the same pattern as API keys and other security controls.

The endpoints should:

- require an authenticated session from middleware-backed locals
- reject attempts to revoke the current session directly
- return predictable success and error payloads for toast-based UI feedback
- support server-rendered partial refresh if the card uses `?_render=html`

## Error Handling

The Active Sessions card should fail locally without breaking the rest of the security page.

- If listing sessions fails during page render, show an inline error state inside the card.
- If a revoke request fails, keep the current list intact and show a toast.
- If Better Auth reports that the target session no longer exists, treat that as effectively successful and refresh the list.
- If metadata is missing, render fallback labels instead of hiding the row.

## Security Rules

- Users can view only their own sessions.
- Users can revoke only their own non-current sessions.
- `Revoke all other sessions` must preserve the current session.
- The app should not rely on the Better Auth `multi-session` plugin because that plugin solves multiple signed-in accounts in one browser, not cross-device session visibility.

## Testing Strategy

### Service Tests

Add focused tests for:

- mapping Better Auth session data into the UI shape
- current-session detection
- current-session protection on individual revoke
- revoke-all-other behavior
- fallback device and IP labels

### API Tests

Add route tests for:

- authenticated session listing
- unauthenticated rejection
- revoking a specific non-current session
- blocking revoke of the current session
- revoking all other sessions

### UI Tests

Add page or component coverage for:

- current session badge rendering
- other-session revoke actions
- empty state when no other sessions exist
- inline error state when list loading fails

### Manual QA

Validate on `/security` with multiple browser sessions:

- current device is marked correctly
- another device appears with full IP and simple device label
- revoking one other session removes only that row
- revoking all other sessions leaves the current session active

## Risks

- Better Auth version differences may affect the exact server-side API names or request shape, so the implementation must verify the installed package surface before coding.
- Stored `userAgent` strings may be inconsistent, so device labels must degrade gracefully.
- If the UI over-couples to session timestamps that Better Auth does not update the way we expect, the activity label may need to use a simpler time field.

## Out Of Scope

- Passkeys or WebAuthn changes
- Session history or audit-log retention beyond active sessions
- Geolocation lookup from IP address
- Browser fingerprinting
- Multiple signed-in accounts in one browser via Better Auth `multi-session`

## References

- `src/pages/security.astro`
- `src/components/molecules/SecurityApiKeysCard.astro`
- `src/pages/api/user/api-keys.ts`
- `src/lib/auth/server.ts`
- `src/lib/auth/types.ts`
- [Better Auth session management](https://better-auth.com/docs/concepts/session-management)
