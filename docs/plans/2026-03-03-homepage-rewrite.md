# Homepage Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite homepage content to position allowealth as a free, open-source wealth tracker for individuals, families, and small communities — removing enterprise/family-ledger branding and the pricing section.

**Architecture:** All content lives in `src/lib/landing-content.ts`. Component templates stay unchanged except `ShowcaseSection.astro` and `FeaturesGrid.astro` (new icon imports), `HeroSection.astro` (configurable secondary CTA href), and `index.astro` (remove PricingSection).

**Tech Stack:** Astro 5, TypeScript, `@lucide/astro`, DaisyUI, `src/lib/landing-content.ts`

---

## Design Reference

See `docs/plans/2026-03-03-homepage-rewrite-design.md` for approved section designs.

---

### Task 1: Rewrite `heroContent` and `brandContent` in `landing-content.ts`

**Files:**

- Modify: `src/lib/landing-content.ts`

**Step 1: Add `ctaSecondaryHref` to `heroContent` constant**

Replace the existing `heroContent` object (lines ~281–291) with:

```ts
export const heroContent = {
  badge: 'Open Source · Free Forever',
  title: 'Track your',
  titleHighlightPrefix: 'wealth. ',
  titleHighlight: 'Your way.',
  description:
    'For individuals, families, and small communities. Track income, expenses, budgets, and accounts in one place. Self-host it or use our cloud.',
  ctaGuest: 'Get Started Free',
  ctaLoggedIn: 'Go to Dashboard',
  ctaSecondary: 'View on GitHub',
  ctaSecondaryHref: '#github',
};
```

**Step 2: Replace `brandContent`**

Replace the existing `brandContent` object (lines ~297–302) with:

```ts
export const brandContent = {
  name: 'allowealth',
  tagline: 'Open source personal finance for individuals, families, and small communities.',
  copyright: `© ${new Date().getFullYear()} allowealth. Free and open source.`,
};
```

**Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors. If `ctaSecondaryHref` is not yet consumed anywhere, TypeScript is fine — it's an extra field on a plain object.

**Step 4: Commit**

```bash
git add src/lib/landing-content.ts
git commit -m "content: rewrite hero + brand copy for open source positioning"
```

---

### Task 2: Rewrite `showcaseItems` (5 items) in `landing-content.ts`

**Files:**

- Modify: `src/lib/landing-content.ts`

**Step 1: Replace the entire `showcaseItems` array (lines ~158–223) with:**

```ts
export const showcaseItems: ShowcaseItem[] = [
  {
    id: 'dashboard',
    icon: 'LayoutDashboard',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Everything in',
    titleHighlight: 'one place.',
    highlightColor: 'text-primary',
    description:
      'Get a clear picture of your finances every day. See monthly spending, account totals, and budget health at a glance — no digging required.',
    features: [
      'Monthly spending overview',
      'Account totals at a glance',
      'Budget health at a glance',
    ],
    featureIconColor: 'text-primary',
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Financial Dashboard',
    gradientClass: 'from-primary/20 to-transparent',
  },
  {
    id: 'transactions',
    icon: 'ArrowLeftRight',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'Track every dollar',
    titleHighlight: 'in and out.',
    highlightColor: 'text-accent',
    description:
      'Record income and expenses in seconds. Filter by month, category, or account. Import from CSV and keep your data accurate.',
    features: [
      'Log income and expenses',
      'Filter by month, category, account',
      'Import CSV from your bank',
    ],
    featureIconColor: 'text-accent',
    imageUrl:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Transaction Tracking',
    gradientClass: 'from-accent/20 to-transparent',
    reverse: true,
  },
  {
    id: 'budget',
    icon: 'PiggyBank',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Plan your month,',
    titleHighlight: 'not just track it.',
    highlightColor: 'text-success',
    description:
      "Set spending limits by category and stay informed when you're close to the edge. Plan each month deliberately and carry your plan forward.",
    features: ['Category limits with alerts', 'Monthly budget planning', 'Copy budgets forward'],
    featureIconColor: 'text-success',
    imageUrl:
      'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Budget Planning',
    gradientClass: 'from-success/20 to-transparent',
  },
  {
    id: 'accounts',
    icon: 'Landmark',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
    title: 'All your accounts,',
    titleHighlight: 'one workspace.',
    highlightColor: 'text-warning',
    description:
      'Connect bank accounts, savings, and investments in one place. Track balances across currencies and manage recurring transactions without manual work.',
    features: [
      'Multi-currency (IDR / USD / EUR)',
      'Bank, savings & investment accounts',
      'Recurring transactions',
    ],
    featureIconColor: 'text-warning',
    imageUrl:
      'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Account Management',
    gradientClass: 'from-warning/20 to-transparent',
    reverse: true,
  },
  {
    id: 'reports',
    icon: 'BarChart3',
    iconColor: 'text-info',
    iconBg: 'bg-info/10',
    title: 'See the',
    titleHighlight: 'full picture.',
    highlightColor: 'text-info',
    description:
      'Understand where your money goes with clear spending trends, category breakdowns, and month-over-month analysis. Export and share when you need to.',
    features: ['Spending trends by category', 'Monthly and yearly analysis', 'Export and share'],
    featureIconColor: 'text-info',
    imageUrl:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Financial Reports',
    gradientClass: 'from-info/20 to-transparent',
  },
];
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors. The `ShowcaseItem` interface has `icon: string` so new icon names are valid.

**Step 3: Commit**

```bash
git add src/lib/landing-content.ts
git commit -m "content: replace showcase with 5 feature rows (dashboard, transactions, budget, accounts, reports)"
```

---

### Task 3: Rewrite `featureGridItems` (6 bento cards) in `landing-content.ts`

**Files:**

- Modify: `src/lib/landing-content.ts`

**Step 1: Replace the entire `featureGridItems` array (lines ~229–275) with:**

```ts
export const featureGridItems: FeatureGridItem[] = [
  {
    id: 'fast',
    icon: 'Zap',
    iconColor: 'text-white',
    iconBg: 'bg-white/10',
    title: 'Fast',
    description: 'Snappy on every device. Built with performance-first development.',
    colSpan: 'md:col-span-8',
    variant: 'dark',
    size: 'large',
  },
  {
    id: 'secure',
    icon: 'Shield',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
    title: 'Secure',
    description: 'Your data is encrypted. Self-host for full control.',
    colSpan: 'md:col-span-4',
    variant: 'light',
  },
  {
    id: 'multi-currency',
    icon: 'Globe',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Multi-Currency',
    description: 'IDR, USD, EUR and more — all in one workspace.',
    colSpan: 'md:col-span-5',
    variant: 'light',
  },
  {
    id: 'for-everyone',
    icon: 'Users',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'For Everyone',
    description: 'Individuals, families, or your small community — one workspace adapts to all.',
    colSpan: 'md:col-span-7',
    variant: 'light',
    size: 'large',
  },
  {
    id: 'open-source',
    icon: 'Lock',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'You Own Your Data',
    description: 'Open source. Self-host it. No lock-in, ever.',
    colSpan: 'md:col-span-4',
    variant: 'light',
  },
  {
    id: 'forecast',
    icon: 'TrendingUp',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Forecast',
    description: 'Project savings, model scenarios, and plan your financial future.',
    colSpan: 'md:col-span-8',
    variant: 'light',
  },
];
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/landing-content.ts
git commit -m "content: replace bento grid with 6 cards (fast, secure, multi-currency, for-everyone, open-source, forecast)"
```

---

### Task 4: Update `footerLinks` in `landing-content.ts`

**Files:**

- Modify: `src/lib/landing-content.ts`

**Step 1: Replace the `footerLinks` array (lines ~111–138) with:**

```ts
export const footerLinks: FooterLinkSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Dashboard', href: '#' },
      { label: 'Transactions', href: '#' },
      { label: 'Budget', href: '#' },
      { label: 'Accounts', href: '#' },
      { label: 'Reports', href: '#' },
      { label: 'Forecast', href: '#' },
    ],
  },
  {
    title: 'Open Source',
    links: [
      { label: 'GitHub', href: '#github' },
      { label: 'Self-Host Guide', href: '#' },
      { label: 'Contributing', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Help Center', href: '#' },
      { label: 'Community', href: '#' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];
```

**Step 2: Commit**

```bash
git add src/lib/landing-content.ts
git commit -m "content: update footer links to reflect product features and open source resources"
```

---

### Task 5: Update `ShowcaseSection.astro` — add new icon imports

New showcase items use `ArrowLeftRight`, `PiggyBank`, `Landmark`, `BarChart3` icons. The `iconMap` must include all of them.

**Files:**

- Modify: `src/components/organisms/landing/ShowcaseSection.astro`

**Step 1: Replace the import line and iconMap (lines 9–17) with:**

```ts
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Landmark,
  BarChart3,
  BadgeCheck,
} from '@lucide/astro';
import { showcaseItems } from '@/lib/landing-content';

// Map icon names to components
const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Landmark,
  BarChart3,
};
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/organisms/landing/ShowcaseSection.astro
git commit -m "feat: add icon imports for new showcase items (transactions, budget, accounts, reports)"
```

---

### Task 6: Update `FeaturesGrid.astro` — add new icon imports

New bento grid items use `Zap`, `Lock`, `TrendingUp` icons. The existing `Lightbulb` import can be removed (no longer used).

**Files:**

- Modify: `src/components/molecules/landing/FeaturesGrid.astro`

**Step 1: Replace the import line and iconMap (lines 9–18) with:**

```ts
import { Globe, Users, Shield, Zap, Lock, TrendingUp } from '@lucide/astro';
import { featureGridItems } from '@/lib/landing-content';

// Map icon names to components
const iconMap: Record<string, typeof Globe> = {
  Globe,
  Users,
  Shield,
  Zap,
  Lock,
  TrendingUp,
};
```

**Step 2: Also update the section header text** (line 34) — change "Precision Utilities." and the subtitle from family language:

```astro
<h2
  id="features-title"
  class="text-3xl sm:text-4xl md:text-6xl font-bold text-base-content tracking-tighter mb-4"
>
  Built right.
</h2>
<p class="text-neutral text-base sm:text-lg font-medium max-w-lg mx-auto">
  Every tool you need to track and understand your wealth.
</p>
```

**Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/molecules/landing/FeaturesGrid.astro
git commit -m "feat: add icon imports for bento grid (Zap, Lock, TrendingUp) and update section header"
```

---

### Task 7: Update `HeroSection.astro` — use `ctaSecondaryHref` from content

The secondary CTA href is hardcoded as `#showcase`. Make it data-driven.

**Files:**

- Modify: `src/components/molecules/landing/HeroSection.astro`

**Step 1: Replace line 79 (the secondary Button):**

From:

```astro
<Button variant="secondary" href="#showcase" size="xl" className="w-full sm:w-auto">
  {heroContent.ctaSecondary}
</Button>
```

To:

```astro
<Button
  variant="secondary"
  href={heroContent.ctaSecondaryHref ?? '#showcase'}
  size="xl"
  className="w-full sm:w-auto"
>
  {heroContent.ctaSecondary}
</Button>
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors. `heroContent` is a plain object with `ctaSecondaryHref: string`, so the nullish fallback is just a safety net.

**Step 3: Commit**

```bash
git add src/components/molecules/landing/HeroSection.astro
git commit -m "feat: make hero secondary CTA href configurable via landing-content"
```

---

### Task 8: Remove `PricingSection` from `index.astro`

**Files:**

- Modify: `src/pages/index.astro`

**Step 1: Remove the import and usage of `PricingSection`**

Remove line 15:

```ts
import PricingSection from '@/components/organisms/landing/PricingSection.astro';
```

Remove line 22:

```astro
<PricingSection />
```

Also update the page `<title>` on line 18 from:

```astro
<PublicLayout title="allowealth - Master the Family Ledger" />
```

To:

```astro
<PublicLayout title="allowealth - Track Your Wealth" />
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: remove pricing section from homepage, update page title"
```

---

### Task 9: Run all quality gates

**Step 1:**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: All pass with no errors.

**Step 2: Build to catch any SSR/bundle issues**

```bash
bun run build
```

Expected: Build completes without errors.

**Step 3: If any failures, fix them before the final commit. Then commit all fixes together:**

```bash
git add -p
git commit -m "chore: fix lint/format issues after homepage rewrite"
```

---

### Task 10: Visual verification in browser

**Step 1: Start dev server**

```bash
bun run dev
```

**Step 2: Open http://localhost:4321 and verify:**

- [ ] Badge says "Open Source · Free Forever" (not "Powered by Gemini 3 Pro AI")
- [ ] Headline says "Track your wealth. Your way."
- [ ] Secondary CTA says "View on GitHub"
- [ ] No pricing section visible on the page
- [ ] Showcase has 5 rows: Dashboard, Transactions, Budget, Accounts, Reports
- [ ] Bento grid has 6 cards with updated titles (Fast, Secure, Multi-Currency, For Everyone, You Own Your Data, Forecast)
- [ ] "Fast" card description does NOT mention Cloudflare Edge
- [ ] No "family ledger", "enterprise", or paid-tier language anywhere

**Step 3: If anything looks broken, check browser console for errors and fix.**
