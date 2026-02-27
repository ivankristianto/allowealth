# Recurring Drawer UX Redesign

**Date:** 2026-02-26
**Status:** Approved for implementation

## Problem

The recurring transaction drawer is visually and structurally inconsistent with the transaction drawer. The current layout feels crowded and untidy due to mixed field density, heavy bordered sections, and weak hierarchy.

## Goals

1. Align recurring drawer visual language with transaction drawer patterns.
2. Improve scanability and reduce cognitive load for create/edit recurring templates.
3. Keep all existing recurring business behavior unchanged.

## Non-Goals

1. No API/schema/service changes.
2. No changes to recurring calculation logic.
3. No new feature scope beyond UX/layout consistency.

## UX Direction

### 1) Shared Drawer Language

- Keep the existing `Drawer` shell.
- Use compact, transaction-like rhythm: tighter gaps, cleaner section headers, clearer input hierarchy.
- Keep current icon/subtitle identity but normalize spacing and typography to transaction drawer standards.

### 2) Type Selection Pattern

- Replace bulky radio-card style with a segmented tab-like control (Expense/Income) matching transaction drawer behavior and visual style.
- Preserve native radio inputs for accessibility and payload compatibility.

### 3) Field Hierarchy

- Promote amount field as primary input with stronger visual weight.
- Keep core fields (name/category/account/schedule) in a consistent two-column rhythm where appropriate.
- Reduce border noise by grouping advanced options into lighter cards.

### 4) Advanced Sections

- End Condition and Installment stay as independent sections.
- Keep reveal behavior (count/date/installment details) but improve spacing and section contrast for readability.

### 5) Action Area

- Keep cancel/save actions at bottom with consistent button sizing and rounding.
- Use a sticky footer container so actions remain reachable in long forms.

## Accessibility

1. Maintain labels and semantic controls.
2. Ensure segmented type control remains keyboard-operable and screen-reader understandable.
3. Keep visible focus styling and color contrast.

## Acceptance Criteria

1. Recurring drawer type selector visually matches transaction drawer segmented control pattern.
2. Drawer form spacing is visually tidy on both desktop and mobile.
3. End condition + installment behavior remains unchanged.
4. Existing recurring E2E flow still passes.
5. New UI regression test asserts redesigned recurring structure markers.
