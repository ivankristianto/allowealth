# CSP Middleware Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove per-request HTML CSP nonce injection while keeping CSP strict and compatible with the current Astro transition architecture.

**Architecture:** Force Astro processed scripts to stay external at build time, nonce only the small set of explicit inline scripts, and simplify the middleware to set headers without touching response bodies.

**Tech Stack:** Astro 5, Cloudflare Workers, Bun test, TypeScript

---

### Task 1: Lock in the regression tests

**Files:**
- Modify: `src/__tests__/middleware/security-headers.test.ts`

**Step 1: Write the failing test**

Add a middleware test that invokes `securityHeaders()` with an HTML `Response` and asserts the original response body is still unused after the middleware runs.

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/middleware/security-headers.test.ts`

Expected: FAIL because the current middleware calls `response.text()` for HTML.

**Step 3: Add a guard test for nonce-aware inline script surfaces**

Add source-level assertions that the remaining explicit inline script components read `Astro.locals.cspNonce` and render a `nonce` attribute.

**Step 4: Run test to verify the current state**

Run: `bun test src/__tests__/middleware/security-headers.test.ts`

Expected: the new HTML body test fails before implementation.

### Task 2: Stop Astro from auto-inlining processed scripts

**Files:**
- Modify: `astro.config.ts`

**Step 1: Change the build config**

Set `vite.build.assetsInlineLimit` to `0`.

**Step 2: Keep the change minimal**

Do not touch chunking or unrelated Vite settings.

### Task 3: Nonce the deliberate inline scripts

**Files:**
- Modify: `src/components/atoms/Turnstile.astro`
- Modify: `src/components/molecules/RegistrationForm.astro`

**Step 1: Thread the nonce from Astro locals**

Read `Astro.locals.cspNonce` inside each component.

**Step 2: Apply the nonce**

Add `nonce={cspNonce}` to each explicit `is:inline` script tag.

### Task 4: Remove the HTML rewrite path

**Files:**
- Modify: `src/middleware/security-headers.ts`

**Step 1: Delete body interception helpers**

Remove HTML detection, `response.text()`, and script-tag rewriting helpers.

**Step 2: Keep CSP generation**

Preserve nonce generation, CSP header creation, and header cloning behavior.

**Step 3: Return a header-only response**

Clone headers, set the security headers, and return a new `Response` with the original body for every content type.

### Task 5: Verify the new behavior

**Files:**
- Modify: `src/__tests__/middleware/security-headers.test.ts` if assertions need final cleanup

**Step 1: Run targeted tests**

Run: `bun test src/__tests__/middleware/security-headers.test.ts`

Expected: PASS

**Step 2: Run build verification**

Run: `bun run build`

Expected: PASS and built HTML should no longer contain Astro auto-inlined processed scripts for the changed surfaces.

**Step 3: Run project quality gates relevant to the change**

Run: `bun run typecheck`

Expected: PASS
