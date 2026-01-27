# UI Consistency Audit & Implementation Plan

**Overall Assessment: 7.5/10** - Strong foundation with specific issues to address.

## Executive Summary

The codebase demonstrates excellent adherence to the design system in most areas (93/100 for components). However, there are **critical issues** in 8 files that violate the design system, particularly around:

1. Button variant misuse (`btn-primary` vs `btn-accent`)
2. Custom dialogs bypassing Modal.astro
3. Hardcoded Tailwind colors breaking theme support
4. Inline `onclick` handlers violating semantic patterns

---

## Phase 1: Critical Fixes (High Priority)

### 1.1 Button Variant Standardization

**Issue:** CTAs use `btn-primary` instead of `btn-accent` (violates design system)

| File                                           | Line          | Current       | Should Be    |
| ---------------------------------------------- | ------------- | ------------- | ------------ |
| `src/pages/index.astro`                        | 13            | `btn-primary` | `btn-accent` |
| `src/pages/settings/payment-methods.astro`     | 65            | `btn-primary` | `btn-accent` |
| `src/pages/settings/payment-methods.astro`     | 255           | `btn-primary` | `btn-accent` |
| `src/pages/transactions/export.astro`          | 93            | `btn-primary` | `btn-accent` |
| `src/pages/assets/history.astro`               | 72            | `btn-primary` | `btn-accent` |
| `src/pages/reports/custom.astro`               | 30            | `btn-primary` | `btn-accent` |
| `src/components/molecules/CSVImportForm.astro` | 174, 245, 320 | `btn-primary` | `btn-accent` |

**Design System Rule:**

- `btn-accent` (indigo) = Primary CTAs, interactive elements
- `btn-primary` (slate) = Secondary emphasis, neutral actions

---

### 1.2 Replace Custom Dialogs with Modal.astro

**Issue:** 4 custom `<dialog>` implementations bypass Modal.astro (missing animations, a11y features)

#### File: `src/pages/settings/payment-methods.astro`

**Lines 215-304:** 3 custom dialogs

- `#method-modal` (Add/Edit form)
- `#deactivate-dialog` (Confirmation)
- `#activate-dialog` (Confirmation)

**Action:** Create dedicated modal components:

- `PaymentMethodFormModal.astro` (wraps Modal.astro)
- `PaymentMethodConfirmModal.astro` (reusable confirm pattern)

#### File: `src/components/organisms/TransactionList.astro`

**Lines 108-128:** 1 custom dialog

- `#delete-dialog` (Delete confirmation)

**Action:** Replace with `DeleteConfirmationModal.astro` (already exists) or create `TransactionDeleteModal.astro`

---

### 1.3 Remove Hardcoded Tailwind Colors

**Issue:** Hardcoded colors break dark/light theme support

#### File: `src/pages/reports/index.astro` (Lines 100-148)

```typescript
// CURRENT (WRONG)
color: 'bg-blue-600',
color: 'bg-orange-500',
color: 'bg-cyan-500',
// etc.
```

#### File: `src/components/organisms/CategoryIntelligenceTable.astro` (Lines 32-40)

```typescript
// CURRENT (WRONG)
const CATEGORY_COLOR_MAP: Record<string, string> = {
  Utilities: 'bg-blue-600',
  Dining: 'bg-orange-500',
  // etc.
};
```

**Action:**

1. Add category color tokens to `@/lib/tokens.ts`
2. Replace hardcoded colors with token imports
3. Use DaisyUI semantic classes where possible

#### File: `src/components/atoms/CategoryIcon.astro` (Line 25)

```typescript
// CURRENT
const { icon, color = 'bg-slate-500', ... } = Astro.props;

// SHOULD BE
const { icon, color = 'bg-base-300', ... } = Astro.props;
```

---

## Phase 2: Semantic HTML & Event Handling (Medium Priority)

### 2.1 Replace Inline onclick Handlers

**Issue:** Inline `onclick` violates semantic patterns and makes testing harder

#### File: `src/pages/settings/payment-methods.astro`

| Line | Current                                             | Action                                             |
| ---- | --------------------------------------------------- | -------------------------------------------------- |
| 65   | `onclick="methodModal.showModal()"`                 | Use `data-open-modal="method-modal"`               |
| 168  | `onclick={'editMethod("' + method.id + '")'}`       | Use `data-action="edit" data-id={method.id}`       |
| 175  | `onclick={'deactivateMethod("' + method.id + '")'}` | Use `data-action="deactivate" data-id={method.id}` |
| 184  | `onclick={'activateMethod("' + method.id + '")'}`   | Use `data-action="activate" data-id={method.id}`   |
| 254  | `onclick="methodModal.close()"`                     | Use `data-close-modal`                             |

#### File: `src/components/organisms/DashboardError.astro` (Line 69)

```html
<!-- CURRENT -->
<button onclick="window.location.reload()" class="btn btn-accent">
  <!-- SHOULD BE -->
  <button data-action="reload" class="btn btn-accent"></button>
</button>
```

---

### 2.2 Use Input.astro Component

**Issue:** Raw HTML inputs instead of Input.astro component

#### File: `src/pages/settings/payment-methods.astro` (Lines 226-248)

Replace raw `<input>` and `<select>` with:

- `Input.astro` component
- `Label.astro` component

---

## Phase 3: Abstraction Opportunities (Low Priority)

### 3.1 Create Table Compound Component

**Current:** Two independent table implementations

- `GrowthScheduleTable.astro`
- `CategoryIntelligenceTable.astro`

**Opportunity:** Create reusable table components:

```
src/components/atoms/
├── Table.astro          # <table> wrapper
├── TableHeader.astro    # <thead> wrapper
├── TableBody.astro      # <tbody> wrapper
└── TableRow.astro       # <tr> wrapper with hover state
```

### 3.2 Create FormField Compound Component

**Current:** Forms manually compose Label + Input + ErrorMessage

**Opportunity:** Create wrapper:

```astro
<FormField name="email" label="Email" required error={errors.email}>
  <Input type="email" ... />
</FormField>
```

---

## Implementation Order

### Batch 1: Button Variants (8 files)

1. `src/pages/index.astro`
2. `src/pages/settings/payment-methods.astro`
3. `src/pages/transactions/export.astro`
4. `src/pages/assets/history.astro`
5. `src/pages/reports/custom.astro`
6. `src/components/molecules/CSVImportForm.astro`

### Batch 2: Custom Dialogs (2 files)

1. Create `PaymentMethodFormModal.astro`
2. Create `PaymentMethodConfirmModal.astro`
3. Refactor `payment-methods.astro` to use new modals
4. Refactor `TransactionList.astro` to use Modal pattern

### Batch 3: Hardcoded Colors (3 files)

1. Add category color tokens to `@/lib/tokens.ts`
2. Update `CategoryIntelligenceTable.astro`
3. Update `reports/index.astro` mock data
4. Update `CategoryIcon.astro` default

### Batch 4: Event Handlers (2 files)

1. Create `payment-methods.client.ts` (if not exists) or update
2. Refactor `payment-methods.astro` onclick handlers
3. Refactor `DashboardError.astro` onclick handler

### Batch 5: Input Components (1 file)

1. Refactor `payment-methods.astro` form to use Input.astro

---

## Files to Modify

| Priority | File                                                       | Changes                          |
| -------- | ---------------------------------------------------------- | -------------------------------- |
| P0       | `src/pages/index.astro`                                    | btn-primary → btn-accent         |
| P0       | `src/pages/settings/payment-methods.astro`                 | Buttons, modals, onclick, inputs |
| P0       | `src/pages/transactions/export.astro`                      | btn-primary → btn-accent         |
| P0       | `src/pages/assets/history.astro`                           | btn-primary → btn-accent         |
| P0       | `src/pages/reports/custom.astro`                           | btn-primary → btn-accent         |
| P0       | `src/pages/reports/index.astro`                            | Hardcoded colors                 |
| P0       | `src/components/molecules/CSVImportForm.astro`             | btn-primary → btn-accent         |
| P1       | `src/components/organisms/TransactionList.astro`           | Custom dialog → Modal            |
| P1       | `src/components/organisms/CategoryIntelligenceTable.astro` | Hardcoded colors                 |
| P1       | `src/components/atoms/CategoryIcon.astro`                  | Default color                    |
| P1       | `src/components/organisms/DashboardError.astro`            | onclick handler                  |
| P2       | `src/lib/tokens.ts`                                        | Add category color tokens        |

## New Files to Create

| File                                                       | Purpose                         |
| ---------------------------------------------------------- | ------------------------------- |
| `src/components/organisms/PaymentMethodFormModal.astro`    | Form modal using Modal.astro    |
| `src/components/organisms/PaymentMethodConfirmModal.astro` | Confirm modal using Modal.astro |

---

## Verification Plan

### Manual Testing

1. **Dark/Light Mode:** Toggle theme on each modified page
2. **Mobile Responsive:** Test at 320px, 768px, 1024px
3. **Keyboard Navigation:** Tab through all interactive elements
4. **Screen Reader:** Test modal focus management

### Automated Checks

```bash
# Run quality gates
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck

# Check for remaining issues
grep -r "btn-primary" src/pages src/components --include="*.astro" | grep -v test
grep -r "onclick=" src/pages src/components --include="*.astro"
grep -r "bg-slate-\|bg-gray-\|bg-blue-\|bg-orange-" src/components --include="*.astro"
```

### Visual Regression

1. Start dev server: `bun run dev`
2. Navigate to each modified page
3. Verify button colors match design system (accent = indigo)
4. Verify modals have proper animations
5. Verify theme switching works

---

## Summary Checklist

- [ ] **P0:** Replace all `btn-primary` with `btn-accent` for CTAs (6 files)
- [ ] **P0:** Replace hardcoded colors with design tokens (3 files)
- [ ] **P1:** Create and use PaymentMethodFormModal.astro
- [ ] **P1:** Create and use PaymentMethodConfirmModal.astro
- [ ] **P1:** Refactor TransactionList delete dialog
- [ ] **P1:** Remove onclick handlers, use data attributes
- [ ] **P1:** Update CategoryIcon default color
- [ ] **P2:** Replace raw inputs with Input.astro
- [ ] **P2:** Add category color tokens to tokens.ts
- [ ] Run quality gates (lint, stylelint, format, typecheck)
- [ ] Manual testing (dark mode, responsive, keyboard, screen reader)
