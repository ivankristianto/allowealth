# Reports Overview Refinement Design

**Date**: 2026-03-08
**Status**: Approved

## Problem

The `/reports` overview page asks users to read too much before they can act. The helper section is wordy, and the Income sources and Expense categories widgets feel more bespoke than the standard card patterns used elsewhere in the product.

## Goals

- Make the page easier to scan.
- Reduce copy without removing useful context.
- Bring the two preview widgets closer to the design system.
- Preserve the current data, navigation, and multi-currency behavior.

## Non-Goals

- Change report queries or API behavior.
- Add new filters or move currency selection out of the global header.
- Redesign the dedicated Income or Expenses pages.

## Approved Direction

Keep the existing page order: summary, trend, then preview cards. Replace the large helper block with a short intro card, and redesign the two preview widgets as cleaner standard cards with concise headings, a compact total block, ranked rows, and one direct call to action.

## UI Design

### Top intro

- Replace the current instructional panel with a compact card.
- Use one short sentence that explains the page's job: review the period snapshot, then open Income or Expenses for detail.
- Remove the numbered checklist and supporting paragraphs.

### Preview widgets

Apply one shared card pattern to both widgets:

- standard card shell: `card border border-base-300 bg-base-100 shadow-sm`
- header row with icon, title, and a one-line description
- compact total block aligned to the right on larger screens
- ranked list with subtle row dividers and consistent spacing
- single outline CTA with explicit rounding from the design system

The visual goal is familiar product UI, not a special-purpose marketing card. The widgets should feel like report modules that match the rest of the application.

## Copy Direction

- Use short, direct sentences.
- Prefer action-oriented labels over explanation.
- Remove filler phrases such as "so you can immediately see" and "for deeper investigation."

Examples:

- Intro: "Review this period at a glance, then open Income or Expenses for the full breakdown."
- Income widget description: "See the largest income sources for the selected period."
- Expense widget description: "See the spending categories with the biggest impact."
- CTA labels: "View income breakdown" and "View expense breakdown"

## Behavior and Accessibility

- Keep the existing links, sorting, totals, and empty states.
- Preserve semantic headings, list markup, and button/link affordances.
- Keep contrast and spacing aligned with the current design-system tokens and DaisyUI classes.

## Verification

- Review the page in the browser on desktop and mobile.
- Run the existing project checks after the UI update.
