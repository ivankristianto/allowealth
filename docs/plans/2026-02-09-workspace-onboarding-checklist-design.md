# Workspace Onboarding Checklist

## Problem

After registration and login, new users land on an empty dashboard with no guidance. The app requires several setup steps before it's useful (currency, categories, budgets, assets), but users have no indication of what to do or in what order.

## Solution

A server-rendered checklist card on the dashboard that guides new users through 5 sequential setup steps. Each step links to an existing page. The checklist auto-disappears once all steps are complete.

## Design Decisions

- **Dashboard checklist** (not a wizard/separate flow) — keeps users in context
- **Navigate to existing pages** — no new inline modals, reuses existing UI
- **Auto-dismiss on completion** — no manual dismiss, no stored onboarding state
- **Sequential/locked steps** — enforces dependency chain (categories before budgets, etc.)
- **Currency required, no default** — user must explicitly choose before anything else unlocks

## Checklist Steps

Steps unlock sequentially. Step N is clickable only when steps 1 through N-1 are complete.

| #   | Title                | Description                               | Links to                | Complete when                                             |
| --- | -------------------- | ----------------------------------------- | ----------------------- | --------------------------------------------------------- |
| 1   | Set your currency    | Choose your default currency              | `/settings`             | Workspace meta has `currency` entry                       |
| 2   | Create categories    | Add expense and income categories         | `/budget/categories`    | At least 1 expense category exists                        |
| 3   | Set up budgets       | Initialize and set monthly budget amounts | `/budget`               | Current month has budgets with at least 1 non-zero amount |
| 4   | Add your accounts    | Track bank accounts, wallets, or cash     | `/assets`               | At least 1 asset exists                                   |
| 5   | Record a transaction | Log your first expense or income          | Opens TransactionDrawer | At least 1 transaction exists                             |

## Visual States

Each step row shows a status icon, title, description, and link.

- **Completed:** Green checkmark, muted text, no link
- **Current (next to do):** Highlighted with arrow icon, primary action link
- **Locked:** Gray lock icon, muted/disabled text, not clickable

## Dashboard Integration

### Checklist Card

- Renders at the top of the dashboard, above financial widgets
- Heading: "Set up your workspace"
- Subtext: "Complete these steps to start tracking your finances"
- Progress indicator: "N of 5 complete" with progress bar
- Five step rows with visual states described above

### Progressive Widget Visibility

| Currency set?          | Dashboard shows                                                               |
| ---------------------- | ----------------------------------------------------------------------------- |
| No (step 1 incomplete) | Checklist card only. No financial widgets.                                    |
| Yes                    | Checklist card + normal dashboard widgets (they handle empty data gracefully) |
| All 5 complete         | No checklist. Normal dashboard.                                               |

Only currency completion controls widget visibility. Existing widgets already handle zero/empty data with appropriate empty states.

## Implementation Architecture

### New Component

`src/components/organisms/OnboardingChecklist.astro` — server-rendered, no client JS except for step 5 (opens TransactionDrawer).

### Data Flow

1. `dashboard.astro` calls `getOnboardingStatus(workspaceId)`
2. Service runs 5 lightweight queries (EXISTS/COUNT checks on indexed tables)
3. Returns: `{ currency: boolean, categories: boolean, budgets: boolean, assets: boolean, transactions: boolean }`
4. If all true → don't render checklist
5. If any false → pass status to `OnboardingChecklist.astro`

### Service Location

New `getOnboardingStatus()` function in `workspace.service.ts` (workspace-scoped).

### Required Change: Remove Currency Hardcoding

The dashboard currently hardcodes `const primaryCurrency = 'IDR'`. This must change:

- Read currency from workspace meta (no fallback default)
- If no currency in workspace meta → currency is "not set" → step 1 incomplete
- Settings page writes currency to DB only on explicit user selection
- Remove `WORKSPACE_META_DEFAULTS.currency` fallback (or don't use it as auto-default)

### No New Infrastructure

- No new database tables
- No new API endpoints
- No client-side state management
- No stored onboarding progress — completion detected from existing data

### Performance

Five simple indexed queries. Negligible overhead. Once onboarding is complete, the checklist block is skipped entirely.
