# Marketing Site Copywriting & Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update marketing site copy and navbar to reflect the "control" brand positioning and establish a clear dual-path CTA for demo vs. self-hosting.

**Architecture:** Pure copy changes across 4 files. All content strings live in `apps/site/src/lib/landing-content.ts` (TypeScript data file). Component-level copy that isn't data-driven lives inline in `.astro` files. No logic, routing, or structural changes.

**Tech Stack:** Astro 5, TypeScript, `apps/site/` workspace (`bun run build` from that directory)

**Spec:** `docs/superpowers/specs/2026-03-13-marketing-site-copywriting-design.md`

---

## Chunk 1: Content data + navbar + component headers

### Task 1: Update hero and content data in `landing-content.ts`

**Files:**

- Modify: `apps/site/src/lib/landing-content.ts`

- [ ] **Step 1: Update `heroContent`**

  In `landing-content.ts`, replace the `heroContent` export:

  ```ts
  export const heroContent = {
    badge: 'For Households & Communities',
    title: 'Know where every dollar goes.',
    titleHighlightPrefix: 'Own where ',
    titleHighlight: "you're headed.",
    description:
      'Stop guessing where it all went. Allowealth gives households and families a clear, shared view of their money — so you can plan with confidence, not anxiety.',
    ctaGuest: 'Try the Demo',
    ctaLoggedIn: 'Go to Dashboard',
    ctaSecondary: 'Your data, your rules',
    ctaSecondaryHref: 'https://docs.allowealth.io/self-host',
  };
  ```

- [ ] **Step 2: Update showcase `description` fields**

  In the `showcaseItems` array, update only the `description` field of each item:

  | `id`           | New `description`                                                                                                                  |
  | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
  | `dashboard`    | `'No more end-of-month surprises. One shared view of spending, accounts, and budget health — so everyone stays on the same page.'` |
  | `transactions` | `'Every dollar in, every dollar out — logged and categorized. No more guessing who paid for what or where it all went.'`           |
  | `budget`       | `'Set limits before the month starts, not after. Get alerts before you overspend and stay accountable together.'`                  |
  | `accounts`     | `'Every bank account, savings pot, and investment in one place. Track across currencies without the spreadsheet juggling.'`        |
  | `reports`      | `'Spot patterns before they become problems. Category breakdowns, monthly trends, and year-over-year analysis — always at hand.'`  |

  All other fields (`id`, `icon`, `title`, `titleHighlight`, `features`, etc.) are unchanged.

- [ ] **Step 3: Update `forecast` feature card description**

  In `featureGridItems`, find the item with `id: 'forecast'` and update its `description`:

  ```ts
  {
    id: 'forecast',
    icon: 'TrendingUp',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Forecast',
    description: 'See months ahead. Model scenarios. Plan your financial future with confidence.',
    colSpan: 'md:col-span-8',
    variant: 'light',
  },
  ```

- [ ] **Step 4: Verify strings with grep**

  ```bash
  cd apps/site
  grep -n "Know where every dollar" src/lib/landing-content.ts
  grep -n "Your data, your rules" src/lib/landing-content.ts
  grep -n "No more end-of-month" src/lib/landing-content.ts
  grep -n "See months ahead" src/lib/landing-content.ts
  ```

  Expected: each grep returns exactly one match.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/site/src/lib/landing-content.ts
  git commit -m "feat(site): update landing copy with control brand positioning"
  ```

---

### Task 2: Remove "Try Demo" button from navbar

**Files:**

- Modify: `apps/site/src/components/layouts/PublicNavbar.astro`

- [ ] **Step 1: Remove the CTA button block**

  Delete the `demoUrl` variable and the button `<div>` entirely.

  Remove this line at the top of the frontmatter:

  ```ts
  const demoUrl = getPublicAppUrl('/');
  ```

  Remove the entire CTA div at the bottom of the nav:

  ```html
  <!-- CTA Button -->
  <div class="flex items-center">
    <button variant="primary" href="{demoUrl}" size="md">Try Demo</button>
  </div>
  ```

  Also remove the `Button` import if it's no longer used:

  ```ts
  import Button from '@/components/atoms/Button.astro';
  ```

  Delete the entire config import line (it has no other named imports):

  ```ts
  import { getPublicAppUrl } from '@/lib/config';
  ```

- [ ] **Step 2: Verify no dead references remain, and nav links are intact**

  ```bash
  # Confirm removed items are gone
  grep -n "demoUrl\|Try Demo\|Button\|getPublicAppUrl" apps/site/src/components/layouts/PublicNavbar.astro

  # Confirm nav links were not accidentally removed
  grep -n "Features\|Documentation" apps/site/src/components/layouts/PublicNavbar.astro
  ```

  Expected: first grep returns no matches. Second grep returns at least two matches (one per nav link).

- [ ] **Step 3: Commit**

  ```bash
  git add apps/site/src/components/layouts/PublicNavbar.astro
  git commit -m "feat(site): remove Try Demo button from navbar"
  ```

---

### Task 3: Update Features Grid section header

**Files:**

- Modify: `apps/site/src/components/molecules/landing/FeaturesGrid.astro`

- [ ] **Step 1: Update the `<h2>` and subheader `<p>`**

  Find the Section Header block and update two strings:

  ```html
  <header class="text-center mb-12 sm:mb-20">
    <h2
      id="features-title"
      class="text-3xl sm:text-4xl md:text-6xl font-bold text-base-content tracking-tighter mb-4"
    >
      Built for clarity.
    </h2>
    <p class="text-base-content/60 text-base sm:text-lg font-medium max-w-lg mx-auto">
      The foundation behind full financial control.
    </p>
  </header>
  ```

- [ ] **Step 2: Verify**

  ```bash
  grep -n "Built for clarity\|full financial control" apps/site/src/components/molecules/landing/FeaturesGrid.astro
  ```

  Expected: two matches, one per line.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/site/src/components/molecules/landing/FeaturesGrid.astro
  git commit -m "feat(site): update features grid section header copy"
  ```

---

### Task 4: Update FAQ section header

**Files:**

- Modify: `apps/site/src/components/molecules/landing/FaqSection.astro`

- [ ] **Step 1: Update section title and subheader**

  Two things change in the `<h2>`:
  - The text node before `<br />` changes from `"Clear answers for"` → `"Clear answers,"`
  - The gradient `<span>` content changes from `"shared money."` → `"no confusion."`

  Full replacement:

  ```html
  <h2
    id="faq-title"
    class="text-4xl sm:text-5xl md:text-7xl font-black text-base-content tracking-tighter mb-6 leading-[1.1]"
  >
    Clear answers,<br />
    <span class="text-transparent bg-clip-text bg-gradient-to-r from-accent to-info italic"
      >no confusion.</span
    >
  </h2>
  <p class="text-base-content/60 text-lg sm:text-xl font-medium max-w-2xl mx-auto">
    Everything you need to know before you take control of your finances.
  </p>
  ```

- [ ] **Step 2: Verify**

  ```bash
  grep -n "no confusion\|take control of your finances" apps/site/src/components/molecules/landing/FaqSection.astro
  ```

  Expected: two matches.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/site/src/components/molecules/landing/FaqSection.astro
  git commit -m "feat(site): update FAQ section header copy"
  ```

---

### Task 5: Build verification and quality gates

- [ ] **Step 1: Run site build**

  ```bash
  cd apps/site && bun run build
  ```

  Expected: build completes with no errors.

- [ ] **Step 2: Run main app quality gates**

  From the repo root:

  ```bash
  bun run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 3: Verify acceptance criteria**

  Confirm each item in the spec's acceptance criteria is met by grepping key strings:

  ```bash
  # Control theme in hero
  grep "Know where every dollar" apps/site/src/lib/landing-content.ts

  # Dual-path CTAs
  grep "Try the Demo" apps/site/src/lib/landing-content.ts
  grep "Your data, your rules" apps/site/src/lib/landing-content.ts
  grep "docs.allowealth.io/self-host" apps/site/src/lib/landing-content.ts

  # Navbar CTA removed
  grep "Try Demo" apps/site/src/components/layouts/PublicNavbar.astro || echo "PASS: not found"

  # Features header
  grep "Built for clarity" apps/site/src/components/molecules/landing/FeaturesGrid.astro

  # FAQ header
  grep "no confusion" apps/site/src/components/molecules/landing/FaqSection.astro
  ```

  Expected: all greps (except the navbar one) return exactly one match. Navbar grep returns "PASS: not found".
