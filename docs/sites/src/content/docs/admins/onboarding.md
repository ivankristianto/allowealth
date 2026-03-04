---
title: Admin Onboarding
description: Set up workspaces, invite members, and configure security.
draft: false
head: []
sidebar:
  label: Admin Onboarding
  order: 1
audience:
  - admin
---

Complete these four steps before inviting members.

## Step 1: Create a workspace

Set the workspace defaults:

```bash
bun run aw workspace create \
  --name "My Workspace" \
  --email admin@example.com \
  --currency USD \
  --week-start monday
```

Available options:

- `--currency`: USD, EUR, GBP, IDR, JPY, etc.
- `--week-start`: monday or sunday

## Step 2: Invite members

Invite users to the workspace:

```bash
bun run aw workspace invite \
  --workspace-id <workspace-id> \
  --email user@example.com
```

List workspace members:

```bash
bun run aw workspace members list --workspace-id <workspace-id>
```

## Step 3: Configure security

Enable MFA for your admin account:

1. Go to **Profile → Security**
2. Click **Enable MFA**
3. Scan the QR code with your authenticator app
4. Enter the verification code

Generate API keys for programmatic access:

```bash
bun run aw admin create-api-key \
  --workspace-id <workspace-id> \
  --user-id <user-id> \
  --name "Production API Key"
```

## Step 4: Document runbooks

Create internal documentation for:

- Member invitation and revocation
- Workspace setting changes
- Emergency contacts and escalation

:::caution[⚠️ Caution]
Workspace changes affect all members. Announce changes before applying them.
:::

Continue to [Deployment Guide](./deployment-guide/).
