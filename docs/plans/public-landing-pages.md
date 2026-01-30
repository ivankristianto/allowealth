# Public Landing Pages Architecture Plan

**Version:** 1.1.0
**Created:** 2025-01-30
**Updated:** 2025-01-30
**Status:** Implementation Complete - Pending E2E Tests

## Overview

Redesign the homepage and create a public layout for non-logged-in users, including marketing landing page, pricing table, legal pages, and contact form.

---

## 1. Dependencies

**Existing (no new packages required):**

- `@lucide/astro` - Icons (replaces `material-icons-round` from PoC)
- `motion` - Animations
- DaisyUI v5 + Tailwind v4 - Styling

**No new dependencies needed** - the PoC uses React, but we convert to Astro SSR components.

---

## 2. File Structure

```
src/
├── layouts/
│   └── PublicLayout.astro              # ✅ DONE - Landing page layout
├── components/
│   ├── layouts/
│   │   ├── PublicNavbar.astro          # ✅ DONE - Glass navigation bar
│   │   └── PublicFooter.astro          # ✅ DONE - Landing page footer
│   └── organisms/
│       └── landing/
│           ├── HeroSection.astro       # ✅ DONE - Hero with CTA
│           ├── ShowcaseSection.astro   # ✅ DONE - Feature showcase rows
│           ├── FeaturesGrid.astro      # ✅ DONE - Bento grid features
│           └── PricingSection.astro    # ✅ DONE - Pricing table
├── pages/
│   ├── index.astro                     # ✅ DONE - Public landing
│   ├── terms.astro                     # ✅ DONE - Terms & Conditions
│   ├── privacy.astro                   # ✅ DONE - Privacy Policy
│   └── contact.astro                   # ✅ DONE - Contact page (static form)
└── lib/
    └── landing-content.ts              # ✅ DONE - Centralized content data
```

**Total: 11 new files, 1 modified file** - ALL COMPLETE

---

## 3. Security Considerations

| Concern                  | Mitigation                                                                                                         | Status |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------ |
| **XSS in content**       | Static content only, no user input on public pages                                                                 | ✅     |
| **External images**      | Added `crossorigin="anonymous"` to Unsplash images                                                                 | ✅     |
| **Form on Contact page** | Static placeholder only (no backend). When implemented: server-side validation + CSRF protection via Astro actions | ✅     |
| **Open redirect**        | Hardcode `/transactions` and `/signup` as destinations (no query params)                                           | ✅     |
| **Rate limiting**        | Not needed for static pages; Contact form would need rate limiting when functional                                 | N/A    |

---

## 4. Key Architectural Decisions

| Decision                               | Rationale                                                                | Status |
| -------------------------------------- | ------------------------------------------------------------------------ | ------ |
| **Separate `PublicLayout`**            | No sidebar/drawer, different nav/footer for marketing pages              | ✅     |
| **Content in `landing-content.ts`**    | Single source of truth for pricing/features, easy to update              | ✅     |
| **No React conversion**                | Astro components are SSR, better performance, follow project standards   | ✅     |
| **`#` links for unimplemented routes** | Per requirements, links point to `#` until pages exist                   | ✅     |
| **Placeholder images**                 | Use Unsplash URLs from PoC for now (same as reference)                   | ✅     |
| **Homepage for all users**             | Landing page always visible; CTA button text changes based on auth state | ✅     |
| **Responsive**                         | Supported mobile view, read the design-system                            | ✅     |
| **Dark mode**                          | Supported both dark mode and light mode                                  | ✅     |

---

## 5. Implementation Tasks (Ordered)

| #   | Task                            | Dependencies                                 | Status |
| --- | ------------------------------- | -------------------------------------------- | ------ |
| 1   | Create `lib/landing-content.ts` | None                                         | ✅     |
| 2   | Create `PublicNavbar.astro`     | Lucide icons                                 | ✅     |
| 3   | Create `PublicFooter.astro`     | `landing-content.ts`                         | ✅     |
| 4   | Create `PublicLayout.astro`     | `PublicNavbar`, `PublicFooter`, `BaseLayout` | ✅     |
| 5   | Create `HeroSection.astro`      | Motion animations                            | ✅     |
| 6   | Create `ShowcaseSection.astro`  | None                                         | ✅     |
| 7   | Create `FeaturesGrid.astro`     | Lucide icons                                 | ✅     |
| 8   | Create `PricingSection.astro`   | `landing-content.ts`, Lucide icons           | ✅     |
| 9   | Redesign `index.astro`          | All landing components                       | ✅     |
| 10  | Create `terms.astro`            | `PublicLayout`                               | ✅     |
| 11  | Create `privacy.astro`          | `PublicLayout`                               | ✅     |
| 12  | Create `contact.astro`          | `PublicLayout`                               | ✅     |

---

## 5.1 Known Issues & TODOs

Issues identified during code review and documented in code:

| Priority | Issue                                         | Location                      | Status       |
| -------- | --------------------------------------------- | ----------------------------- | ------------ |
| P2       | Add mobile navigation menu (hamburger/drawer) | `PublicNavbar.astro`          | TODO in code |
| P2       | Replace deprecated Lucide brand icons         | `PublicFooter.astro`          | TODO in code |
| P2       | Implement backend with CSRF + rate limiting   | `contact.astro`               | TODO in code |
| P2       | Ensure Tailwind safelist for dynamic classes  | Multiple components           | Verified OK  |
| ✅       | Add `prefers-reduced-motion` for animations   | `HeroSection`, `PublicLayout` | Fixed        |
| ✅       | Fix incorrect ARIA roles in navbar            | `PublicNavbar.astro`          | Fixed        |
| ✅       | Remove incorrect `role="status"` from badge   | `HeroSection.astro`           | Fixed        |
| ✅       | Add `aria-describedby` to form fields         | `contact.astro`               | Fixed        |
| ✅       | Add `crossorigin` to external images          | `ShowcaseSection.astro`       | Fixed        |

---

## 6. User Stories (Playwright-ready)

### Navigation & Routing

| ID    | Story                            | Given                          | When                             | Then                                                     |
| ----- | -------------------------------- | ------------------------------ | -------------------------------- | -------------------------------------------------------- |
| US-01 | Guest visits homepage            | I am not logged in             | I navigate to `/`                | I see the landing page with "Start Your Free Ledger" CTA |
| US-02 | Logged-in user visits homepage   | I am logged in                 | I navigate to `/`                | I see the landing page with "Go to Dashboard" CTA        |
| US-03 | Navigate to pricing section      | I am on the homepage           | I click "Pricing" in navbar      | Page scrolls to `#pricing` section                       |
| US-04 | Navigate to features section     | I am on the homepage           | I click "Platform" in navbar     | Page scrolls to `#features` section                      |
| US-05 | Navigate to showcase section     | I am on the homepage           | I click "Showcase" in navbar     | Page scrolls to `#showcase` section                      |
| US-06 | Guest clicks CTA button          | I am not logged in on homepage | I click "Start Your Free Ledger" | I am redirected to `/signup`                             |
| US-07 | Logged-in user clicks CTA button | I am logged in on homepage     | I click "Go to Dashboard"        | I am redirected to `/transactions`                       |
| US-08 | Navigate to Terms page           | I am on any public page        | I click "Terms" in footer        | I navigate to `/terms`                                   |
| US-09 | Navigate to Privacy page         | I am on any public page        | I click "Privacy" in footer      | I navigate to `/privacy`                                 |
| US-10 | Navigate to Contact page         | I am on any public page        | I click "Contact" in footer      | I navigate to `/contact`                                 |

### Pricing Section

| ID    | Story                        | Given                        | When                              | Then                                                   |
| ----- | ---------------------------- | ---------------------------- | --------------------------------- | ------------------------------------------------------ |
| US-11 | View pricing tiers           | I am on the homepage         | I scroll to pricing section       | I see 3 pricing cards: Starter, Pro, Expert            |
| US-12 | Pro tier is highlighted      | I am viewing pricing section | I look at pricing cards           | Pro tier has "Most Popular" badge and distinct styling |
| US-13 | Guest clicks pricing CTA     | I am not logged in           | I click "Select Plan" on any tier | I am redirected to `/signup`                           |
| US-14 | Logged-in clicks pricing CTA | I am logged in               | I click "Select Plan" on any tier | I am redirected to `/transactions`                     |

### Contact Page

| ID    | Story                             | Given                    | When                                  | Then                                                       |
| ----- | --------------------------------- | ------------------------ | ------------------------------------- | ---------------------------------------------------------- |
| US-15 | View contact form                 | I navigate to `/contact` | Page loads                            | I see form with Name, Email, Message fields                |
| US-16 | Submit contact form (placeholder) | I fill out contact form  | I click "Send Message"                | I see toast "Coming soon - contact feature in development" |
| US-17 | Form validation - empty fields    | I am on contact page     | I click submit without filling fields | I see validation errors on required fields                 |

### Legal Pages

| ID    | Story                        | Given                          | When            | Then                                             |
| ----- | ---------------------------- | ------------------------------ | --------------- | ------------------------------------------------ |
| US-18 | View Terms page              | I navigate to `/terms`         | Page loads      | I see Terms & Conditions heading and content     |
| US-19 | View Privacy page            | I navigate to `/privacy`       | Page loads      | I see Privacy Policy heading and content         |
| US-20 | Legal pages use PublicLayout | I am on `/terms` or `/privacy` | I view the page | I see PublicNavbar and PublicFooter (no sidebar) |

### Responsive Behavior

| ID    | Story                 | Given                | When                    | Then                                                    |
| ----- | --------------------- | -------------------- | ----------------------- | ------------------------------------------------------- |
| US-21 | Mobile navbar         | Viewport is < 1024px | I view the navbar       | Nav links are hidden, only logo and CTA button visible  |
| US-22 | Mobile pricing cards  | Viewport is < 768px  | I view pricing section  | Cards stack vertically (1 column)                       |
| US-23 | Desktop pricing cards | Viewport is ≥ 768px  | I view pricing section  | Cards display in 3-column grid                          |
| US-24 | Mobile showcase rows  | Viewport is < 1024px | I view showcase section | Image and text stack vertically                         |
| US-25 | Desktop showcase rows | Viewport is ≥ 1024px | I view showcase section | Image and text display side-by-side, alternating layout |

### Accessibility

| ID    | Story                        | Given                           | When                         | Then                                              |
| ----- | ---------------------------- | ------------------------------- | ---------------------------- | ------------------------------------------------- |
| US-26 | Keyboard navigation - navbar | I am using keyboard             | I press Tab through navbar   | All links receive visible focus outline           |
| US-27 | Keyboard navigation - CTA    | I focus the main CTA button     | I press Enter                | Button activates (redirect occurs)                |
| US-28 | Skip to content              | I am using keyboard on homepage | I press Tab once             | "Skip to content" link appears                    |
| US-29 | Screen reader - pricing      | I use screen reader on pricing  | I navigate pricing cards     | Each tier name, price, and features are announced |
| US-30 | Contrast ratios              | I view any public page          | I run axe accessibility scan | No color contrast violations                      |

### Theme Support

| ID    | Story                   | Given                    | When                 | Then                                |
| ----- | ----------------------- | ------------------------ | -------------------- | ----------------------------------- |
| US-31 | Dark mode on landing    | System prefers dark mode | I visit homepage     | Page renders with dark theme colors |
| US-32 | Theme toggle on landing | I am on homepage         | I click theme toggle | Theme switches between light/dark   |

---

## 7. Playwright Test Structure

```
tests/
└── e2e/
    └── landing/
        ├── homepage.spec.ts       # US-01 to US-07, US-21 to US-25
        ├── navigation.spec.ts     # US-03 to US-05, US-08 to US-10
        ├── pricing.spec.ts        # US-11 to US-14
        ├── contact.spec.ts        # US-15 to US-17
        ├── legal-pages.spec.ts    # US-18 to US-20
        ├── accessibility.spec.ts  # US-26 to US-30
        └── theme.spec.ts          # US-31 to US-32
```

---

## 8. Example Playwright Tests

### Homepage CTA Behavior (US-01, US-02)

```typescript
// tests/e2e/landing/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage CTA behavior', () => {
  test('US-01: Guest sees "Start Your Free Ledger" CTA', async ({ page }) => {
    // Given: I am not logged in
    await page.context().clearCookies();

    // When: I navigate to /
    await page.goto('/');

    // Then: I see the landing page with guest CTA
    await expect(page.getByRole('button', { name: /start your free ledger/i })).toBeVisible();
  });

  test('US-02: Logged-in user sees "Go to Dashboard" CTA', async ({ page }) => {
    // Given: I am logged in
    await loginAsTestUser(page);

    // When: I navigate to /
    await page.goto('/');

    // Then: I see the landing page with dashboard CTA
    await expect(page.getByRole('button', { name: /go to dashboard/i })).toBeVisible();
  });
});
```

### Pricing Section (US-11, US-12)

```typescript
// tests/e2e/landing/pricing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Pricing section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('US-11: View pricing tiers', async ({ page }) => {
    // When: I scroll to pricing section
    await page.locator('#pricing').scrollIntoViewIfNeeded();

    // Then: I see 3 pricing cards
    await expect(page.getByRole('heading', { name: 'Starter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Expert' })).toBeVisible();
  });

  test('US-12: Pro tier is highlighted', async ({ page }) => {
    // When: I look at pricing cards
    await page.locator('#pricing').scrollIntoViewIfNeeded();

    // Then: Pro tier has "Most Popular" badge
    const proCard = page.locator('[data-tier="pro"]');
    await expect(proCard.getByText('Most Popular')).toBeVisible();
  });
});
```

### Contact Form (US-15, US-16, US-17)

```typescript
// tests/e2e/landing/contact.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Contact page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('US-15: View contact form', async ({ page }) => {
    // Then: I see form with required fields
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
  });

  test('US-16: Submit contact form shows coming soon toast', async ({ page }) => {
    // Given: I fill out contact form
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/message/i).fill('Test message');

    // When: I click "Send Message"
    await page.getByRole('button', { name: /send message/i }).click();

    // Then: I see coming soon toast
    await expect(page.getByText(/coming soon/i)).toBeVisible();
  });

  test('US-17: Form validation - empty fields', async ({ page }) => {
    // When: I click submit without filling fields
    await page.getByRole('button', { name: /send message/i }).click();

    // Then: I see validation errors
    await expect(page.getByLabel(/name/i)).toHaveAttribute('aria-invalid', 'true');
  });
});
```

### Responsive Behavior (US-21, US-22)

```typescript
// tests/e2e/landing/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Responsive behavior', () => {
  test('US-21: Mobile navbar hides nav links', async ({ page }) => {
    // Given: Viewport is < 1024px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Then: Nav links are hidden
    await expect(page.getByRole('link', { name: /platform/i })).toBeHidden();
    await expect(page.getByRole('link', { name: /pricing/i })).toBeHidden();

    // But logo and CTA are visible
    await expect(page.locator('[data-logo]')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /enter dashboard|start your free/i })
    ).toBeVisible();
  });

  test('US-22: Mobile pricing cards stack vertically', async ({ page }) => {
    // Given: Viewport is < 768px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.locator('#pricing').scrollIntoViewIfNeeded();

    // Then: Cards are in single column (check vertical arrangement)
    const cards = page.locator('[data-pricing-card]');
    const boxes = await cards.boundingBox();
    // Verify cards stack (implementation detail: check CSS grid)
  });
});
```

### Accessibility (US-26, US-30)

```typescript
// tests/e2e/landing/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('US-26: Keyboard navigation - navbar links have focus outline', async ({ page }) => {
    await page.goto('/');

    // When: I press Tab through navbar
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Logo
    await page.keyboard.press('Tab'); // First nav link

    // Then: Link has visible focus
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveCSS('outline-style', /(solid|auto)/);
  });

  test('US-30: No color contrast violations', async ({ page }) => {
    await page.goto('/');

    // When: I run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

    // Then: No contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(contrastViolations).toHaveLength(0);
  });
});
```

---

## 9. Reference

**PoC Source:** `/home/ivan/works/expenses/specs/familyfinance/`

- `views/LandingView.tsx` - Main landing page structure
- `components/landing/LandingPricing.tsx` - Pricing component
- `components/landing/LandingFooter.tsx` - Footer component

**Design System:** Follow `design-system/START.md` guidelines

- Use DaisyUI classes (not Tailwind colors)
- Use `@lucide/astro` for icons
- Use `motion` for animations
- Mobile-first responsive
- Semantic HTML

---

## 10. Quality Gates (Pre-merge)

- [x] `bun run lint:fix` passes
- [x] `bun run stylelint:fix` passes
- [x] `bun run format:fix` passes
- [x] `bun run typecheck` passes
- [ ] All user stories manually verified
- [ ] Playwright tests written and passing
- [ ] Accessibility audit (axe) passes
- [ ] Mobile responsive verified (375px, 768px, 1024px, 1440px)

---

## 11. Next Steps

1. **Manual Verification** - Test all user stories manually in browser
2. **Write Playwright E2E Tests** - Create test files per Section 7 structure
3. **Accessibility Audit** - Run axe-core scan on all pages
4. **Responsive Testing** - Verify at 375px, 768px, 1024px, 1440px breakpoints
5. **Cross-browser Testing** - Test in Chrome, Firefox, Safari
