# Server Stats Summary Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the top Server Stats summary strip in the shared diagnostics view into a denser, console-style operations snapshot without changing diagnostics data, routing, or lower detail sections.

**Architecture:** Keep all existing diagnostics data shaping and status helpers in `DiagnosticsDisplay.astro`, but replace the summary-strip presentation with a console-readout card structure: compact header, primary value, and 2-3 key/value diagnostic rows per card. Constrain the change to the shared summary section so both `/settings` and `/admin/diagnostics` inherit the new presentation without further service or page-level changes.

**Tech Stack:** Astro 5, TypeScript frontmatter, Tailwind v4, DaisyUI v5, Bun test, existing `Card` primitive, Lucide icons.

---

## File Map

| Action | File | Responsibility |
| --- | --- | --- |
| Modify | `tests/regression/settings-modal-migration.test.ts` | Lock the new console-summary structure and prevent regressions back to icon-chip-plus-badges layout |
| Modify | `src/components/organisms/DiagnosticsDisplay.astro` | Replace the current diagnostics summary strip with the approved console-style readout cards |
| Verify only, modify if needed | `src/pages/settings/index.astro` | Confirm the shared diagnostics component still fits the Server Stats tab wrapper |
| Verify only, modify if needed | `src/pages/admin/diagnostics.astro` | Confirm the shared diagnostics component still fits the admin diagnostics page |
| Verify only | `tests/architecture/ui-style-consistency.test.ts` | Ensure any touched UI classes still follow design-system rules |

## Constraints From The Approved Spec

- Change only the top `data-testid="diagnostics-summary"` section in `DiagnosticsDisplay.astro`.
- Do not change diagnostics service logic, API shape, or page routing.
- Remove the large decorative icon chip from the summary cards.
- Use a compact console-readout hierarchy: header, large primary value, diagnostic rows.
- Keep semantic colors restrained to status markers and small glyph accents.
- Preserve responsive behavior: one-column stack on small screens, three columns on larger screens.
- Keep the lower diagnostics blocks unchanged in scope: configuration status, runtime details, database section, cache section, environment variables, and timestamp footer.
- Verify both reuse points: `/settings` and `/admin/diagnostics`.

## Task 1: Lock The Summary Redesign In Regression Tests

**Files:**
- Modify: `tests/regression/settings-modal-migration.test.ts`

- [ ] **Step 1: Add failing assertions for the console-summary structure**

Extend the existing diagnostics regression block so it protects the approved redesign instead of the old summary-card shape.

Add assertions that the summary source:

- still includes `data-testid="diagnostics-summary"`
- no longer contains the old large icon-chip utility cluster for the summary cards:
  - `flex h-12 w-12 items-center justify-center rounded-2xl`
- no longer renders summary metadata as floating badges by default
- includes row-style metadata labels for the summary cards:
  - `Environment`
  - `App Version`
  - `Driver`
  - `Enabled`
- includes a compact header marker pattern for each card instead of the old icon box

Use the existing helper style in this file (`read`, `readTemplate`, `expectInAscendingOrder`) rather than introducing a new test harness.

- [ ] **Step 2: Add one order-sensitive summary assertion**

Add one test that verifies the summary card content order matches the new readout structure at a high level:

1. summary label
2. primary value
3. diagnostic rows

Prefer a targeted string-order assertion over brittle full-template snapshots.

- [ ] **Step 3: Run the targeted regression test and confirm it fails**

Run:

```bash
bun test tests/regression/settings-modal-migration.test.ts
```

Expected:

- the new console-summary assertions fail before implementation
- no unrelated regression block changes are needed yet

- [ ] **Step 4: Commit the failing-test coverage after the implementation passes**

```bash
git add tests/regression/settings-modal-migration.test.ts
git commit -m "test(diagnostics): lock console summary redesign"
```

## Task 2: Replace The Summary Strip With Console-Style Readout Cards

**Files:**
- Modify: `src/components/organisms/DiagnosticsDisplay.astro`

- [ ] **Step 1: Keep the existing summary data logic intact**

Before touching markup, preserve the current shared logic in frontmatter:

- `cacheStatus`
- `connStatus`
- `configurationStatus`
- `badgeClass(...)` and other helpers still used outside the summary strip

Do not introduce new diagnostics data dependencies for this redesign.

- [ ] **Step 2: Remove the old icon-chip summary card composition**

In the top `diagnostics-summary` section, delete the existing repeated pattern:

- icon box with `h-12 w-12 rounded-2xl`
- stacked label/value block
- badge row for metadata

Keep the outer summary grid and `Card` usage so the redesign stays aligned with the page’s existing surfaces.

- [ ] **Step 3: Build the approved console-readout structure for all three cards**

Refactor each summary card to this structure:

```astro
<Card padding="lg">
  <div class="...console card layout...">
    <div class="...header row...">
      <div>
        <p class="...uppercase label...">Runtime</p>
        <p class="...status marker...">Nominal</p>
      </div>
      <div class="...small telemetry glyph..." aria-hidden="true">...</div>
    </div>

    <p class="...primary value...">{data.runtime.runtime}</p>

    <dl class="...diagnostic rows...">
      <div class="...row...">
        <dt>Environment</dt>
        <dd>{data.runtime.environment}</dd>
      </div>
    </dl>
  </div>
</Card>
```

Apply the same shape to:

- `Runtime`
- `Data Layer`
- `Caching`

Requirements:

- large, high-contrast primary value
- 2-3 diagnostic rows per card
- subtle row dividers
- small telemetry glyph in the header instead of a large icon chip
- restrained semantic color on status marker and glyph only

- [ ] **Step 4: Use concrete row content from the approved spec**

Render these rows when data is available:

- Runtime:
  - `Environment`
  - `App Version`
  - `Region`
- Data Layer:
  - `Driver`
  - `Mode` or closest existing platform/detail field available from current data
  - `Queries`
- Caching:
  - `Driver`
  - `Enabled`
  - short operational note only if it can be derived from existing state without new logic

If a planned row has no reliable current source, omit that row rather than inventing a placeholder.

- [ ] **Step 5: Keep the rest of DiagnosticsDisplay unchanged**

Do not modify:

- configuration status block order
- runtime detail section
- database detail section
- cache detail section
- environment variable section
- timestamp footer

The redesign is complete when only the summary-strip presentation has materially changed.

- [ ] **Step 6: Run the targeted regression test and make it pass**

Run:

```bash
bun test tests/regression/settings-modal-migration.test.ts
```

Expected:

- the new diagnostics summary assertions pass
- existing diagnostics-order assertions still pass

- [ ] **Step 7: Commit the implementation**

```bash
git add src/components/organisms/DiagnosticsDisplay.astro tests/regression/settings-modal-migration.test.ts
git commit -m "feat(diagnostics): redesign server stats summary strip"
```

## Task 3: Verify Shared Rendering, Design-System Compliance, And Quality Gates

**Files:**
- Verify: `src/pages/settings/index.astro`
- Verify: `src/pages/admin/diagnostics.astro`
- Verify: `tests/architecture/ui-style-consistency.test.ts`

- [ ] **Step 1: Run focused automated checks**

Run:

```bash
bun test tests/regression/settings-modal-migration.test.ts
bun test tests/architecture/ui-style-consistency.test.ts
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

Expected:

- no diagnostics-summary regressions
- no design-system violations from the new summary-card classes
- full quality gates pass

- [ ] **Step 2: Verify both browser surfaces manually**

Check:

1. `/settings` → Server Stats tab
2. `/admin/diagnostics`

Confirm:

- the three summary cards read as denser operations snapshots
- the icon no longer feels cramped because the large icon chip is gone
- row labels remain readable on desktop and mobile
- the lower diagnostics sections are unchanged in order and content

- [ ] **Step 3: Run the design-system audit on the resulting PR changes**

Use `design-system-auditor` against the current PR diff after implementation. Fix any valid findings before closing the task.

- [ ] **Step 4: Commit any audit or verification follow-up**

```bash
git add src/components/organisms/DiagnosticsDisplay.astro tests/regression/settings-modal-migration.test.ts
git commit -m "fix(diagnostics): polish summary strip audit findings"
```

Create this commit only if the audit or manual verification requires code changes.

## Manual Review Notes

- This plan was self-reviewed against the approved spec because no explicitly user-authorized subagent review was requested in this session.
- The plan keeps scope narrow by touching only the shared summary section and one regression file.
- The main implementation risk is over-styling the summary cards; execution should prefer compact structure over decorative console effects.

## Done When

- The summary strip uses the approved console-style readout hierarchy.
- The large icon chip is removed from the summary cards.
- Metadata is presented as diagnostic rows instead of floating badges.
- Both `/settings` and `/admin/diagnostics` render the new summary cleanly.
- Regression, design-system, and quality-gate checks pass.
