# Marketing Site Copywriting & Flow — Design Spec

**Date:** 2026-03-13
**Ticket:** ALL-40
**Branch:** `ivan/all-40-improve-marketing-site-copywriting-and-flow-with-control`

## Summary

Revamp the marketing site copy and navigation to align with the "control" brand positioning. All changes are copy-only — no new sections, no visual design changes, no pricing changes.

**Brand positioning:** "Know where every dollar goes. Own where you're headed."
**Theme:** Control through clarity (guessing → deciding, surviving → building)
**Target audience:** Young individuals and families seeking financial clarity

---

## Scope

All copy lives in one file: `apps/site/src/lib/landing-content.ts`.
Navbar changes are in: `apps/site/src/components/layouts/PublicNavbar.astro`.

**Out of scope:** Visual design, new sections, pricing, FAQ questions and answers, feature list items in showcase, card layout in features grid.

---

## Changes

### 1. Navbar (`PublicNavbar.astro`)

Remove the "Try Demo" CTA button entirely. Keep "Features" and "Documentation" nav links unchanged.

**Before:**
```
[Features] [Documentation]  [Try Demo]
```

**After:**
```
[Features] [Documentation]
```

---

### 2. Hero (`heroContent` in `landing-content.ts`)

| Field | Before | After |
|---|---|---|
| `title` | `'Manage money'` | `'Know where every dollar goes.'` |
| `titleHighlightPrefix` | `'together. '` | `'Own where '` |
| `titleHighlight` | `'Without stress.'` | `"you're headed."` |
| `description` | `'A shared money operating system for households and small communities. See where your money goes, plan budgets together, and skip the spreadsheets.'` | `'Stop guessing where it all went. Allowealth gives households and families a clear, shared view of their money — so you can plan with confidence, not anxiety.'` |
| `ctaGuest` | `'Get Started Free'` | `'Try the Demo'` |
| `ctaSecondary` | `'See how it works'` | `'Your data, your rules'` |
| `ctaSecondaryHref` | `'#showcase'` | `'https://docs.allowealth.io/self-host'` |

`badge` and `ctaLoggedIn` are unchanged.

**Rationale:** The primary CTA points to the live demo (no SaaS yet, so `/signup` is a dead end). The secondary CTA explicitly surfaces the self-hosting path — giving developers a clear route without competing with the demo CTA.

---

### 3. Showcase Descriptions (`showcaseItems` in `landing-content.ts`)

Titles, icons, feature lists, and layout are unchanged. Only `description` fields are updated.

| Item | Before | After |
|---|---|---|
| `dashboard` | `'See household or group spending, account totals, and budget health in one shared view, without the admin work.'` | `'No more end-of-month surprises. One shared view of spending, accounts, and budget health — so everyone stays on the same page.'` |
| `transactions` | `'Record income and expenses as a household or community. No more guessing who paid for what. Import easily from your bank.'` | `'Every dollar in, every dollar out — logged and categorized. No more guessing who paid for what or where it all went.'` |
| `budget` | `'Set limits by category and get alerts before you overspend. Plan each month together and stay accountable.'` | `'Set limits before the month starts, not after. Get alerts before you overspend and stay accountable together.'` |
| `accounts` | `'Bank accounts, savings, and investments — all together. Track balances across currencies and automate recurring transactions.'` | `'Every bank account, savings pot, and investment in one place. Track across currencies without the spreadsheet juggling.'` |
| `reports` | `'Clear spending trends, category breakdowns, and month-over-month analysis. Export and share anytime.'` | `'Spot patterns before they become problems. Category breakdowns, monthly trends, and year-over-year analysis — always at hand.'` |

---

### 4. Features Grid (`FeaturesGrid.astro` + `featureGridItems` in `landing-content.ts`)

**Section header** (inline in `FeaturesGrid.astro`):

| Element | Before | After |
|---|---|---|
| `<h2>` | `'Built right.'` | `'Built for clarity.'` |
| `<p>` subheader | `'Everything you need to manage money clearly.'` | `'The foundation behind full financial control.'` |

**Feature card** — one description update in `featureGridItems`:

| Item | Before | After |
|---|---|---|
| `forecast` description | `'Project savings, explore what-ifs, and plan your financial future together.'` | `'See months ahead. Model scenarios. Plan your financial future with confidence.'` |

All other card titles and descriptions are unchanged.

---

### 5. FAQ Section Header (`FaqSection.astro`)

Header copy only — questions and answers are unchanged.

| Element | Before | After |
|---|---|---|
| Section title | `'Clear answers for shared money.'` (with gradient on "shared money.") | `'Clear answers, no confusion.'` (with gradient on "no confusion.") |
| Subheader `<p>` | `'Everything you need to know about managing your household finances with Allowealth.'` | `'Everything you need to know before you take control of your finances.'` |

---

## Files Changed

1. `apps/site/src/lib/landing-content.ts` — hero, showcase descriptions, feature grid item
2. `apps/site/src/components/layouts/PublicNavbar.astro` — remove CTA button
3. `apps/site/src/components/molecules/landing/FeaturesGrid.astro` — section header copy
4. `apps/site/src/components/molecules/landing/FaqSection.astro` — section header copy

## Acceptance Criteria (from ticket)

- [x] Hero section updated with "control" theme from elevator pitch
- [x] Feature descriptions rewritten with benefit-driven copy
- [x] Duplicate demo link consolidated (removed from navbar; hero is single conversion point)
- [x] Clear dual-path CTAs: "Try the Demo" (primary) + "Your data, your rules" → self-host docs (secondary)
- [x] Section flow creates logical narrative progression (control theme carried through showcase → features → FAQ)
- [x] Self-hosting CTA is prominent in hero but doesn't compete with demo CTA
- [x] Documentation and GitHub links remain in expected locations (navbar + footer)
