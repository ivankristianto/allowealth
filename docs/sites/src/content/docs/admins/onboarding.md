---
title: Admin Onboarding
description: Configure workspace standards, member access, and operational guardrails.
draft: false
head: []
sidebar:
  label: Admin Onboarding
  order: 1
audience:
  - admin
---

Admins set the baseline for everyone else.

## 1. Configure workspace standards

Set these once before inviting members:

- Workspace name
- Default currency
- Week start (`monday` or `sunday`)
- Number formatting preference

CLI example:

```bash
bun run aw workspace create --name "My Workspace" --email admin@example.com --currency IDR --week-start monday
```

## 2. Set access model

Define who needs admin permissions and who should remain member-only.

- Keep admin count small.
- Promote by operational responsibility, not convenience.

## 3. Enable security hygiene

- Enforce strong password policy.
- Encourage MFA setup for all admins.
- Review audit logs during initial rollout.

## 4. Prepare support operations

Create internal runbooks for:

- Member invitation/revocation
- Workspace settings changes
- Incident escalation

:::caution[⚠️ Caution]
Workspace-level changes affect every user in that workspace. Communicate setting changes before applying them.
:::

Continue with [Admin Deployment Guide](/admins/deployment-guide/).
