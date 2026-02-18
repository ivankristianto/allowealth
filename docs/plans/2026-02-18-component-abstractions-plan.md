# Component Abstractions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `SecurityCard.astro`, `DashboardWidget.astro`, and `SearchInput.astro` base components and migrate all identified consumers.

**Architecture:** Named-slot composition in Astro SSR. Three base components own the shared shell (card wrapper, aria attributes, state machine). Consumers fill named slots with their specific icons, content, and loading skeletons. No behavior changes — pure structural refactor.

**Tech Stack:** Astro 5.x, Tailwind CSS v4, DaisyUI v5, TypeScript strict

---

## Part 1 — SecurityCard

### Task 1: Create `SecurityCard.astro`

**Files:**

- Create: `src/components/molecules/SecurityCard.astro`

**Step 1: Create the base component**

```astro
---
/**
 * SecurityCard base component
 *
 * Shared shell for all security section cards.
 * Handles the outer card structure, header layout, and icon badge.
 *
 * Named slots:
 *   icon         — required. Lucide icon element.
 *   title-extra  — optional. Extra content in the title row (e.g. help button).
 *   header-action — optional. Button/link pinned to header right.
 *                   When present, header switches to sm:justify-between layout.
 *   after        — optional. Rendered after card-body (use for inline dialogs).
 *   default      — required. Card body content.
 */
import IconBadge from '@/components/atoms/IconBadge.astro';

export interface Props {
  title: string;
  subtitle: string;
  iconVariant?: 'info' | 'success' | 'warning' | 'accent' | 'error' | 'neutral';
  /** Renders as badge-outline next to the title (e.g. "Under Development") */
  badge?: string;
  class?: string;
  /** Allow data-* attributes to be forwarded to the <section> element */
  [key: `data-${string}`]: string | boolean | undefined;
}

const {
  title,
  subtitle,
  iconVariant = 'neutral',
  badge,
  class: className = '',
  ...rest
} = Astro.props;

const hasHeaderAction = Astro.slots.has('header-action');
---

<section class:list={['card bg-base-100 shadow border border-base-300', className]} {...rest}>
  <div class="card-body p-6 space-y-6">
    <div
      class:list={[
        hasHeaderAction
          ? 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
          : 'flex items-center gap-4',
      ]}
    >
      <div class="flex items-center gap-4">
        <IconBadge variant={iconVariant} size="sm">
          <slot name="icon" />
        </IconBadge>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-bold">{title}</h3>
            {
              badge && (
                <span class="badge badge-outline badge-sm text-base-content/50 whitespace-nowrap">
                  {badge}
                </span>
              )
            }
            <slot name="title-extra" />
          </div>
          <p class="text-xs uppercase tracking-widest text-base-content/50">{subtitle}</p>
        </div>
      </div>
      {
        hasHeaderAction && (
          <div>
            <slot name="header-action" />
          </div>
        )
      }
    </div>
    <slot />
  </div>
  <slot name="after" />
</section>
```

**Step 2: Verify typecheck passes**

```bash
bun run typecheck
```

Expected: 0 errors.

---

### Task 2: Migrate `SecurityMfaCard.astro` (simplest — no header-action, no dialog)

**Files:**

- Modify: `src/components/molecules/SecurityMfaCard.astro`

**Step 1: Replace file contents**

```astro
---
/**
 * SecurityMfaCard Component
 *
 * Presents multi-factor authentication options.
 */
import SecurityCard from '@/components/molecules/SecurityCard.astro';
import { ShieldCheck, LayoutGrid } from '@lucide/astro';

interface MfaMethod {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  recommended?: boolean;
}

export interface Props {
  methods: MfaMethod[];
}

const { methods } = Astro.props;

// @TODO: Implement MFA preference updates.
---

<SecurityCard
  title="Multi-Factor Authentication"
  subtitle="2FA Protection"
  iconVariant="success"
  badge="Under Development"
>
  <ShieldCheck slot="icon" size={20} class="stroke-current" aria-hidden="true" />

  <div class="space-y-4">
    {
      methods.map((method) => (
        <div class="flex items-center justify-between gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4">
          <div class="flex items-center gap-4">
            <div class="rounded-xl bg-success text-success-content p-2">
              <LayoutGrid size={18} class="stroke-current" aria-hidden="true" />
            </div>
            <div>
              <p class="text-sm font-semibold">{method.label}</p>
              <p class="text-xs text-base-content/60">{method.description}</p>
            </div>
          </div>
          <input
            id={`mfa-${method.id}`}
            type="checkbox"
            class="toggle toggle-accent"
            checked={method.enabled}
            disabled
            aria-label={`Toggle ${method.label}`}
          />
        </div>
      ))
    }
  </div>
</SecurityCard>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

---

### Task 3: Migrate `SecurityConnectedAccountsCard.astro` (no header-action, has client script)

**Files:**

- Modify: `src/components/molecules/SecurityConnectedAccountsCard.astro`

**Step 1: Replace file contents**

```astro
---
/**
 * SecurityConnectedAccountsCard Component
 *
 * Displays connected SSO providers for account security.
 */
import SecurityCard from '@/components/molecules/SecurityCard.astro';
import Button from '@/components/atoms/Button.astro';
import { Key, Globe } from '@lucide/astro';

interface ConnectedAccount {
  id: string;
  provider: string;
  email?: string;
  connected: boolean;
}

export interface Props {
  accounts: ConnectedAccount[];
}

const { accounts } = Astro.props;
---

<SecurityCard title="Connected Accounts" subtitle="Single Sign-On (SSO)" iconVariant="accent">
  <Key slot="icon" size={20} class="stroke-current" aria-hidden="true" />

  <div class="space-y-4">
    {
      accounts.map((account) => (
        <div class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <div class="rounded-xl bg-base-100 p-3 text-base-content/60">
              <Globe size={20} class="stroke-current" aria-hidden="true" />
            </div>
            <div>
              <p class="text-sm font-semibold">{account.provider} SSO</p>
              <p class="text-xs text-base-content/60">
                {account.connected
                  ? `Connected as ${account.email || 'primary account'}`
                  : `Sign in using your ${account.provider} account`}
              </p>
            </div>
          </div>
          {account.connected ? (
            <form method="POST" data-unlink-form data-provider={account.id}>
              <Button type="submit" variant="outline" size="sm" data-unlink-btn>
                Disconnect
              </Button>
            </form>
          ) : (
            <Button href="/api/auth/google" variant="primary" size="sm">
              Connect Account
            </Button>
          )}
        </div>
      ))
    }
  </div>
</SecurityCard>

<script>
  import '@/components/molecules/SecurityConnectedAccountsCard.client';
</script>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 4: Migrate `SecurityPasskeysCard.astro` (has header-action + badge)

**Files:**

- Modify: `src/components/molecules/SecurityPasskeysCard.astro`

**Step 1: Replace file contents**

```astro
---
/**
 * SecurityPasskeysCard Component
 *
 * Displays registered passkeys and add/remove actions.
 */
import SecurityCard from '@/components/molecules/SecurityCard.astro';
import Button from '@/components/atoms/Button.astro';
import { Key, KeyRound, Plus, Trash2 } from '@lucide/astro';

interface Passkey {
  id: string;
  name: string;
  addedOn: string;
}

export interface Props {
  passkeys: Passkey[];
}

const { passkeys } = Astro.props;

// @TODO: Implement passkey management actions.
---

<SecurityCard
  title="Passkeys"
  subtitle="Biometric & Hardware Keys"
  iconVariant="warning"
  badge="Under Development"
>
  <Key slot="icon" size={20} class="stroke-current" aria-hidden="true" />

  <Button slot="header-action" type="button" variant="primary" size="sm" disabled>
    <Plus size={16} class="stroke-current" aria-hidden="true" />
    Add Passkey
  </Button>

  <p class="text-sm text-base-content/70">
    Sign in faster and more securely with your biometric data or hardware security keys.
  </p>

  <div
    class="border border-base-300 rounded-2xl overflow-hidden divide-y divide-base-300 bg-base-100"
  >
    {
      passkeys.map((passkey) => (
        <div class="flex items-center justify-between gap-4 p-4">
          <div class="flex items-center gap-4">
            <div class="rounded-xl bg-base-200 p-2 text-base-content/60">
              <KeyRound size={18} class="stroke-current" aria-hidden="true" />
            </div>
            <div>
              <p class="text-sm font-semibold">{passkey.name}</p>
              <p class="text-xs text-base-content/60">Added on {passkey.addedOn}</p>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm text-error"
            aria-label="Remove passkey"
            disabled
          >
            <Trash2 size={16} class="stroke-current" aria-hidden="true" />
          </button>
        </div>
      ))
    }
  </div>
</SecurityCard>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 5: Migrate `SecurityApiKeysCard.astro` (most complex — title-extra, header-action, data attribute, after slot)

**Files:**

- Modify: `src/components/molecules/SecurityApiKeysCard.astro`

**Key decisions:**

- `data-api-keys-card` is forwarded to the `<section>` via `{...rest}` in SecurityCard — client script selector is unchanged
- "Setup help" button goes in `slot="title-extra"` (sits inside the title row)
- "Generate Token" button goes in `slot="header-action"` (pinned to header right)
- Revoke dialog goes in `slot="after"` (rendered after card-body, still inside `<section>`)
- Client script is **unchanged** — `card.querySelector(...)` still works because `data-api-keys-card` ends up on the `<section>` which contains all child elements

**Step 1: Replace the template section only (keep client script identical)**

```astro
---
/**
 * Security API Keys Card
 *
 * Displays a list of API keys with generate and revoke actions.
 * Uses SecurityApiKeysListPartial for the key list (supports ?_render=html refresh).
 */
import SecurityCard from '@/components/molecules/SecurityCard.astro';
import Button from '@/components/atoms/Button.astro';
import { Cpu, Plus, CircleQuestionMark } from '@lucide/astro';
import SecurityApiKeysListPartial from '@/components/partials/SecurityApiKeysListPartial.astro';
import type { ApiKeyItem } from '@/components/partials/SecurityApiKeysListPartial.astro';

export interface Props {
  keys: ApiKeyItem[];
}

const { keys } = Astro.props;
---

<SecurityCard
  title="MCP Access Tokens"
  subtitle="Model Context Protocol (MCP)"
  iconVariant="info"
  data-api-keys-card
>
  <Cpu slot="icon" size={20} class="stroke-current" aria-hidden="true" />

  <button
    slot="title-extra"
    type="button"
    class="btn btn-ghost btn-sm gap-1"
    data-open-mcp-instructions
  >
    <CircleQuestionMark size={16} class="stroke-current" aria-hidden="true" />
    <span class="text-xs font-normal">Setup help</span>
  </button>

  <span slot="header-action" data-generate-key-btn>
    <Button type="button" variant="primary" size="sm">
      <Plus size={16} class="stroke-current" aria-hidden="true" />
      Generate Token
    </Button>
  </span>

  <p class="text-sm text-base-content/70">
    Connect AI assistants and MCP-compatible tools to your financial data securely.
  </p>

  <div data-api-keys-list>
    <SecurityApiKeysListPartial keys={keys} />
  </div>

  <!-- Revoke Confirmation Modal — rendered after card-body via slot="after" -->
  <dialog slot="after" id="revoke-key-modal" class="modal" data-revoke-key-modal>
    <div class="modal-box max-w-sm">
      <h3 class="text-lg font-bold">Revoke Access Token</h3>
      <p class="py-4 text-sm text-base-content/70">
        Are you sure you want to revoke <strong data-revoke-key-name></strong>? Any applications
        using this token will lose access immediately.
      </p>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn btn-ghost btn-sm">Cancel</button>
        </form>
        <button
          type="button"
          class="btn btn-error btn-sm"
          data-confirm-revoke
          data-revoking-key-id=""
        >
          Revoke
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</SecurityCard>

<script>
  /* Client script is UNCHANGED — copy from original file verbatim */
  import { addToast } from '@/lib/stores/toastStore';
  import { getCsrfHeaders } from '@/lib/csrf-client';
  import { setButtonLoading } from '@/lib/client-utils';

  const initializedCards = new WeakSet<Element>();

  function initApiKeysCard() {
    document.querySelectorAll<HTMLElement>('[data-api-keys-card]').forEach((card) => {
      if (initializedCards.has(card)) return;
      initializedCards.add(card);

      const listContainer = card.querySelector<HTMLElement>('[data-api-keys-list]');
      const revokeModal = card.querySelector<HTMLDialogElement>('[data-revoke-key-modal]');
      const revokeNameEl = card.querySelector<HTMLElement>('[data-revoke-key-name]');
      const confirmRevokeBtn = card.querySelector<HTMLButtonElement>('[data-confirm-revoke]');
      const generateBtn = card.querySelector<HTMLButtonElement>('[data-generate-key-btn]');

      if (!listContainer || !revokeModal || !revokeNameEl || !confirmRevokeBtn) return;

      card.addEventListener('click', (e) => {
        const revokeBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-revoke-key]');
        if (!revokeBtn) return;
        const keyId = revokeBtn.getAttribute('data-key-id') || '';
        const keyName = revokeBtn.getAttribute('data-key-name') || '';
        revokeNameEl.textContent = keyName;
        confirmRevokeBtn.setAttribute('data-revoking-key-id', keyId);
        revokeModal.showModal();
      });

      confirmRevokeBtn.addEventListener('click', async () => {
        const keyId = confirmRevokeBtn.getAttribute('data-revoking-key-id');
        if (!keyId) return;
        setButtonLoading(confirmRevokeBtn, true);
        try {
          const response = await fetch('/api/user/api-keys', {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
            body: JSON.stringify({ id: keyId }),
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to revoke key');
          }
          addToast('Access token revoked', 'success');
          revokeModal.close();
          const keyRow = listContainer.querySelector(
            `[data-api-key-item][data-key-id="${CSS.escape(keyId)}"]`
          );
          if (keyRow) keyRow.remove();
          const remaining = listContainer.querySelectorAll('[data-api-key-item]');
          if (remaining.length === 0) await refreshKeyList(listContainer);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to revoke key';
          addToast(message, 'error');
        } finally {
          setButtonLoading(confirmRevokeBtn, false);
        }
      });

      if (generateBtn) {
        generateBtn.addEventListener('click', () => {
          const modal = document.getElementById('generate-api-key-modal') as HTMLDialogElement;
          if (modal) {
            document.dispatchEvent(new CustomEvent('apikey:open-generate'));
            modal.showModal();
          }
        });
      }

      const mcpInfoBtn = card.querySelector<HTMLButtonElement>('[data-open-mcp-instructions]');
      if (mcpInfoBtn) {
        mcpInfoBtn.addEventListener('click', () => {
          const modal = document.getElementById(
            'mcp-setup-instructions-modal'
          ) as HTMLDialogElement;
          if (modal) modal.showModal();
        });
      }

      document.addEventListener('apikey:created', () => refreshKeyList(listContainer));
    });
  }

  async function refreshKeyList(container: HTMLElement) {
    try {
      const response = await fetch('/api/user/api-keys?_render=html', {
        credentials: 'include',
        headers: getCsrfHeaders(),
      });
      if (response.ok) {
        const html = await response.text();
        container.innerHTML = html;
      }
    } catch {
      // Silently fail — list refreshes on next page load
    }
  }

  document.addEventListener('DOMContentLoaded', initApiKeysCard);
  document.addEventListener('astro:page-load', initApiKeysCard);
</script>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 6: Quality gate + commit (security cards)

**Step 1: Run all quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: all pass, 0 errors.

**Step 2: Build check**

```bash
bun run build
```

Expected: build succeeds.

**Step 3: Commit**

```bash
git add src/components/molecules/SecurityCard.astro \
        src/components/molecules/SecurityMfaCard.astro \
        src/components/molecules/SecurityConnectedAccountsCard.astro \
        src/components/molecules/SecurityPasskeysCard.astro \
        src/components/molecules/SecurityApiKeysCard.astro
git commit -m "refactor(ui): extract SecurityCard base component, migrate 4 security cards"
```

---

## Part 2 — DashboardWidget

### Task 7: Create `DashboardWidget.astro`

**Files:**

- Create: `src/components/organisms/DashboardWidget.astro`

**Step 1: Create the base component**

```astro
---
/**
 * DashboardWidget base component
 *
 * Shared shell for dashboard widgets. Owns the Card wrapper, aria attributes,
 * and the loading/error/empty/default state machine.
 *
 * Named slots:
 *   loading  — required if loading prop may be true. Skeleton content.
 *   error    — optional. Error state. Defaults to plain error text.
 *   empty    — optional. Empty state. Shown when isEmpty=true and not loading/error.
 *   default  — required. Normal content.
 *
 * Consumers compute isEmpty and ariaLabel/ariaLabelledBy before passing.
 */
import Card from '@/components/atoms/Card.astro';

export interface Props {
  loading?: boolean;
  /** Computed by consumer: e.g. items.length === 0 */
  isEmpty?: boolean;
  /** Optional error message. When set, error slot (or default error text) is shown. */
  error?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaLive?: 'polite' | 'assertive' | 'off';
  /** Defaults to "region". SpendingCard uses "status". */
  role?: string;
  testId?: string;
  class?: string;
}

const {
  loading = false,
  isEmpty = false,
  error,
  ariaLabel,
  ariaLabelledBy,
  ariaLive,
  role = 'region',
  testId,
  class: className = '',
} = Astro.props;
---

<Card
  padding="lg"
  rounded="card-lg"
  className={className}
  role={role}
  aria-label={ariaLabel}
  aria-labelledby={ariaLabelledBy}
  aria-live={ariaLive}
  aria-busy={loading ? 'true' : undefined}
  data-testid={testId}
>
  {
    loading ? (
      <slot name="loading" />
    ) : error ? (
      <slot name="error">
        <p class="text-sm text-error">{error}</p>
      </slot>
    ) : isEmpty ? (
      <slot name="empty" />
    ) : (
      <slot />
    )
  }
</Card>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 8: Migrate `CashFlowWidget.astro`

**Files:**

- Modify: `src/components/organisms/CashFlowWidget.astro`

**Notes:**

- CashFlowWidget shows its title ("Cash flow analysis") even during loading — duplicate it in `slot="loading"` with the skeleton below.
- `ariaLabelledBy="cash-flow-title"` points to the `id` on the title div in the default slot.

**Step 1: Replace file contents**

```astro
---
/**
 * CashFlowWidget Component
 *
 * Cash flow analysis widget showing upcoming income/expense items.
 */
import DashboardWidget from '@/components/organisms/DashboardWidget.astro';
import Skeleton from '@/components/atoms/Skeleton.astro';
import StatLabel from '@/components/atoms/StatLabel.astro';
import CashFlowItem from '@/components/molecules/CashFlowItem.astro';
import type { CashFlowEntry } from '@/lib/cash-flow';

export interface Props {
  items?: CashFlowEntry[];
  loading?: boolean;
  className?: string;
}

const { items = [], loading = false, className = '' } = Astro.props;
---

<DashboardWidget
  loading={loading}
  isEmpty={items.length === 0}
  ariaLabel={loading ? 'Loading cash flow analysis' : undefined}
  ariaLabelledBy={!loading ? 'cash-flow-title' : undefined}
  class={className}
>
  <!-- Loading skeleton — title repeated so it's visible during load -->
  <div slot="loading" class="space-y-6">
    <StatLabel size="md" color="neutral">Cash flow analysis</StatLabel>
    <div class="space-y-5" role="status" aria-live="polite" aria-label="Loading cash flow analysis">
      {
        [1, 2].map(() => (
          <div class="flex items-center justify-between gap-4 p-6 rounded-card border border-base-200 bg-base-200/40">
            <div class="flex items-center gap-4">
              <Skeleton variant="rectangular" width="48px" height="48px" className="rounded-2xl" />
              <div class="space-y-2">
                <Skeleton variant="rectangular" width="128px" height="16px" />
                <Skeleton variant="rectangular" width="80px" height="12px" />
              </div>
            </div>
            <Skeleton variant="rectangular" width="96px" height="16px" />
          </div>
        ))
      }
    </div>
  </div>

  <!-- Empty state -->
  <p slot="empty" class="text-sm text-base-content/60">
    No cash flow entries yet. Add income or expenses to see upcoming activity.
  </p>

  <!-- Normal content -->
  <div class="space-y-6">
    <div id="cash-flow-title">
      <StatLabel size="md" color="neutral">Cash flow analysis</StatLabel>
    </div>
    <ul class="space-y-5" role="list">
      {items.map((item) => <CashFlowItem {...item} />)}
    </ul>
  </div>
</DashboardWidget>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 9: Migrate `AssetsWidget.astro`

**Files:**

- Modify: `src/components/organisms/AssetsWidget.astro`

**Notes:**

- `cardClasses` (with `pointer-events-none opacity-70` when loading) passes through `class` prop to DashboardWidget → Card.
- `isEmpty` is computed locally before passing.
- `@container` div stays in the default slot — AssetsWidget's container queries apply to normal content only.

**Step 1: Replace file contents**

```astro
---
/**
 * AssetsWidget Component
 *
 * Displays total assets and total debt per currency (IDR, USD).
 */
import { Landmark, Wallet, CreditCard } from '@lucide/astro';
import { formatCurrency } from '@/lib/formatting';
import EmptyState from '@/components/atoms/EmptyState.astro';
import DashboardWidget from '@/components/organisms/DashboardWidget.astro';
import Skeleton from '@/components/atoms/Skeleton.astro';
import StatLabel from '@/components/atoms/StatLabel.astro';
import IconBadge from '@/components/atoms/IconBadge.astro';

export interface Props {
  assetIdr: number;
  assetUsd: number;
  debtIdr?: number;
  debtUsd?: number;
  loading?: boolean;
  className?: string;
}

const {
  assetIdr,
  assetUsd,
  debtIdr = 0,
  debtUsd = 0,
  loading = false,
  className = '',
} = Astro.props;

const isEmpty = !assetIdr && !assetUsd && !debtIdr && !debtUsd;
const hasDebt = debtIdr > 0 || debtUsd > 0;

const badge =
  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider shrink-0';

const cardClasses = [
  'relative overflow-hidden',
  loading && 'pointer-events-none opacity-70',
  className,
]
  .filter(Boolean)
  .join(' ');
---

<DashboardWidget
  loading={loading}
  isEmpty={isEmpty}
  ariaLabel={loading ? 'Loading asset summary...' : 'Asset summary'}
  testId="dashboard-assets-widget"
  class={cardClasses}
>
  <!-- Loading skeleton -->
  <div slot="loading" aria-hidden="true">
    <div class="flex items-center gap-3">
      <Skeleton variant="rectangular" width="2.75rem" height="2.75rem" className="rounded-2xl" />
      <Skeleton variant="text" width="8rem" />
    </div>

    <div class="mt-6">
      <div class="flex items-center gap-2 mb-3">
        <Skeleton variant="circular" width="16px" height="16px" />
        <Skeleton variant="text" width="6rem" />
      </div>
      <div class="space-y-2">
        <Skeleton variant="text" width="85%" height="20px" />
        <Skeleton variant="text" width="70%" height="20px" />
      </div>
    </div>

    <div class="border-t border-base-300 pt-5 mt-5">
      <div class="flex items-center gap-2 mb-3">
        <Skeleton variant="circular" width="16px" height="16px" />
        <Skeleton variant="text" width="5rem" />
      </div>
      <Skeleton variant="text" width="60%" height="20px" />
    </div>
  </div>

  <!-- Empty state -->
  <EmptyState
    slot="empty"
    title="No assets yet"
    message="Add your first asset to start tracking your finances."
    iconName="wallet"
    actionLabel="Add Asset"
    actionHref="/assets"
    variant="centered"
    className="py-4"
  />

  <!-- Normal content -->
  <div class="@container">
    <div class="flex items-center gap-3">
      <IconBadge variant="accent" size="sm">
        <Landmark size={20} class="stroke-current" aria-hidden="true" />
      </IconBadge>
      <StatLabel size="md" color="neutral">Assets Overview</StatLabel>
    </div>

    <div class="mt-6">
      <div class="flex items-center gap-2 mb-3">
        <Wallet size={16} class="stroke-current text-success" aria-hidden="true" />
        <StatLabel size="sm" color="neutral">Total Assets</StatLabel>
      </div>
      <div class="space-y-2">
        {
          assetIdr > 0 && (
            <div class="flex items-center gap-2.5">
              <span class={`${badge} bg-success/10 text-success`}>IDR</span>
              <p class="text-lg font-bold text-success tracking-tight leading-none truncate">
                {formatCurrency(assetIdr, 'IDR')}
              </p>
            </div>
          )
        }
        {
          assetUsd > 0 && (
            <div class="flex items-center gap-2.5">
              <span class={`${badge} bg-info/10 text-info`}>USD</span>
              <p class="text-lg font-bold text-info tracking-tight leading-none truncate">
                {formatCurrency(assetUsd, 'USD')}
              </p>
            </div>
          )
        }
        {assetIdr <= 0 && assetUsd <= 0 && <p class="text-sm text-base-content/40">No assets</p>}
      </div>
    </div>

    {
      hasDebt && (
        <div class="border-t border-base-300 pt-5 mt-5">
          <div class="flex items-center gap-2 mb-3">
            <CreditCard size={16} class="stroke-current text-error" aria-hidden="true" />
            <StatLabel size="sm" color="neutral">
              Total Debt
            </StatLabel>
          </div>
          <div class="space-y-2">
            {debtIdr > 0 && (
              <div class="flex items-center gap-2.5">
                <span class={`${badge} bg-success/10 text-success`}>IDR</span>
                <p class="text-lg font-bold text-error tracking-tight leading-none truncate">
                  {formatCurrency(debtIdr, 'IDR')}
                </p>
              </div>
            )}
            {debtUsd > 0 && (
              <div class="flex items-center gap-2.5">
                <span class={`${badge} bg-info/10 text-info`}>USD</span>
                <p class="text-lg font-bold text-error tracking-tight leading-none truncate">
                  {formatCurrency(debtUsd, 'USD')}
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }
  </div>
</DashboardWidget>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 10: Migrate `SpendingCard.astro` (most complex — role=status, aria-live, error state, h-full)

**Files:**

- Modify: `src/components/organisms/SpendingCard.astro`

**Notes:**

- Uses `role="status"` + `ariaLive="polite"` (not the default `role="region"`)
- `class="h-full"` passed so Card fills its parent height
- Normal content wrapped in `@container flex flex-col h-full` for height-filling layout
- `ariaLabel` set when loading; `ariaLabelledBy` set when normal (points to uniqueId heading)
- All frontmatter calculations are **unchanged** — only the template changes

**Step 1: Replace file contents** (frontmatter is identical to original, only template changes)

```astro
---
/**
 * SpendingCard Component
 *
 * Monthly spending overview card with progress bar, income, and net savings.
 */
import { Scale } from '@lucide/astro';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatting';
import { getBudgetStatusClass, type BudgetStatusClassName } from '@/lib/tokens';
import ProgressBar from '@/components/atoms/ProgressBar.astro';
import IconBadge from '@/components/atoms/IconBadge.astro';
import StatLabel from '@/components/atoms/StatLabel.astro';
import DashboardWidget from '@/components/organisms/DashboardWidget.astro';
import Skeleton from '@/components/atoms/Skeleton.astro';

export interface Props {
  spent: number;
  budget: number;
  income?: number;
  currency?: 'IDR' | 'USD';
  remainingLabel?: string;
  loading?: boolean;
  error?: string;
  className?: string;
}

const {
  spent: rawSpent,
  budget: rawBudget,
  income: rawIncome = 0,
  currency = 'IDR',
  remainingLabel = 'Budget Remaining',
  loading = false,
  error,
  className = '',
} = Astro.props;

const spent = Number.isFinite(rawSpent) ? rawSpent : 0;
const budget = Number.isFinite(rawBudget) ? rawBudget : 0;
const income = Number.isFinite(rawIncome) ? rawIncome : 0;

const percentage = budget > 0 ? (spent / budget) * 100 : 0;
const percentageRounded = Math.round(percentage);
const remaining = budget - spent;
const status = getBudgetStatusClass(percentage);

const netSavings = income - spent;
const savingsPercentage = income > 0 ? (netSavings / income) * 100 : 0;

const getProgressBarStatus = (statusClass: BudgetStatusClassName): 'ok' | 'warning' | 'danger' => {
  if (statusClass === 'status-ok') return 'ok';
  if (statusClass === 'status-warning') return 'warning';
  return 'danger';
};

const getIconBadgeVariant = (
  statusClass: BudgetStatusClassName
): 'success' | 'warning' | 'error' => {
  if (statusClass === 'status-ok') return 'success';
  if (statusClass === 'status-warning') return 'warning';
  return 'error';
};

const progressBarStatus = getProgressBarStatus(status);
const iconBadgeVariant = getIconBadgeVariant(status);

const spentFormatted = formatCurrency(spent, currency);
const budgetFormatted = formatCurrencyCompact(budget, currency);
const remainingFormatted = formatCurrency(remaining, currency);
const incomeFormatted = formatCurrency(income, currency);
const netSavingsFormatted = formatCurrency(Math.abs(netSavings), currency);

const uniqueId = `spending-card-${Math.random().toString(36).slice(2, 11)}`;
---

<DashboardWidget
  loading={loading}
  error={error}
  role="status"
  ariaLive="polite"
  ariaLabel={loading ? 'Loading spending data...' : undefined}
  ariaLabelledBy={!loading && !error ? uniqueId : undefined}
  class={`h-full ${className}`}
  testId="dashboard-spending-card"
>
  <!-- Loading skeleton -->
  <div slot="loading" aria-hidden="true">
    <div class="flex justify-between items-start">
      <div class="flex items-center gap-4">
        <Skeleton variant="rectangular" width="3rem" height="3rem" className="rounded-2xl" />
        <div class="space-y-3">
          <Skeleton variant="text" width="6rem" />
          <Skeleton variant="heading" width="12rem" />
        </div>
      </div>
      <Skeleton variant="text" width="4rem" />
    </div>
    <div class="space-y-2 mt-6">
      <Skeleton variant="rectangular" width="100%" height="12px" className="rounded-full" />
      <div class="flex justify-between">
        <Skeleton variant="text" width="7rem" />
        <Skeleton variant="text" width="2.5rem" />
      </div>
    </div>
    <Skeleton variant="text" width="10rem" className="mt-6" />
    <div class="border-t border-base-300 pt-4 mt-6">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Skeleton variant="text" width="3.5rem" />
          <Skeleton variant="heading" width="6rem" />
        </div>
        <div class="space-y-2">
          <Skeleton variant="text" width="5rem" />
          <Skeleton variant="heading" width="7rem" />
        </div>
      </div>
    </div>
  </div>

  <!-- Normal content -->
  <div class="@container flex flex-col h-full">
    <div class="flex flex-col gap-6">
      <div class="flex flex-col @xs:flex-row @xs:justify-between @xs:items-start gap-3 @xs:gap-4">
        <div class="flex items-center gap-3 @xs:gap-4">
          <IconBadge variant={iconBadgeVariant} size="md">
            <Scale size={24} class="stroke-current" aria-hidden="true" />
          </IconBadge>
          <div class="min-w-0">
            <StatLabel size="md" color="neutral">Expenses</StatLabel>
            <h3
              id={uniqueId}
              class="text-2xl @sm:text-3xl font-bold mt-1.5 tracking-tight leading-none"
              data-testid="dashboard-total-expenses"
            >
              {spentFormatted}
              <span class="text-sm @sm:text-base text-base-content/60 font-medium tracking-normal">
                / {budgetFormatted}
              </span>
            </h3>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <ProgressBar value={percentage} status={progressBarStatus} size="md" />
        <div class="flex justify-between items-center text-sm">
          <span class="text-base-content/60">Monthly Allocation</span>
          <span class="font-semibold text-base-content">{percentageRounded}%</span>
        </div>
      </div>

      <p class="text-base font-medium text-base-content/60">
        {remainingLabel}:{' '}
        <span class="font-bold text-base-content">{remainingFormatted}</span>
      </p>
    </div>

    <div class="border-t border-base-300 pt-4 mt-4">
      <div class="grid grid-cols-1 @xs:grid-cols-2 gap-4">
        <div>
          <StatLabel size="sm" color="neutral">INCOME</StatLabel>
          <p class="text-lg font-bold text-success mt-1" data-testid="dashboard-total-income">
            {incomeFormatted}
          </p>
        </div>
        <div class="min-w-0">
          <StatLabel size="sm" color="neutral">NET SAVINGS</StatLabel>
          <p
            class:list={[
              'text-lg font-bold mt-1 truncate',
              netSavings >= 0 ? 'text-success' : 'text-error',
            ]}
            title={`${netSavings < 0 ? '-' : ''}${netSavingsFormatted} (${netSavings >= 0 ? '+' : ''}${Math.round(savingsPercentage)}%)`}
          >
            {netSavings < 0 ? '-' : ''}
            {netSavingsFormatted}
          </p>
          <p class="text-xs font-medium text-base-content/60 mt-0.5">
            {netSavings >= 0 ? '+' : ''}
            {Math.round(savingsPercentage)}% of income
          </p>
        </div>
      </div>
    </div>
  </div>
</DashboardWidget>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 11: Quality gate + commit (dashboard widgets)

**Step 1: Run all quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

**Step 2: Build check**

```bash
bun run build
```

**Step 3: Commit**

```bash
git add src/components/organisms/DashboardWidget.astro \
        src/components/organisms/CashFlowWidget.astro \
        src/components/organisms/AssetsWidget.astro \
        src/components/organisms/SpendingCard.astro
git commit -m "refactor(ui): extract DashboardWidget base component, migrate 3 dashboard widgets"
```

---

## Part 3 — SearchInput

### Task 12: Create `SearchInput.astro`

**Files:**

- Create: `src/components/atoms/SearchInput.astro`

**Step 1: Create the molecule**

```astro
---
/**
 * SearchInput atom
 *
 * Search input with absolute-positioned magnifying glass icon overlay.
 * Normalizes the icon+input pattern used across filter bars.
 *
 * @param label   — required. Used for sr-only <label> and aria-label on input.
 * @param class   — applied to the outer wrapper div (e.g. "flex-1", "md:flex-1").
 * @param inputClass — CSS classes for the <input> element (required — callers provide).
 * Additional props (data-*, id, name, etc.) are spread onto the <input>.
 */
import { Search } from '@lucide/astro';

export interface Props {
  label: string;
  name?: string;
  id?: string;
  value?: string;
  placeholder?: string;
  inputClass?: string;
  class?: string;
  [key: `data-${string}`]: string | boolean | undefined;
}

const {
  label,
  name,
  id,
  value,
  placeholder,
  inputClass = '',
  class: className = '',
  ...rest
} = Astro.props;
---

<div class:list={['relative', className]}>
  <span
    class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40"
    aria-hidden="true"
  >
    <Search size={18} class="stroke-current" />
  </span>
  {
    id && (
      <label for={id} class="sr-only">
        {label}
      </label>
    )
  }
  <input
    type="search"
    id={id}
    name={name}
    value={value}
    placeholder={placeholder}
    class={inputClass}
    aria-label={label}
    {...rest}
  />
</div>
```

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 13: Migrate `BudgetFilterControls.astro`

**Files:**

- Modify: `src/components/molecules/BudgetFilterControls.astro`

**Step 1: Replace the search input block only**

Replace the `<div class="relative md:flex-1">` block (containing `<span>` + `<input>`) with:

```astro
import SearchInput from '@/components/atoms/SearchInput.astro';
```

Add to the existing imports, then replace:

```astro
<!-- BEFORE -->
<div class="relative md:flex-1">
  <span
    class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40"
    aria-hidden="true"
  >
    <Search size={18} class="stroke-current" />
  </span>
  <input
    type="search"
    id="budget-filter-input"
    data-testid="budget-filter-input"
    placeholder="Filter budgets..."
    class={searchInputClass}
    aria-label="Filter budgets by category name"
  />
</div>
```

```astro
<!-- AFTER -->
<SearchInput
  id="budget-filter-input"
  label="Filter budgets by category name"
  placeholder="Filter budgets..."
  inputClass={searchInputClass}
  class="md:flex-1"
  data-testid="budget-filter-input"
/>
```

Also remove `Search` from the lucide import (it's now inside SearchInput).

**Step 2: Typecheck**

```bash
bun run typecheck
```

---

### Task 14: Migrate `TransactionFiltersBar.astro`

**Files:**

- Modify: `src/components/organisms/TransactionFiltersBar.astro`

**Step 1: Read the full file first**

```bash
# Read the complete file to get mainSearchInputClass definition and full template
```

Use the Read tool on `src/components/organisms/TransactionFiltersBar.astro` to get the full content.

**Step 2: Add SearchInput import to frontmatter**

```astro
import SearchInput from '@/components/atoms/SearchInput.astro';
```

**Step 3: Replace the search input block**

Find the `<div class="relative flex-1">` block (the search field with icon overlay) and replace:

```astro
<!-- BEFORE -->
<div class="relative flex-1">
  <Search
    size={18}
    class="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-base-content/40 stroke-current pointer-events-none z-10"
    aria-hidden="true"
  />
  <label for="search-input" class="sr-only">Search activity</label>
  <input
    id="search-input"
    type="search"
    name="search"
    value={searchValue}
    placeholder="Search..."
    class={mainSearchInputClass}
    data-filter-search
  />
</div>
```

```astro
<!-- AFTER -->
<SearchInput
  id="search-input"
  name="search"
  label="Search activity"
  value={searchValue}
  placeholder="Search..."
  inputClass={mainSearchInputClass}
  class="flex-1"
  data-filter-search
/>
```

Remove `Search` from the lucide import if it's no longer used elsewhere in the file. (Check first — `Search` may still be used in another block.)

**Step 4: Typecheck**

```bash
bun run typecheck
```

---

### Task 15: Final quality gates + commit

**Step 1: Full quality gate suite**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

**Step 2: Build check**

```bash
bun run build
```

Expected: 0 errors, successful build.

**Step 3: Commit**

```bash
git add src/components/atoms/SearchInput.astro \
        src/components/molecules/BudgetFilterControls.astro \
        src/components/organisms/TransactionFiltersBar.astro
git commit -m "refactor(ui): extract SearchInput atom, migrate filter bar search inputs"
```

---

## Summary

| Task | Component                             | Action                      |
| ---- | ------------------------------------- | --------------------------- |
| 1    | `SecurityCard.astro`                  | Create                      |
| 2    | `SecurityMfaCard.astro`               | Migrate                     |
| 3    | `SecurityConnectedAccountsCard.astro` | Migrate                     |
| 4    | `SecurityPasskeysCard.astro`          | Migrate                     |
| 5    | `SecurityApiKeysCard.astro`           | Migrate (complex)           |
| 6    | —                                     | Quality gate + commit       |
| 7    | `DashboardWidget.astro`               | Create                      |
| 8    | `CashFlowWidget.astro`                | Migrate                     |
| 9    | `AssetsWidget.astro`                  | Migrate                     |
| 10   | `SpendingCard.astro`                  | Migrate (complex)           |
| 11   | —                                     | Quality gate + commit       |
| 12   | `SearchInput.astro`                   | Create                      |
| 13   | `BudgetFilterControls.astro`          | Migrate                     |
| 14   | `TransactionFiltersBar.astro`         | Migrate                     |
| 15   | —                                     | Final quality gate + commit |

**No behavior changes in any component. Client scripts are untouched. Props interfaces for consumers are unchanged.**
