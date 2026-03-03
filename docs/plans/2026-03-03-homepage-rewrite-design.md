# Homepage Rewrite Design

**Date:** 2026-03-03
**Status:** Approved
**Scope:** `src/pages/index.astro`, `src/lib/landing-content.ts`, landing components

---

## Context

The current homepage positions allowealth as a "family ledger" with "enterprise-grade" language and a 3-tier paid pricing section. This contradicts the product vision:

- **Free and open source** — no paid tiers
- **For individuals, families, and small communities** — not exclusively family-focused
- **"Track wealth"** positioning — broader than "family ledger"
- **Local-first** (future vision) and cloud hosting (future vision)
- **No enterprise language**

---

## Goals

1. Rebrand hero messaging from "family ledger" → "track your wealth"
2. Showcase actual built features: Dashboard, Transactions, Budget, Accounts, Reports
3. Remove pricing section entirely (free & open source, no tiers)
4. Remove all enterprise, proprietary, and family-exclusive language
5. Communicate three audiences: individuals, families, small communities
6. Signal open source nature (badge, footer)

---

## Page Structure

```
Hero
Showcase (5 alternating rows)
Features Grid (bento cards)
Footer
```

`PricingSection` component is **removed** from `index.astro`.

---

## Section Designs

### Hero

- **Badge:** `Open Source · Free Forever`
- **Headline:**
  ```
  Track your
  wealth. Your way.
  ```
- **Subheadline:** "For individuals, families, and small communities. Track income, expenses, budgets, and accounts in one place. Self-host it or use our cloud."
- **Primary CTA:** `Get Started Free` → `/signup` (or `/dashboard` if logged in)
- **Secondary CTA:** `View on GitHub` → GitHub repo URL

**Removed:** AI badge ("Powered by Gemini 3 Pro AI"), enterprise language.

---

### Showcase (5 rows)

| #   | Feature      | Headline                              | Bullet features                                                                               |
| --- | ------------ | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Dashboard    | "Everything in one place."            | Monthly spending overview; Account totals at a glance; Budget health at a glance              |
| 2   | Transactions | "Track every dollar in and out."      | Log income and expenses; Filter by month, category, account; Import CSV from your bank        |
| 3   | Budget       | "Plan your month, not just track it." | Category limits with alerts; Monthly budget planning; Copy budgets forward                    |
| 4   | Accounts     | "All your accounts, one workspace."   | Multi-currency (IDR / USD / EUR); Bank, savings & investment accounts; Recurring transactions |
| 5   | Reports      | "See the full picture."               | Spending trends by category; Monthly and yearly analysis; Export and share                    |

---

### Features Grid (Bento)

6 cards in a 12-column bento layout:

| Card            | Icon       | Title             | Description                                                                     | Size       |
| --------------- | ---------- | ----------------- | ------------------------------------------------------------------------------- | ---------- |
| 1 (dark, large) | Zap        | Fast              | "Snappy on every device. Built with performance-first development."             | col-span-8 |
| 2               | Shield     | Secure            | "Your data is encrypted. Self-host for full control."                           | col-span-4 |
| 3               | Globe      | Multi-Currency    | "IDR, USD, EUR and more — all in one workspace."                                | col-span-5 |
| 4               | Users      | For Everyone      | "Individuals, families, or your small community — one workspace adapts to all." | col-span-7 |
| 5               | Lock       | You Own Your Data | "Open source. Self-host it. No lock-in, ever."                                  | col-span-4 |
| 6               | TrendingUp | Forecast          | "Project savings, model scenarios, and plan your financial future."             | col-span-8 |

---

### Footer / Brand Content

- **Tagline:** "Open source personal finance for individuals, families, and small communities."
- **Copyright:** Remove "Proprietary AES-256 Vault technology protected."

---

## Content Changes (`landing-content.ts`)

- Rewrite `heroContent` (badge, title, titleHighlight, description, CTAs)
- Rewrite `showcaseItems` (5 items replacing 3)
- Rewrite `featureGridItems` (6 items, reworded)
- Rewrite `brandContent` (tagline, copyright)
- Keep `pricingTiers` export in file (unused, remove in future cleanup)
- Update `footerLinks` to remove "Ecosystem > Audit Logs" and add open source links

---

## Files to Modify

| File                                                     | Change                                   |
| -------------------------------------------------------- | ---------------------------------------- |
| `src/pages/index.astro`                                  | Remove `PricingSection` import and usage |
| `src/lib/landing-content.ts`                             | Rewrite all content constants            |
| `src/components/organisms/landing/ShowcaseSection.astro` | No structural change needed              |
| `src/components/molecules/landing/FeaturesGrid.astro`    | No structural change needed              |
| `src/components/molecules/landing/HeroSection.astro`     | Secondary CTA href update (GitHub)       |

---

## Out of Scope

- Visual redesign of component layouts (structure stays the same)
- Adding new sections (audience/community section deferred)
- Actual GitHub link (placeholder `#github` for now)
- Local-first messaging (future feature, not yet built)
