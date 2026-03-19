# iOS Safari Blur Cleanup — Design Spec

**Date:** 2026-03-19
**Status:** Draft
**Scope:** Main app blur audit + design-system rule update

---

## Problem

iOS Safari falls back to software rendering for expensive CSS blur effects. In this repo, blur is already avoided in some places, but the rule is not enforced consistently. The result is risk in two places:

1. **Always-visible surfaces** can still carry blur or blur-like treatments that stay on screen during scroll and reload.
2. **Future changes** can reintroduce the same pattern because the allowed vs. disallowed cases are not written down clearly enough.

The goal is to keep the current look as close as possible while removing only the blur patterns that hurt iPhone Safari.

---

## Goals

- Preserve the current visual language.
- Remove blur from fixed or always-visible surfaces.
- Keep small blur on transient overlays where it is acceptable.
- Add a clear rule in the design system so the pattern does not regress.
- Verify the final state with a repo-wide blur audit.

## Non-Goals

- No navigation redesign.
- No broad visual refresh.
- No API, state, or data-model changes.
- No removal of all blur everywhere.

---

## Findings From Exploration

The scan found these relevant surfaces in the main app:

- `src/components/layouts/Header.astro` — already uses a solid, near-opaque surface.
- `src/components/layouts/MobileNavigation.astro` — already uses gradient and shadow tokens, no blur.
- `src/components/layouts/MobileCommandCenter.astro` — uses `backdrop-blur-sm` on a fixed backdrop overlay; this is transient and acceptable.
- `src/components/molecules/Drawer.astro` — uses `backdrop-blur-sm` on a transient backdrop; acceptable.
- `src/components/molecules/Modal.astro` — uses `backdrop-blur-md` on a transient backdrop; acceptable.
- `src/components/organisms/CategoryDrillDownModal.astro` — uses `backdrop-blur-sm` on a sticky modal nav; acceptable.

The marketing site already uses radial gradients instead of blur for ambient backgrounds, so it does not need structural changes for this ticket.

---

## Design

The fix follows a policy-first cleanup model:

1. Audit all blur utilities in the main app.
2. Keep blur only when it is small and transient.
3. Replace blur on fixed or always-visible surfaces with solid backgrounds, tokenized gradients, or radial gradients.
4. Codify the rule in `design-system.md` so the next change is easy to review.

### Allowed Patterns

- `backdrop-blur-sm` and `backdrop-blur-md` on modal or drawer backdrops.
- Short-lived overlays that are not permanently visible during normal navigation.

### Disallowed Patterns

- `backdrop-blur-xl` or larger on fixed headers, navbars, or other always-visible surfaces.
- Decorative `blur-*` blobs that stay on screen as ambient layers.
- Any blur that behaves like a permanent compositor layer on mobile.

### Replacement Patterns

- Use `bg-base-100/95` or a similarly near-opaque surface for fixed chrome.
- Use tokenized gradients for nav surfaces and accents.
- Use `radial-gradient` for ambient glow instead of CSS blur.

---

## Expected Component Impact

The implementation should touch only files that fail the audit:

- `src/components/layouts/Header.astro`
- `src/components/layouts/MobileNavigation.astro`
- `src/components/layouts/MobileCommandCenter.astro` only if its backdrop or shell violates the rule
- `src/components/molecules/Drawer.astro`
- `src/components/molecules/Modal.astro`
- `src/components/organisms/CategoryDrillDownModal.astro`
- `.claude/rules/frontend/design-system.md`

If a file already matches the policy, it should remain unchanged.

---

## Validation

The change is complete when all of the following are true:

- A repo-wide search shows no disallowed blur on fixed or always-visible surfaces.
- Transient modal and drawer overlays still use only small blur radii.
- The affected screens look materially unchanged on desktop.
- iPhone Safari reload and scroll performance improve on the main app surfaces.
- The updated design-system rule clearly states what is allowed and what is not.

---

## Testing Notes

- Run a blur-class audit after the change.
- Spot-check the affected pages in iPhone Safari.
- Compare the updated surfaces against the current design to confirm the visual delta stays minimal.
