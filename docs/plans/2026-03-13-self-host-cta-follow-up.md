# Self-Host CTA Follow-Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the hero CTA targets, add the missing self-host docs page, remove the GitHub cue from the self-host button, and align the footer tagline with the updated brand.

**Architecture:** Keep the marketing changes in `apps/site` and add the missing documentation page in `apps/docs`. Reuse the existing landing-content data source for URL and footer text, make the hero component render the secondary CTA without the GitHub icon, and add one concise self-host quick-start page in the docs app.

**Tech Stack:** Astro 5, TypeScript, Bun, `apps/site`, `apps/docs`

---

### Task 1: Point the hero CTA to the live demo and update footer copy

**Files:**
- Modify: `apps/site/src/lib/landing-content.ts`

**Step 1: Update the CTA URL and footer tagline**

Change the shared content values:

```ts
const DEMO_URL = 'https://demo.allowealth.io';
const SELF_HOST_DOCS_URL = 'https://docs.allowealth.io/self-host';

export const heroContent = {
  // ...
  ctaGuest: 'Try the Demo',
  ctaSecondary: 'Your data, your rules',
  ctaGuestHref: DEMO_URL,
  ctaSecondaryHref: SELF_HOST_DOCS_URL,
};

export const brandContent = {
  // ...
  copyright: `© ${new Date().getFullYear()} allowealth. Allow your wealth to grow`,
};
```

If `ctaGuestHref` does not exist yet, add it to the hero content object and wire it in the next task.

**Step 2: Verify the content values**

Run:

```bash
grep -n "https://demo.allowealth.io" apps/site/src/lib/landing-content.ts
grep -n "Allow your wealth to grow" apps/site/src/lib/landing-content.ts
```

Expected: both greps return exactly one match.

**Step 3: Commit**

```bash
git add apps/site/src/lib/landing-content.ts
git commit -m "feat(site): update demo CTA target and footer tagline"
```

### Task 2: Remove the GitHub icon from the secondary hero CTA

**Files:**
- Modify: `apps/site/src/components/molecules/landing/HeroSection.astro`

**Step 1: Remove the GitHub icon import and icon markup**

Keep the secondary CTA button, classes, label, and href. Remove only the GitHub icon so the button renders as plain text.

Target result:

```astro
<a
  href={heroContent.ctaSecondaryHref ?? '#showcase'}
  class="..."
>
  {heroContent.ctaSecondary}
</a>
```

**Step 2: Verify the component**

Run:

```bash
grep -n "GitHubIcon" apps/site/src/components/molecules/landing/HeroSection.astro || true
grep -n "ctaSecondary" apps/site/src/components/molecules/landing/HeroSection.astro
```

Expected: the first grep returns no matches. The second grep returns the secondary CTA binding.

**Step 3: Commit**

```bash
git add apps/site/src/components/molecules/landing/HeroSection.astro
git commit -m "feat(site): simplify self-host hero CTA"
```

### Task 3: Add the self-host quick-start page to the docs app

**Files:**
- Create: `apps/docs/src/pages/self-host.astro`
- Check for reuse: `apps/docs/src/layouts/**`
- Check for reuse: `apps/docs/src/components/**`

**Step 1: Inspect the docs app structure**

Review the existing docs app page and layout patterns before writing the new page:

```bash
find apps/docs/src -maxdepth 3 -type f | sort
```

Expected: identify the layout and page structure used by the docs app.

**Step 2: Add the page**

Create a concise quick-start page with these sections:

- page title and short intro
- who self-hosting is for
- prerequisites
- fastest start path
- environment or deployment notes
- first login / first checks
- next steps

Prefer short paragraphs, bullets, and code blocks over long prose.

**Step 3: Verify the file exists and contains the core headings**

Run:

```bash
grep -n "Self-Host Allowealth\\|Prerequisites\\|Quick Start\\|Next steps" apps/docs/src/pages/self-host.astro
```

Expected: all headings are present.

**Step 4: Commit**

```bash
git add apps/docs/src/pages/self-host.astro
git commit -m "docs: add self-host quick-start guide"
```

### Task 4: Verify both apps and the final acceptance criteria

**Files:**
- Verify: `apps/site/**`
- Verify: `apps/docs/**`

**Step 1: Build the marketing site**

Run:

```bash
cd apps/site && bun run build
```

Expected: build completes with no errors.

**Step 2: Build the docs site**

Run:

```bash
cd apps/docs && bun run build
```

Expected: build completes with no errors.

**Step 3: Run repo-root typecheck**

Run:

```bash
bun run typecheck
```

Expected: 0 errors.

**Step 4: Verify the final acceptance checks**

Run:

```bash
grep -n "https://demo.allowealth.io" apps/site/src/lib/landing-content.ts
grep -n "Allow your wealth to grow" apps/site/src/lib/landing-content.ts
grep -n "GitHubIcon" apps/site/src/components/molecules/landing/HeroSection.astro || echo "PASS: not found"
test -f apps/docs/src/pages/self-host.astro && echo "PASS: self-host page exists"
grep -n "Self-Host Allowealth" apps/docs/src/pages/self-host.astro
```

Expected:
- the demo URL grep returns one match
- the footer copy grep returns one match
- the hero icon grep returns `PASS: not found`
- the file check returns `PASS: self-host page exists`
- the docs heading grep returns one match

**Step 5: Commit**

```bash
git add apps/site apps/docs
git commit -m "chore: verify self-host CTA follow-up"
```
