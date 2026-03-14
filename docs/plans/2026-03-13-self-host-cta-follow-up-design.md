# Self-Host CTA Follow-Up Design

**Date:** March 13, 2026  
**Status:** Approved

## Context

The marketing site now positions Allowealth around control and clarity, but the supporting CTA and docs flow still has gaps:

- the primary hero CTA should open the live demo at `https://demo.allowealth.io`
- the secondary hero CTA should read like a docs action, not a GitHub action
- `https://docs.allowealth.io/self-host` currently 404s
- the footer tagline should match the new brand line

The requested change is still copy-first and structure-light. We will not redesign the landing page or add new product behavior.

## Goals

- Send the hero demo CTA to the real demo domain.
- Remove the GitHub icon from the self-host CTA so the link reads as product documentation.
- Add a concise quick-start self-host page in `apps/docs`.
- Update footer copy to the new tagline.

## Non-Goals

- No visual redesign of the hero, footer, or docs layout.
- No long-form operations manual for self-hosting.
- No changes to app logic, auth, billing, or routing outside the new docs page.

## Architecture

Keep the change scoped to the existing content and page surfaces:

- `apps/site/src/lib/landing-content.ts` remains the source of marketing CTA URLs and footer copy.
- `apps/site/src/components/molecules/landing/HeroSection.astro` keeps the existing CTA layout, but removes the GitHub icon from the secondary button.
- `apps/docs` gains a new `/self-host` page that fits the current docs app structure and tone.

## Content Strategy

The new self-host page should be a quick-start guide, not a book. It should help a developer answer four questions fast:

1. What is self-hosting for?
2. What do I need before I start?
3. What is the fastest way to get Allowealth running?
4. What should I do after first boot?

The writing should stay concrete, active, and brief. The page should favor short sections, commands, and next steps over long explanation.

## Behavioral Contracts

- The hero primary CTA opens `https://demo.allowealth.io`.
- The hero secondary CTA still links to `/self-host` docs, but no longer shows a GitHub logo.
- `https://docs.allowealth.io/self-host` resolves to a real docs page.
- Footer copyright text reads: `© <year> allowealth. Allow your wealth to grow`

## Error Handling and Operational Boundaries

- The marketing site must continue to build without depending on docs runtime behavior.
- The docs page must be static and self-contained.
- Existing docs and footer links should remain intact unless directly required by this change.

## Testing and Verification Strategy

- Build `apps/site`.
- Build `apps/docs`.
- Run repo-root typecheck.
- Verify the demo URL, footer copy, icon removal, and self-host route through targeted greps or file checks.
