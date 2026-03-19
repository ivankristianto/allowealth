# Mobile Blur Performance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the iOS Safari blur risk from always-visible app surfaces, keep transient overlay blur where it is safe, and lock the rule down so it does not regress.

**Architecture:** Treat this as an audit-plus-guardrail change. First, add regression coverage that reads the source files and enforces the blur policy directly. Second, tighten the design-system rule with an explicit allowed/disallowed matrix and a repeatable grep-based audit command. Finally, only touch component files if the audit finds a true violation.

**Tech Stack:** Astro 5.x, Bun test, Markdown docs, DaisyUI v5 / Tailwind CSS v4, iPhone Safari manual verification

---

## Files Modified

| File | What changes |
|------|-------------|
| `src/__tests__/mobile-blur-performance.test.ts` | New regression test for allowed vs. disallowed blur usage and the audit command |
| `.claude/rules/frontend/design-system.md` | Expand the iOS Safari blur guidance with a repeatable repo-wide audit command and explicit examples of safe transient overlays |
| `src/components/layouts/Header.astro` | Verify no blur remains on the fixed header; modify only if the audit finds a violation |
| `src/components/layouts/MobileNavigation.astro` | Verify the fixed bottom nav stays blur-free; modify only if the audit finds a violation |
| `src/components/layouts/MobileCommandCenter.astro` | Keep only transient overlay blur; reduce or remove any persistent blur found by the audit |
| `src/components/molecules/Drawer.astro` | Confirm the small transient blur remains allowed and unchanged |
| `src/components/molecules/Modal.astro` | Confirm the small transient blur remains allowed and unchanged |
| `src/components/organisms/CategoryDrillDownModal.astro` | Confirm the sticky modal nav stays within the allowed transient blur policy |

---

### Task 1: Add regression coverage for the blur policy

**Files:**
- Create: `src/__tests__/mobile-blur-performance.test.ts`

- [ ] **Step 1: Write the failing test**

Add a Bun test that reads the source files and checks three things:

1. Fixed or always-visible surfaces do not use disallowed blur classes.
2. The transient overlay files still use only the small blur radii that the policy allows.
3. `.claude/rules/frontend/design-system.md` includes a repeatable audit command, such as `grep -r "backdrop-blur\\|blur-" src/`.

Use the existing file-reading style from `src/__tests__/public-static-security.test.ts` and `src/__tests__/root-app-boundaries.test.ts`.

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// read files, assert the blur policy, and assert the audit command exists
```

- [ ] **Step 2: Run the targeted test and verify the current state fails where expected**

Run: `bun test src/__tests__/mobile-blur-performance.test.ts -v`

Expected: fail until the design-system rule includes the new audit guidance.

- [ ] **Step 3: Keep the test focused on policy, not implementation details**

If the test starts to overfit one component, tighten it to the policy boundary instead: allowed transient overlays vs. disallowed fixed surfaces.

---

### Task 2: Tighten the blur policy and normalize any audit outliers

**Files:**
- Modify: `.claude/rules/frontend/design-system.md`
- Modify only if the audit finds a violation: `src/components/layouts/Header.astro`, `src/components/layouts/MobileNavigation.astro`, `src/components/layouts/MobileCommandCenter.astro`

- [ ] **Step 1: Update the design-system rule**

- Add explicit `### Allowed`, `### Disallowed`, and `### Replacement Patterns` subsections under `## CSS Blur Performance (iOS Safari)`.
- Keep the allowed cases limited to the safe transient overlay surfaces:
  - modal backdrops
  - drawer backdrops
  - the category drill-down modal nav strip
- List the disallowed cases the spec calls out:
  - `backdrop-blur-xl` or larger on fixed or always-visible elements
  - decorative `blur-*` blobs used as ambient glow
  - any permanent mobile compositor layer created by blur on a persistent surface
- Add a short `### Verification` subsection that documents the repo-wide grep command used to audit blur usage.

- [ ] **Step 2: Remove only true violations**

Run a repo-wide audit first:

```bash
grep -r "backdrop-blur\|blur-" /Users/ivan/Works/allowealth --exclude-dir=node_modules
```

Inspect every match. If any fixed or always-visible surface still uses `backdrop-blur-xl`, `backdrop-blur-2xl`, or a decorative `blur-*` layer, replace it with a solid/near-opaque background or a radial gradient.

Do not change `Drawer.astro`, `Modal.astro`, or `CategoryDrillDownModal.astro` unless the audit proves they exceed the allowed transient blur policy.

- [ ] **Step 3: Re-run the audit and targeted test**

Run:

```bash
grep -r "backdrop-blur\|blur-" src/ --exclude-dir=node_modules
bun test src/__tests__/mobile-blur-performance.test.ts -v
```

Expected:
- no disallowed blur remains in fixed or always-visible surfaces
- the policy test passes

- [ ] **Step 4: Commit**

```bash
git add .claude/rules/frontend/design-system.md src/__tests__/mobile-blur-performance.test.ts src/components/layouts/Header.astro src/components/layouts/MobileNavigation.astro src/components/layouts/MobileCommandCenter.astro src/components/molecules/Drawer.astro src/components/molecules/Modal.astro src/components/organisms/CategoryDrillDownModal.astro
git commit -m "perf(docs): lock down iOS Safari blur policy"
```

---

### Task 3: Verify behavior on a real mobile browser

**Files:**
- None

- [ ] **Step 1: Run the project checks that cover this change**

Run:

```bash
bun run typecheck
bun run test -- src/__tests__/mobile-blur-performance.test.ts
```

- [ ] **Step 2: Verify the relevant screens in iPhone Safari**

Use `agent-browser` in iOS mode or a real device to open the main app and confirm:

- the fixed header looks unchanged
- the mobile bottom nav looks unchanged
- modal and drawer overlays still feel acceptable
- no obvious scroll or reload jank appears on the affected surfaces

- [ ] **Step 3: Close out the branch only after the audit is clean**

If the grep still finds a disallowed blur class, fix that file before marking the work done.
