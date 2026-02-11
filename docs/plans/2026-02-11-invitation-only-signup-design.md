# Invitation-Only Signup Design

**Date:** 2026-02-11  
**Status:** Validated (brainstormed)  
**Decision:** Use existing invitation system (`workspace_invitations`) as the only signup path for now.

## Context

Current signup is still open publicly:

- `GET /signup` shows standard registration without invitation token
- `POST /api/auth/signup` allows no-token registration and creates a new workspace/admin
- `cli:create-workspace` creates admin user directly with password

Goal is to close signup to invitation-only while keeping a future path to re-open public signup.

## Final Decisions

1. Signup is invitation-only immediately.
2. Invited users created from this bootstrap flow use role `admin`.
3. `/signup` without token shows an invitation-required state (not redirect).
4. `cli:create-workspace` no longer creates admin user directly; it creates workspace + sends admin invitation email.
5. Architecture uses existing invitation flow (no new invitation table/service).
6. Future mode switch prepared for public signup + paid subscription membership.

## Target Flow

### Admin bootstrap

1. Operator runs `bun run cli:create-workspace -- --name "<workspace>" --email "<admin@email>"`.
2. CLI creates workspace and default workspace meta.
3. CLI creates `workspace_invitations` row with role `admin`.
4. Invitation email is sent with `https://<PUBLIC_URL>/signup?token=<token>`.
5. Admin opens link, signs up, verifies email, logs in.

### User signup

- `GET /signup?token=...` validates token and renders invitation signup form.
- `GET /signup` (no token) renders “Invitation required” card with login CTA.
- `POST /api/auth/signup` requires token, validates token/email, creates user in invited workspace, accepts invitation, sends verification email.

## Required Changes

## UI (`src/pages/signup.astro`)

- Remove public self-signup rendering path.
- Keep invitation form path unchanged.
- Add invitation-required state for missing token.

## Service (`src/services/workspace-invitation.service.ts`)

- Build invitation URL as `/signup?token=...` (not `/invite?token=...`).
- Support CLI bootstrap invite where `invited_by_user_id` can be `null`.
- Use inviter fallback label in email when inviter user is absent (e.g. “Workspace administrator”).

## API (`src/pages/api/auth/signup.ts`)

- Make token mandatory.
- Remove no-token `register(...)` path from active flow.
- Return 400 with clear message/code for missing token.

## CLI (`src/cli/create-workspace.ts`)

- Require admin email input/flag.
- Remove password prompts and direct admin user insert.
- After workspace creation, create admin invitation via `WorkspaceInvitationService`.
- Print resulting signup URL for manual fallback if email delivery fails.

## Data/Schema Notes

- `workspace_invitations.invited_by_user_id` is already nullable in both SQLite and PostgreSQL schema.
- No schema migration required for this design.

## Error Handling

- Invalid token: `400` invalid invitation.
- Expired token: `400` invitation expired.
- Used token: `400` invitation already used.
- Email mismatch: `400` email does not match invitation.
- Missing token on signup POST: `400` invitation token required.
- CLI: if email sending fails, workspace + invitation creation still succeed and CLI prints explicit manual next steps.

## Future-Ready Switch (Public Reopen)

Introduce centralized auth mode setting:

- `SIGNUP_MODE=invite_only|public`

Behavior:

- `invite_only`: current closed mode (token required in UI/API).
- `public`: restore no-token registration path while keeping token signup path available.

This mode should be checked in one shared policy helper used by both signup page and signup API.

## Subscription Membership Readiness

Future “membership” means paid subscription plans, not account creation policy.

- Keep signup policy and billing policy separate.
- Add a post-onboarding integration point (`onUserOnboarded(workspaceId, userId)`) for future billing activation.
- Do not couple `cli:create-workspace` bootstrap to billing initialization.

## Validation Plan

Before implementation is marked complete:

1. `bun run build`
2. Targeted tests for signup and invitation behavior
3. `bun run lint:fix`
4. `bun run stylelint:fix`
5. `bun run format:fix`
6. `bun run typecheck`

## Out of Scope

- Implementing billing/subscription membership logic
- Changing invitation expiry policy
- Introducing new invitation tables or parallel token systems
