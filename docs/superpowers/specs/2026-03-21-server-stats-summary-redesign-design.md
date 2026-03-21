# Server Stats Summary Redesign — Design Spec

**Issue:** ALL-60 / [#350](https://github.com/ivankristianto/allowealth/issues/350)
**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Refine the top summary strip in the shared diagnostics view so it reads like an operations snapshot instead of three generic feature cards. The redesign keeps the current diagnostics data and status logic, but changes the visual hierarchy to emphasize state, density, and scan speed.

The approved direction is the console-style option:

- denser presentation
- stronger status emphasis
- more diagnostic feel
- no large decorative icon chip

## Problem

The current summary cards use a large rounded icon container with a small glyph, label, headline, and badge row. That creates two issues:

- the icon area feels squeezed and decorative instead of informative
- the badges make the summary strip feel like marketing cards, not system readouts

This is most visible in Server Stats, where the user wants immediate operational signal.

## Goals

- Improve scan speed for the top diagnostics summary
- Remove the cramped icon treatment
- Make each card feel more like a compact status readout
- Stay inside the existing design system and settings-page visual language
- Limit scope to the summary strip only

## Non-Goals

- No diagnostics data-model changes
- No new API fields or service logic
- No redesign of the lower diagnostics sections
- No terminal-themed or overly heavy admin-console styling

## Approved Direction

Replace the current `icon + title + badges` pattern in the `diagnostics-summary` cards with a console-readout structure:

1. Compact header
   - Small uppercase section label
   - Small telemetry glyph aligned to the opposite side
   - Optional semantic status marker text

2. Primary state
   - Large, high-contrast primary value
   - Examples: `bun`, `Connected`, `Healthy`

3. Diagnostic rows
   - Two or three key/value rows per card
   - Subtle dividers between rows
   - Metadata shown inline, not as floating badges

The icon problem is solved by removing the large icon chip entirely. A much smaller telemetry glyph remains in the header as a structural marker, not as the focal point.

## Card Content

### Runtime

- Primary value: runtime name
- Rows:
  - Environment
  - App Version
  - Region when available

### Data Layer

- Primary value: connection status
- Rows:
  - Driver or dialect
  - Connection mode or platform-specific detail when available
  - Query count when metrics are available

### Caching

- Primary value: cache health
- Rows:
  - Driver
  - Enabled or disabled state
  - Short operational note when useful

## Visual Language

- Keep the existing card component and page grid
- Use semantic design-system colors only for status markers and small glyph accents
- Use restrained separators and base-surface borders for density
- Favor text hierarchy over tinted background blocks
- Use compact readout spacing so the strip feels operational, not airy

The result should feel like an infrastructure snapshot embedded inside the product UI, not a separate dashboard aesthetic.

## Accessibility

- Preserve semantic card content and readable heading order
- Maintain WCAG AA contrast for primary values, supporting labels, and status markers
- Do not rely on color alone to communicate state
- Keep mobile layout as a stacked one-column summary

## Implementation Scope

Change only the top summary section in [DiagnosticsDisplay.astro](/Users/ivan/Works/allowealth.worktrees/ALL-60-workspace-settings/src/components/organisms/DiagnosticsDisplay.astro).

In scope:

- summary card markup
- summary card spacing and layout
- small telemetry glyph treatment
- replacement of badge-style metadata with diagnostic rows

Out of scope:

- configuration status card
- runtime details section
- database health section
- environment variable table
- admin/settings routing

## Testing And Verification

- Browser verification on desktop and mobile in the Settings Server Stats view
- Shared-view verification on Admin Diagnostics because `DiagnosticsDisplay` is reused
- Relevant regression and diagnostics tests
- Design-system audit on the resulting PR changes after implementation

## Risks

- A console-like treatment can become visually heavier than the rest of Settings if separators, glyphs, or status styling are overused
- Replacing badges with rows may remove useful scannability if row labels are too faint or too verbose

The implementation should bias toward compact and structured, not theatrical.
