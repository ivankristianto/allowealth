# Icon Migration to @lucide/astro - Implementation Plan

Migrate all custom Icon components to use @lucide/astro icons for consistency, accessibility, and maintainability.

## Summary

The project currently uses a custom `Icon.astro` component with hardcoded SVG paths (Heroicons-style). The design system mandates using `@lucide/astro` for all icons. This migration will:

1. Replace all custom Icon component usage with direct Lucide icon imports
2. Remove the custom Icon.astro component and its stories
3. Update all affected components, pages, and tests
4. Ensure consistent icon sizing and styling across the application

### Proposed Changes

#### Scope of Migration

The migration covers **TWO types of icon usage**:

1. **Custom Icon Component** (Icon.astro) - 19 component files + 5 page files
2. **Inline SVGs** - 20 files with hardcoded SVG elements
3. **No backward compatibility required**

**Total Files to Migrate:** 44 files

#### Icon Name Mapping (Custom → Lucide)

| Current Name    | Lucide Icon   | Import                     |
| --------------- | ------------- | -------------------------- |
| arrow-left      | ArrowLeft     | `{ ArrowLeft }`            |
| arrow-right     | ArrowRight    | `{ ArrowRight }`           |
| check           | Check         | `{ Check }`                |
| x               | X             | `{ X }`                    |
| plus            | Plus          | `{ Plus }`                 |
| minus           | Minus         | `{ Minus }`                |
| pencil          | Pencil/Edit   | `{ Pencil }` or `{ Edit }` |
| trash           | Trash2        | `{ Trash2 }`               |
| ban             | Ban/XCircle   | `{ Ban }` or `{ XCircle }` |
| refresh         | RefreshCw     | `{ RefreshCw }`            |
| tag             | Tag           | `{ Tag }`                  |
| search          | Search        | `{ Search }`               |
| calendar        | Calendar      | `{ Calendar }`             |
| chevron-down    | ChevronDown   | `{ ChevronDown }`          |
| chevron-up      | ChevronUp     | `{ ChevronUp }`            |
| information     | Info          | `{ Info }`                 |
| warning         | AlertTriangle | `{ AlertTriangle }`        |
| alert           | Bell          | `{ Bell }`                 |
| eye             | Eye/EyeOff    | `{ Eye }` or `{ EyeOff }`  |
| currency-dollar | DollarSign    | `{ DollarSign }`           |
| home            | Home          | `{ Home }`                 |
| menu            | Menu          | `{ Menu }`                 |
| list            | List          | `{ List }`                 |

#### Files Using Icon.astro Component

**Components (19 files)**

- `src/components/atoms/EmptyState.astro`
- `src/components/atoms/PasswordField.astro`
- `src/components/layouts/Header.astro`
- `src/components/layouts/Navigation.astro`
- `src/components/molecules/BudgetHealthWidget.astro`
- `src/components/molecules/CSVImportForm.astro`
- `src/components/molecules/Modal.astro`
- `src/components/molecules/QuickActions.astro`
- `src/components/molecules/TransactionFilters.astro`
- `src/components/molecules/TransactionForm.astro`
- `src/components/molecules/TransactionRow.astro`
- `src/components/organisms/AssetUpdateTodoList.astro`
- `src/components/organisms/BudgetHistoryComparison.astro`
- `src/components/organisms/BudgetOverviewTable.astro`
- `src/components/organisms/DashboardError.astro`
- `src/components/organisms/RecentTransactionsList.astro`
- `src/components/organisms/TransactionList.astro`

**Pages (5 files)**

- `src/pages/budget/index.astro`
- `src/pages/settings/categories.astro`
- `src/pages/settings/payment-methods.astro`
- `src/pages/transactions/export.astro`
- `src/pages/transactions/import.astro`

**Stories (11 files)**

- `src/components/atoms/EmptyState.stories.ts`
- `src/components/atoms/Icon.stories.ts` ✅ (will be deleted)
- `src/components/atoms/PasswordField.stories.ts`
- `src/components/layouts/Header.stories.ts`
- `src/components/layouts/Navigation.stories.ts`
- `src/components/molecules/BudgetHealthWidget.stories.ts`
- `src/components/molecules/QuickActions.stories.ts`
- `src/components/molecules/TransactionRow.stories.ts`
- `src/components/organisms/AssetUpdateTodoList.stories.ts`
- `src/components/organisms/RecentTransactionsList.stories.ts`

**Files with Inline SVGs (20 files)**

**Atoms (2 files)**

- `src/components/atoms/ErrorMessage.astro`
- `src/components/atoms/PasswordField.astro` (also uses Icon.astro)

**Molecules (8 files)**

- `src/components/molecules/AuthValidationMessages.astro` (SVG strings in config)
- `src/components/molecules/BudgetHealthWidget.astro` (also uses Icon.astro)
- `src/components/molecules/ForgotPasswordForm.astro`
- `src/components/molecules/LoginForm.astro`
- `src/components/molecules/RegistrationForm.astro`
- `src/components/molecules/Toast.astro`
- `src/components/molecules/ToastContainer.astro`
- `src/components/molecules/TransactionForm.astro` (also uses Icon.astro)

**Organisms (6 files)**

- `src/components/organisms/AssetUpdateTodoList.astro` (also uses Icon.astro)
- `src/components/organisms/BudgetOverviewTable.astro` (also uses Icon.astro)
- `src/components/organisms/DashboardError.astro`
- `src/components/organisms/RecentTransactionsList.astro` (also uses Icon.astro)
- `src/components/organisms/SummaryCards.astro`
- `src/components/organisms/UserContext.astro`

**Pages (4 files)**

- `src/pages/budget/history.astro`
- `src/pages/budget/index.astro` (also uses Icon.astro)
- `src/pages/register.astro`
- `src/pages/signup.astro`

**Files to Delete**

- `src/components/atoms/Icon.astro` ✅
- `src/components/atoms/Icon.stories.ts` ✅

#### Inline SVG Icon Mapping

Common inline SVG patterns found in the codebase:

| SVG Path Description             | Lucide Icon              | Import                         |
| -------------------------------- | ------------------------ | ------------------------------ |
| XCircle (error, dismiss)         | XCircle                  | `{ XCircle }`                  |
| AlertTriangle (warning)          | AlertTriangle            | `{ AlertTriangle }`            |
| X (close button)                 | X                        | `{ X }`                        |
| Eye/EyeOff (password visibility) | Eye, EyeOff              | `{ Eye, EyeOff }`              |
| Lock (password, security)        | Lock                     | `{ Lock }`                     |
| CheckCircle2 (success)           | CheckCircle2             | `{ CheckCircle2 }`             |
| TrendingUp/Down (financial)      | TrendingUp, TrendingDown | `{ TrendingUp, TrendingDown }` |

#### Size Conversion

The current Icon component uses size props: `xs`, `sm`, `md`, `lg`, `xl`

Map to Lucide size attribute (in pixels):

- `xs` → `size={12}`
- `sm` → `size={16}`
- `md` → `size={20}` (default)
- `lg` → `size={24}`
- `xl` → `size={32}`

For inline SVGs with class-based sizing:

- `h-4 w-4` → `size={16}`
- `h-5 w-5` → `size={20}`
- `h-6 w-6` → `size={24}`
- `h-8 w-8` → `size={32}`

## Detailed Tasks

### Phase 1: Prepare Icon Mapping Reference (Priority: P0)

**Goal:** Create a comprehensive mapping document for developers to reference during migration

**Checklist:**

- [x] Document all current icon names from Icon.astro
- [x] Map each icon to its Lucide equivalent
- [x] Create size conversion table
- [x] Document import pattern examples

**Files to create:**

- `docs/icon-migration-guide.md` (reference for developers)

**Estimated Time:** 1 hour

**Status:** ✅ Completed (documented in this plan)

---

### Phase 2: Migrate Atomic Components (Priority: P0)

**Goal:** Migrate the smallest reusable components first

#### Task 2.1: Migrate EmptyState.astro

**Checklist:**

- [x] Read current EmptyState.astro implementation
- [x] Identify icons used (currently passes icon name as prop)
- [x] Update to accept Lucide icon component as slot or prop
- [x] Update EmptyState.stories.ts to use Lucide icons
- [x] Test in Storybook
- [x] Run quality gates
- [x] Fix P0 accessibility issue (added aria-hidden to icon wrapper)
- [x] Fix P1 deprecation warning (replaced AlertCircle with TriangleAlert)

**Files to modify:**

- `src/components/atoms/EmptyState.astro`
- `src/components/atoms/EmptyState.stories.ts`
- `src/components/organisms/AssetUpdateTodoList.astro` (updated icon -> iconName prop)
- `src/components/organisms/RecentTransactionsList.astro` (updated icon -> iconName prop)

**Current Usage Pattern:**

```astro
<Icon name="search" size="xl" />
```

**New Pattern:**

```astro
import {Search} from '@lucide/astro';
<Search size={32} />
```

**Implementation Notes:**

- Created icon mapping inside EmptyState component for backward compatibility
- Icon names supported: search, folder, inbox, calendar, file, wallet, trending, alert, info, check, plus
- Changed prop from `icon` to `iconName` for clarity
- Added `aria-hidden="true"` to icon wrapper for accessibility
- Fixed deprecation warnings by using TriangleAlert instead of AlertTriangle/AlertCircle
- Icon size fixed at 32px (equivalent to previous `xl` size)
- Updated consuming components to use new `iconName` prop

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed

---

#### Task 2.2: Migrate PasswordField.astro

**Checklist:**

- [x] Read current PasswordField.astro implementation
- [x] Replace Icon imports with Eye/EyeOff from Lucide
- [x] Update toggle visibility icon logic
- [x] Update PasswordField.stories.ts
- [x] Test in Storybook
- [x] Run quality gates
- [x] Fix P1 validation logic mismatch in stories

**Files to modify:**

- `src/components/atoms/PasswordField.astro`
- `src/components/atoms/PasswordField.stories.ts`

**Icons to replace:**

- `eye` → `Eye` and `EyeOff`
- `check` → `Check` (for requirements checklist)
- `x` → `X` (for requirements checklist)

**Implementation Notes:**

- Replaced inline SVGs for toggle button with `<Eye size={20} class="stroke-current" data-eye-icon />` and `<EyeOff size={20} class="hidden stroke-current" data-eye-off-icon />`
- Replaced inline SVGs in requirements checklist with `<Check size={16} class="hidden shrink-0" data-check-icon />` and `<X size={16} class="shrink-0" data-x-icon />`
- Fixed stories validation logic to match component (3 requirements: length, letter, numberOrSpecial)
- Added `shrink-0` class to icons for proper flex layout

**Estimated Time:** 1 hour

**Status:** ✅ Completed

---

### Phase 3: Migrate Layout Components (Priority: P0)

**Goal:** Update navigation and header components that are used site-wide

#### Task 3.1: Migrate Navigation.astro

**Checklist:**

- [x] Read current Navigation.astro implementation
- [x] Map all navigation icons to Lucide equivalents
- [x] Update icon imports
- [x] Replace all Icon component usage
- [x] Update Navigation.stories.ts
- [x] Test in Storybook
- [x] Run quality gates
- [x] Fix P1 active state logic inconsistency
- [x] Fix P1 aria-current="false" string issue
- [x] Add aria-hidden to decorative icons

**Files to modify:**

- `src/components/layouts/Navigation.astro`
- `src/components/layouts/Navigation.stories.ts`
- `src/components/layouts/Navigation.behavior.test.ts` (created)

**Icons to replace:**

- `home` → `LayoutDashboard` (more appropriate for dashboard, also avoids deprecation)
- `search` → `Search`
- `calendar` → `Calendar`
- `currency-dollar` → `DollarSign`
- `information` → `Info`
- `warning` → `TriangleAlert` (replaces deprecated AlertTriangle)
- `plus` → `Plus`
- `pencil` → `Settings` (more appropriate for settings)
- `x` → `X`

**UI Example:**

```astro
<!-- Before -->
<Icon name="home" size="sm" />

<!-- After -->
import {LayoutDashboard} from '@lucide/astro';
<LayoutDashboard size={16} class="stroke-current" aria-hidden="true" />
```

**Implementation Notes:**

- Replaced Home with LayoutDashboard for better semantic meaning and to avoid deprecation
- Replaced AlertTriangle with TriangleAlert to fix deprecation warning
- Fixed active state logic to properly handle nested routes (e.g., /assets/add marks /assets as active)
- Fixed aria-current to only set "page" when active (not "false" string)
- Added aria-hidden="true" to decorative icons for accessibility
- Created comprehensive behavior test file
- All quality gates pass (typecheck, lint, stylelint, format)

**Estimated Time:** 2 hours

**Status:** ✅ Completed (commit 18f1593)

---

#### Task 3.2: Migrate Header.astro

**Checklist:**

- [x] Read current Header.astro implementation
- [x] Replace Icon component with Lucide icons
- [x] Update Header.stories.ts
- [x] Test in Storybook
- [x] Run quality gates
- [x] Fix P1 accessibility issue (added aria-label to Add New button)

**Files to modify:**

- `src/components/layouts/Header.astro`
- `src/components/layouts/Header.stories.ts`

**Icons to replace:**

- `menu` → `Menu`
- `plus` → `Plus`
- `warning` → `Bell` (semantically better for notifications)

**Implementation Notes:**

- Replaced custom Icon component import with `import { Menu, Plus, Bell } from '@lucide/astro'`
- Updated all icon usages to use Lucide components with `size={number}` and `class="stroke-current"`
- Added `aria-hidden="true"` to decorative icons for accessibility
- Fixed P1 accessibility issue: Added `aria-label="Add new item"` to the "Add New" button (critical for mobile screen readers when text is hidden)
- Updated Header.stories.ts to use Lucide's `.render()` method for icon rendering
- Added `relative` class to notification button for proper badge positioning

**Estimated Time:** 1 hour

**Status:** ✅ Completed

---

### Phase 4: Migrate Molecule Components (Priority: P1)

**Goal:** Update composite components that combine atoms

#### Task 4.1: Migrate Modal.astro

**Checklist:**

- [x] Read current Modal.astro implementation
- [x] Replace close button icon (X)
- [x] Update Modal.stories.ts
- [x] Test in Storybook
- [x] Run quality gates
- [x] Write unit tests (Modal.behavior.test.ts)
- [x] Code review specialist review
- [x] Fix P1 accessibility improvement (added aria-labelledby)

**Files to modify:**

- `src/components/molecules/Modal.astro`
- `src/components/molecules/Modal.stories.ts`
- `src/components/molecules/Modal.behavior.test.ts` (created)

**Icons to replace:**

- `x` → `X`

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { X } from '@lucide/astro'`
- Replaced `<Icon name="x" size="sm" />` with `<X size={16} class="stroke-current" aria-hidden="true" />`
- Size conversion: sm (16px) = size={16}
- Added accessibility: `aria-hidden="true"` on decorative icon, button has `aria-label="Close modal"`
- Added `aria-labelledby` to dialog element linking to title for improved screen reader support
- Updated Modal.stories.ts to use `X.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' })`
- Created comprehensive behavior test file (Modal.behavior.test.ts) following Navigation.behavior.test.ts pattern
- Code review specialist: **APPROVED** with minor suggestions for enhancement

**Estimated Time:** 1 hour

**Status:** ✅ Completed

---

#### Task 4.2: Migrate QuickActions.astro

**Checklist:**

- [x] Read current QuickActions.astro implementation
- [x] Replace action icons with Lucide
- [x] Update QuickActions.stories.ts
- [x] Test in Storybook
- [x] Run quality gates
- [x] Write behavior tests
- [x] Code review specialist review (APPROVED)

**Files to modify:**

- `src/components/molecules/QuickActions.astro`
- `src/components/molecules/QuickActions.stories.ts`
- `src/components/molecules/QuickActions.behavior.test.ts` (created)

**Icons to replace:**

- `minus` → `Minus` (for expenses)
- `plus` → `Plus` (for income)
- `search` → `ChartPie` (used instead of deprecated BarChart3)

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { Minus, Plus, ChartPie } from '@lucide/astro'`
- Created internal icon mapping for backward compatibility: `iconMap: Record<string, Component>`
- Used `ChartPie` instead of deprecated `BarChart3`/`PieChart` for "View Reports" action
- Added `aria-hidden="true"` to decorative icons (buttons have aria-label)
- Icon size: 16px (equivalent to previous "sm" size)
- Added JSDoc type annotation for iconMap for better type safety
- Created comprehensive behavior test file with 32 tests
- Code review specialist: **APPROVED** with minor suggestions for future improvement

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed

---

#### Task 4.3: Migrate BudgetHealthWidget.astro

**Checklist:**

- [x] Read current implementation
- [x] Replace status icons (Check, TriangleAlert)
- [x] Replace inline SVG arrow-right with ArrowRight
- [x] Update BudgetHealthWidget.stories.ts
- [x] Create shared test utilities (budget-health-test-utils.ts)
- [x] Write behavior tests (41 tests)
- [x] Run quality gates
- [x] Code review specialist review (APPROVED)
- [x] Fix P1 feedback (role="group", semantic list, shared utilities)

**Files modified:**

- `src/components/molecules/BudgetHealthWidget.astro`
- `src/components/molecules/BudgetHealthWidget.stories.ts`
- `src/components/molecules/BudgetHealthWidget.behavior.test.ts` (created)
- `src/components/molecules/__tests__/budget-health-test-utils.ts` (created)

**Icons to replace:**

- `warning` → `TriangleAlert` (used instead of deprecated AlertTriangle)
- `check` → `Check`
- inline SVG arrow-right → `ArrowRight`

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { Check, TriangleAlert, ArrowRight } from '@lucide/astro'`
- Status icons: Check (healthy, size 20px), TriangleAlert (warning/exceeded, size 20px)
- No alerts state: Check icon (size 24px)
- View Budget link: ArrowRight icon (size 16px) with hover animation
- Added `role="group"` and `aria-label="Budget health status"` to header for accessibility
- Replaced div with semantic `<ul>` and `<li>` elements for alert list
- Created shared test utilities to eliminate duplication between component and stories
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review specialist: **APPROVED** with P1 feedback addressed

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed (commit 39511ef)

---

#### Task 4.4: Migrate TransactionRow.astro

**Checklist:**

- [x] Read current implementation
- [x] Replace edit/delete icons
- [x] Update TransactionRow.stories.ts
- [x] Write behavior tests (TransactionRow.behavior.test.ts)
- [x] Run quality gates
- [x] Code review specialist review (APPROVED)
- [x] Fix P1 feedback (data attribute consistency in stories)

**Files modified:**

- `src/components/molecules/TransactionRow.astro`
- `src/components/molecules/TransactionRow.stories.ts`
- `src/components/molecules/TransactionRow.behavior.test.ts` (created)

**Icons to replace:**

- `pencil` → `Pencil` (used instead of deprecated Edit)
- `trash` → `Trash2`

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { Pencil, Trash2 } from '@lucide/astro'`
- Edit button: `<Icon name="pencil" size="sm" />` → `<Pencil size={16} class="stroke-current" aria-hidden="true" />`
- Delete button: `<Icon name="trash" size="sm" />` → `<Trash2 size={16} class="stroke-current" aria-hidden="true" />`
- Size conversion: sm (16px) = size={16}
- Added accessibility: `aria-hidden="true"` on decorative icons, buttons have `aria-label`
- Fixed data attributes in stories to match component (data-delete-transaction, data-transaction-details)
- Created comprehensive behavior test file with 45 tests
- Used Pencil instead of deprecated Edit icon
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review specialist: **APPROVED** with P1 feedback addressed

**Estimated Time:** 1 hour

**Status:** ✅ Completed (commit c00b7af)

---

#### Task 4.5: Migrate TransactionFilters.astro

**Checklist:**

- [x] Read current implementation
- [x] Replace filter/search icons
- [x] Write behavior tests (TransactionFilters.behavior.test.ts)
- [x] Run quality gates
- [x] Code review specialist review (APPROVED)

**Files modified:**

- `src/components/molecules/TransactionFilters.astro`
- `src/components/molecules/TransactionFilters.behavior.test.ts` (created)

**Icons to replace:**

- `search` → `Search`

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { Search } from '@lucide/astro'`
- Replaced `<Icon name="search" size="sm" />` with `<Search size={16} class="stroke-current" aria-hidden="true" />`
- Added `aria-label="Search"` to submit button for accessibility
- Size conversion: sm (16px) = size={16}
- Created comprehensive behavior test file with 49 tests
- Note: Only the search icon was present in the component; calendar and x icons listed in original plan were not actually used
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review specialist: **APPROVED**

**Estimated Time:** 1 hour

**Status:** ✅ Completed (commit 118623e)

---

#### Task 4.6: Migrate TransactionForm.astro

**Checklist:**

- [x] Read current implementation
- [x] Replace form icons
- [x] Test form submission
- [x] Run quality gates
- [x] Write behavior tests
- [x] Code review specialist review (APPROVED)

**Files modified:**

- `src/components/molecules/TransactionForm.astro`
- `src/components/molecules/TransactionForm.behavior.test.ts` (created)

**Icons replaced:**

- `warning` → `TriangleAlert` (server-side, size 16px)
- Inline SVG (success message) → Check icon path (client-side)
- Inline SVG (budget warning) → TriangleAlert icon path (client-side)

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { TriangleAlert } from '@lucide/astro'`
- Budget warning Icon usage: `<Icon name="warning" size="sm" />` → `<TriangleAlert size={16} class="shrink-0 stroke-current" aria-hidden="true" />`
- Success message inline SVG: Replaced custom path with Lucide Check icon path (`polyline points="20 6 9 17 4 12"`)
- Budget warning inline SVG: Replaced custom path with Lucide TriangleAlert icon path (triangle + exclamation mark paths)
- Added `aria-hidden="true"` to all decorative icons for accessibility
- Created comprehensive behavior test file with 89 tests covering icon migration, form structure, validation, client-side features, and accessibility
- Note: The plan listed `calendar`, `tag`, and `currency-dollar` icons, but these are handled by child components (DatePicker, CategorySelect, CurrencyInput) - not directly in TransactionForm
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review specialist: **APPROVED** with minor non-blocking suggestions

**Estimated Time:** 1 hour

**Status:** ✅ Completed (commit pending)

---

#### Task 4.7: Migrate CSVImportForm.astro

**Checklist:**

- [x] Read current implementation
- [x] Replace upload/import icons
- [x] Test import functionality
- [x] Run quality gates
- [x] Write behavior tests (CSVImportForm.behavior.test.ts)
- [x] Code review specialist review (APPROVED)

**Files modified:**

- `src/components/molecules/CSVImportForm.astro`
- `src/components/molecules/CSVImportForm.behavior.test.ts` (created)

**Icons replaced:**

Server-side (Lucide components):

- `check` → `Check` (file parsed success, confirm import button)
- `refresh` → `RefreshCw` (reset button, auto-detect button)
- `arrow-right` → `ArrowRight` (map columns button)
- `information` → `Info` (mapping instructions)
- `arrow-left` → `ArrowLeft` (back to preview button)
- `plus` → `Plus` (import another file button)
- `list` → `List` (view transactions link)

Client-side (inline SVG with Lucide paths):

- Check icon path (`M20 6 9 17l-5-5`) for validation success
- XCircle icon paths (circle + x) for validation errors
- TriangleAlert icon paths (triangle + exclamation) for warnings
- All icons used in mapping validation and import results

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { Check, RefreshCw, ArrowRight, Info, ArrowLeft, Plus, List } from '@lucide/astro'`
- Icon size: 16px (equivalent to previous "sm" size)
- Added `stroke-current` class to button icons for color inheritance
- Added `shrink-0` class to alert icons for flex layout
- Added `aria-hidden="true"` to all decorative icons
- Buttons have `aria-label` for accessibility
- Updated client-side SVG creation to use Lucide icon paths
- Created comprehensive behavior test file with 75+ tests
- Note: The plan listed `arrow-up`, `x` icons, but the actual icons used were different (refresh, arrow-left, list, etc.)
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review specialist: **APPROVED** with no blocking feedback

**Estimated Time:** 1 hour

**Status:** ✅ Completed

---

### Phase 5: Migrate Organism Components (Priority: P1)

**Goal:** Update complex composite components

#### Task 5.1: Migrate TransactionList.astro

**Checklist:**

- [x] Read current implementation
- [x] Replace list/filter icons
- [x] Write behavior tests (TransactionList.behavior.test.ts)
- [x] Run quality gates
- [x] Code review specialist review (APPROVED)
- [x] Fix P0/P1 feedback (none - no blocking issues)
- [x] Test list rendering and interactions

**Files modified:**

- `src/components/organisms/TransactionList.astro`
- `src/components/organisms/TransactionList.behavior.test.ts` (created)

**Icons replaced:**

- `arrow-left` → `ArrowLeft` (Import CSV button)
- `download` → `Download` (Download CSV button - not in original plan, correct Lucide icon)
- `arrow-right` → `ArrowRight` (Export Options button)
- `plus` → `Plus` (Add Transaction button)
- `chevron-up` → `ChevronLeft` (pagination Previous button)
- `chevron-up` (rotated) → `ChevronLeft` rotated 180deg (pagination Next button)

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { ArrowLeft, Download, ArrowRight, Plus, ChevronLeft } from '@lucide/astro'`
- Icon size: 16px (equivalent to previous "sm" size)
- Added `stroke-current` class to all icons for color inheritance
- Added `aria-hidden="true"` to all decorative icons (buttons have text labels)
- Created comprehensive behavior test file with 62+ tests covering icon migration, component props, pagination, filter panel, delete dialog, export URL building, accessibility, responsive design, and client-side behavior
- Code review specialist: **APPROVED** with minor non-blocking suggestions (see P3/P4 below)
- All quality gates pass (typecheck, lint, stylelint, format)

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed

---

#### Task 5.2: Migrate BudgetOverviewTable.astro

**Checklist:**

- [ ] Read current implementation
- [ ] Replace status and action icons
- [ ] Test table rendering and sorting
- [ ] Run quality gates

**Files to modify:**

- `src/components/organisms/BudgetOverviewTable.astro`

**Icons to replace:**

- `warning` → `AlertTriangle`
- `check` → `CheckCircle2`
- `ban` → `XCircle`
- `arrow-up`/`arrow-down` → `ArrowUp`/`ArrowDown` (for sorting)

**Estimated Time:** 2 hours

**Status:** Pending

---

#### Task 5.3: Migrate RecentTransactionsList.astro

**Checklist:**

- [x] Read current implementation
- [x] Replace list icons
- [x] Update RecentTransactionsList.stories.ts
- [x] Test in Storybook
- [x] Run quality gates
- [x] Write behavior tests (RecentTransactionsList.behavior.test.ts)
- [x] Code review specialist review (APPROVED)
- [x] Fix P0/P1 feedback (Clock icon, DaisyUI colors, type extraction)

**Files modified:**

- `src/components/organisms/RecentTransactionsList.astro`
- `src/components/organisms/RecentTransactionsList.stories.ts`
- `src/components/organisms/RecentTransactionsList.behavior.test.ts` (created)
- `tsconfig.json` (added .behavior.test.ts to exclude pattern)

**Icons replaced:**

Server-side (Lucide components):

- `arrow-left` → `Clock` (header icon, semantically better for "recent" indicator)
- `arrow-right` → `ArrowRight` (View All link, quick action link, View All button)

Payment method icons:

- `cash: 'currency-dollar'` → `DollarSign`
- `credit_card: 'credit-card'` → `CreditCard`
- `debit_card: 'credit-card'` → `CreditCard`
- `bank_transfer: 'arrow-left'` → `ArrowLeft`
- `e_wallet: 'calendar'` → `Wallet` (more appropriate than calendar)

**Implementation Notes:**

- Replaced `import Icon from '../atoms/Icon.astro'` with `import { Clock, ArrowRight, DollarSign, CreditCard, ArrowLeft, Wallet } from '@lucide/astro'`
- Created `getPaymentIconComponent` function with extracted `PaymentIconComponent` type alias for better maintainability
- Icon sizes: 12px (payment badges), 16px (inline icons), 20px (header icon)
- Added `stroke-current` class to all icons for color inheritance
- Added `aria-hidden="true"` to all decorative icons
- Header icon changed from ArrowRight to Clock for semantic correctness
- Stories updated to use DaisyUI theme classes (text-primary instead of text-emerald-600)
- Stories updated to use text-error/text-success instead of hardcoded text-red-600/text-emerald-600
- Created comprehensive behavior test file with 80+ tests
- Fixed tsconfig.json to exclude .behavior.test.ts files from astro check
- Note: The plan listed `list` and `arrow-right` icons, but actual icons used were different (Clock for header, payment icons, ArrowRight for navigation)
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review specialist: **APPROVED** with P0/P1 feedback addressed

**Estimated Time:** 1 hour

**Status:** ✅ Completed (commit 25d2e11)

---

#### Task 5.4: Migrate AssetUpdateTodoList.astro

**Checklist:**

- [ ] Read current implementation
- [ ] Replace status and action icons
- [ ] Update AssetUpdateTodoList.stories.ts
- [ ] Test in Storybook
- [ ] Run quality gates

**Files to modify:**

- `src/components/organisms/AssetUpdateTodoList.astro`
- `src/components/organisms/AssetUpdateTodoList.stories.ts`

**Icons to replace:**

- `refresh` → `RefreshCw`
- `check` → `Check`
- `alert` → `Bell` or `AlertCircle`

**Estimated Time:** 1-2 hours

**Status:** Pending

---

#### Task 5.5: Migrate BudgetHistoryComparison.astro

**Checklist:**

- [ ] Read current implementation
- [ ] Replace chart/comparison icons
- [ ] Test component rendering
- [ ] Run quality gates

**Files to modify:**

- `src/components/organisms/BudgetHistoryComparison.astro`

**Icons to replace:**

- `calendar` → `Calendar`
- `arrow-left`/`arrow-right` → `ChevronLeft`/`ChevronRight`

**Estimated Time:** 1 hour

**Status:** Pending

---

#### Task 5.6: Migrate DashboardError.astro

**Checklist:**

- [ ] Read current implementation
- [ ] Replace error icons
- [ ] Test error states
- [ ] Run quality gates

**Files to modify:**

- `src/components/organisms/DashboardError.astro`

**Icons to replace:**

- `warning` → `AlertTriangle`
- `refresh` → `RefreshCw`

**Estimated Time:** 30 minutes

**Status:** Pending

---

### Phase 6: Migrate Page Components (Priority: P1)

**Goal:** Update all page-level components

#### Task 6.1: Migrate Budget Page

**Checklist:**

- [ ] Read current budget/index.astro implementation
- [ ] Replace all Icon usage with Lucide
- [ ] Test page functionality
- [ ] Run quality gates

**Files to modify:**

- `src/pages/budget/index.astro`

**Estimated Time:** 1 hour

**Status:** Pending

---

#### Task 6.2: Migrate Settings Pages

**Checklist:**

- [ ] Migrate settings/categories.astro
- [ ] Migrate settings/payment-methods.astro
- [ ] Test CRUD operations
- [ ] Run quality gates

**Files to modify:**

- `src/pages/settings/categories.astro`
- `src/pages/settings/payment-methods.astro`

**Icons to replace:**

- `plus` → `Plus`
- `pencil` → `Edit`
- `trash` → `Trash2`
- `tag` → `Tag`

**Estimated Time:** 2 hours

**Status:** Pending

---

#### Task 6.3: Migrate Transaction Pages

**Checklist:**

- [ ] Migrate transactions/import.astro
- [ ] Migrate transactions/export.astro
- [ ] Test import/export functionality
- [ ] Run quality gates

**Files to modify:**

- `src/pages/transactions/import.astro`
- `src/pages/transactions/export.astro`

**Icons to replace:**

- `arrow-up` → `Upload`
- `arrow-down` → `Download`

**Estimated Time:** 1-2 hours

**Status:** Pending

---

### Phase 7: Migrate Inline SVGs - Atoms & Molecules (Priority: P1)

**Goal:** Replace inline SVG elements with Lucide icons in atomic and molecule components

#### Task 7.1: Migrate ErrorMessage.astro (Inline SVGs)

**Checklist:**

- [ ] Read current ErrorMessage.astro implementation
- [ ] Replace error icon SVG with XCircle from Lucide
- [ ] Replace dismiss button X icon
- [ ] Update ErrorMessage.stories.ts
- [ ] Test in Storybook
- [ ] Run quality gates

**Files to modify:**

- `src/components/atoms/ErrorMessage.astro`
- `src/components/atoms/ErrorMessage.stories.ts`

**Current Pattern:**

```html
<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24">
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
  />
</svg>
```

**New Pattern:**

```astro
---
import { XCircle, X } from '@lucide/astro';
---

<XCircle size={24} class="shrink-0" />
<X size={16} />
```

**Estimated Time:** 1 hour

**Status:** Pending

---

#### Task 7.2: Migrate Toast.astro (Inline SVGs)

**Checklist:**

- [ ] Read current Toast.astro implementation
- [ ] Replace dismiss button SVG with X from Lucide
- [ ] Test toast functionality
- [ ] Run quality gates

**Files to modify:**

- `src/components/molecules/Toast.astro`

**Icons to replace:**

- Dismiss X icon → `X`

**Estimated Time:** 30 minutes

**Status:** Pending

---

#### Task 7.3: Migrate AuthValidationMessages.astro (SVG Strings in Config)

**Checklist:**

- [ ] Read current implementation (SVG strings in config object)
- [ ] Refactor to use Lucide icon components instead of SVG strings
- [ ] Update alertConfig to reference Lucide components
- [ ] Update AuthValidationMessages.stories.ts
- [ ] Test all validation message types
- [ ] Run quality gates

**Files to modify:**

- `src/components/molecules/AuthValidationMessages.astro`
- `src/components/molecules/AuthValidationMessages.stories.ts`

**Current Pattern (SVG as String):**

```typescript
const alertConfig = {
  'email-format': {
    alertClass: 'alert-warning',
    icon: 'svg xmlns="..." <path .../> </svg>', // SVG as string
    defaultMessage: 'Please enter a valid email address',
  },
  // ...
};
```

**New Pattern (Lucide Component):**

```astro
---
import { AlertTriangle, XCircle, Lock, AlertCircle } from '@lucide/astro';

const iconMap = {
  'email-format': AlertTriangle,
  'password-mismatch': XCircle,
  'invalid-credentials': Lock,
  // ...
};

const Icon = iconMap[type];
---

<Icon size={24} class="shrink-0" />
```

**Estimated Time:** 2 hours

**Status:** Pending

---

#### Task 7.4: Migrate Form Components (Inline SVGs)

**Checklist:**

- [ ] Migrate ForgotPasswordForm.astro
- [ ] Migrate LoginForm.astro
- [ ] Migrate RegistrationForm.astro
- [ ] Test form submissions
- [ ] Run quality gates

**Files to modify:**

- `src/components/molecules/ForgotPasswordForm.astro`
- `src/components/molecules/LoginForm.astro`
- `src/components/molecules/RegistrationForm.astro`

**Common inline SVGs:**

- Lock icons
- Eye/EyeOff for password fields
- Alert/warning icons

**Estimated Time:** 2-3 hours

**Status:** Pending

---

#### Task 7.5: Migrate ToastContainer.astro (Inline SVGs)

**Checklist:**

- [ ] Read current implementation
- [ ] Replace inline SVG icons
- [ ] Test toast notifications
- [ ] Run quality gates

**Files to modify:**

- `src/components/molecules/ToastContainer.astro`

**Estimated Time:** 30 minutes

**Status:** Pending

---

### Phase 8: Migrate Inline SVGs - Organisms & Pages (Priority: P1)

**Goal:** Replace inline SVG elements in organism components and page files

#### Task 8.1: Migrate Organism Components (Inline SVGs)

**Checklist:**

- [ ] Migrate SummaryCards.astro
- [ ] Migrate UserContext.astro
- [ ] Migrate DashboardError.astro (if has inline SVGs beyond Icon.astro)
- [ ] Test organism rendering
- [ ] Run quality gates

**Files to modify:**

- `src/components/organisms/SummaryCards.astro`
- `src/components/organisms/UserContext.astro`
- `src/components/organisms/DashboardError.astro`

**Common inline SVGs:**

- Status icons (check, warning, error)
- Financial trend icons (up/down arrows)
- Alert icons

**Estimated Time:** 2-3 hours

**Status:** Pending

---

#### Task 8.2: Migrate Page Components (Inline SVGs)

**Checklist:**

- [ ] Migrate budget/history.astro
- [ ] Migrate register.astro
- [ ] Migrate signup.astro
- [ ] Test page functionality
- [ ] Run quality gates

**Files to modify:**

- `src/pages/budget/history.astro`
- `src/pages/register.astro`
- `src/pages/signup.astro`

**Common inline SVGs:**

- Form icons
- Navigation icons
- Status indicators

**Estimated Time:** 2-3 hours

**Status:** Pending

---

### Phase 9: Cleanup and Documentation (Priority: P2)

**Goal:** Remove deprecated code and update documentation

#### Task 9.1: Delete Icon Component

**Checklist:**

- [ ] Verify no remaining references to Icon.astro
- [ ] Delete src/components/atoms/Icon.astro
- [ ] Delete src/components/atoms/Icon.stories.ts
- [ ] Run typecheck to catch any missed imports
- [ ] Run quality gates

**Files to delete:**

- `src/components/atoms/Icon.astro`
- `src/components/atoms/Icon.stories.ts`

**Verification command:**

```bash
# Search for any remaining Icon imports
grep -r "import Icon from" src/
grep -r "import.*Icon\.astro" src/
```

**Estimated Time:** 30 minutes

**Status:** Pending

---

#### Task 9.2: Update Design System Documentation

**Checklist:**

- [ ] Verify design-system/START.md is current
- [ ] Add migration notes to design-system/02-components.md
- [ ] Create examples in docs/ for common icon patterns
- [ ] Document icon sizing standards

**Files to modify:**

- `design-system/02-components.md` (add icon usage section)
- `docs/icon-migration-guide.md` (create as reference)

**Estimated Time:** 1 hour

**Status:** Pending

---

#### Task 9.3: Update Storybook Stories

**Checklist:**

- [ ] Verify all component stories work with Lucide icons
- [ ] Update story titles/descriptions as needed
- [ ] Test Storybook build
- [ ] Take screenshots for documentation

**Command:**

```bash
bun run storybook
bun run build-storybook
```

**Estimated Time:** 1 hour

**Status:** Pending

---

## How to Test

### Manual Test Steps

**For each migrated component:**

1. **Visual Check**: Run Storybook and verify icons render correctly

   ```bash
   bun run storybook
   ```

2. **Size Verification**: Check all icon sizes match design system
   - xs (12px), sm (16px), md (20px), lg (24px), xl (32px)

3. **Interaction Test**: For interactive icons (buttons, toggles):
   - Click/tap functionality works
   - Hover states are correct
   - Focus indicators are visible

4. **Accessibility Test**:
   - Screen reader announces icons appropriately
   - Keyboard navigation works
   - ARIA labels are present where needed

5. **Responsive Test**:
   - Icons scale properly on mobile
   - Touch targets are ≥44x44px
   - Layout doesn't break

### Automated Tests

**Quality Gates (run after each migration):**

```bash
bun run typecheck     # TypeScript validation
bun run lint          # ESLint validation
bun run stylelint     # CSS validation
bun run format:fix    # Prettier formatting
```

**Search for missed migrations:**

```bash
# Should return 0 results after Phase 9.1
grep -r "import Icon from" src/
grep -r '<Icon name=' src/
grep -r 'xmlns="http://www.w3.org/2000/svg"' src/components/ src/pages/ | grep -v node_modules
```

### Visual Regression Testing

**Before/After Screenshots:**

- Take Storybook screenshots before migration
- Compare after migration to ensure visual parity
- Document any intentional changes

## Dependencies

### Required Packages

- ✅ `@lucide/astro` v0.562.0 (already installed)

### No Additional Installations Needed

All dependencies are already in package.json.

## Success Criteria

- [ ] All 24 files using Icon.astro component are migrated to Lucide (13/24 done)
- [ ] All 20 files with inline SVGs are migrated to Lucide (4/20 done)
- [ ] Icon.astro component is deleted (blocked by remaining usages)
- [ ] Icon.stories.ts is deleted (blocked by remaining usages)
- [ ] No inline SVG elements remain in components or pages
- [x] All quality gates pass (typecheck, lint, stylelint, format)
- [x] All Storybook stories render correctly
- [x] No visual regressions in components
- [x] Accessibility standards maintained (WCAG 2.1 AA)
- [ ] Design system documentation updated
- [x] No console errors or warnings (deprecated icons fixed)
- [ ] All pages render correctly in development
- [ ] Search for `xmlns="http://www.w3.org/2000/svg"` returns 0 results (excluding node_modules)

**Progress Summary:**

- Phase 1 (Preparation): ✅ 1/1 tasks completed
- Phase 2 (Atomic Components): ✅ 2/2 tasks completed
- Phase 3 (Layout Components): ✅ 2/2 tasks completed
- Phase 4 (Molecule Components): ✅ 7/7 tasks completed (Modal.astro, QuickActions.astro, BudgetHealthWidget.astro, TransactionRow.astro, TransactionFilters.astro, TransactionForm.astro, CSVImportForm.astro)
- Phase 5 (Organism Components): 🔄 2/6 tasks completed (TransactionList.astro, RecentTransactionsList.astro)
- Phase 6-9: Pending

**Overall Progress:** 15/31 tasks completed (48%)

## Estimated Effort

| Phase                               | Tasks  | Completed | Time Estimate   | Priority |
| ----------------------------------- | ------ | --------- | --------------- | -------- |
| 1. Preparation                      | 1      | 1         | 1 hour          | P0       |
| 2. Atomic Components (Icon.astro)   | 2      | 2         | 2-3 hours       | P0       |
| 3. Layout Components (Icon.astro)   | 2      | 2         | 3 hours         | P0       |
| 4. Molecule Components (Icon.astro) | 7      | 7         | 7-9 hours       | P1       |
| 5. Organism Components (Icon.astro) | 6      | 1         | 7-9 hours       | P1       |
| 6. Page Components (Icon.astro)     | 3      | 0         | 4-5 hours       | P1       |
| 7. Inline SVGs - Atoms & Molecules  | 5      | 0         | 6-7.5 hours     | P1       |
| 8. Inline SVGs - Organisms & Pages  | 2      | 0         | 4-6 hours       | P1       |
| 9. Cleanup & Docs                   | 3      | 0         | 2.5 hours       | P2       |
| **Total**                           | **31** | **14**    | **37-46 hours** |          |

**Recommended Approach:** Complete phases sequentially. Each phase builds on the previous one and allows for early feedback on patterns.

## Migration Pattern Reference

### Before (Custom Icon Component)

```astro
---
import Icon from '../atoms/Icon.astro';
---

<button class="btn btn-primary">
  <Icon name="plus" size="sm" />
  <span>Add Item</span>
</button>
```

### After (Lucide Icons)

```astro
---
import { Plus } from '@lucide/astro';
---

<button class="btn btn-primary">
  <Plus size={16} />
  <span>Add Item</span>
</button>
```

### Multiple Icons

```astro
---
import { Plus, Edit, Trash2, Check } from '@lucide/astro';
---

<div class="actions">
  <button><Plus size={20} /> Add</button>
  <button><Edit size={20} /> Edit</button>
  <button><Trash2 size={20} /> Delete</button>
  <button><Check size={20} /> Confirm</button>
</div>
```

### Icon with ARIA

```astro
---
import { X } from '@lucide/astro';
---

<!-- Icon button needs aria-label -->
<button class="btn btn-circle btn-ghost" aria-label="Close dialog">
  <X size={24} />
</button>

<!-- Icon with text label doesn't need aria-label -->
<button class="btn btn-primary">
  <X size={20} />
  <span>Cancel</span>
</button>
```

### Inline SVG Migration Patterns

#### Before (Inline SVG Element)

```astro
<div class="alert alert-error">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="stroke-current shrink-0 h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
  <span>Error message</span>
</div>
```

#### After (Lucide Icon)

```astro
---
import { XCircle } from '@lucide/astro';
---

<div class="alert alert-error">
  <XCircle size={24} class="shrink-0" />
  <span>Error message</span>
</div>
```

#### Before (SVG String in Config)

```typescript
const alertConfig = {
  'email-format': {
    alertClass: 'alert-warning',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
    defaultMessage: 'Please enter a valid email address',
  },
};

// Render with set:html (unsafe!)
<div set:html={alertConfig[type].icon} />
```

#### After (Lucide Component Map)

```astro
---
import { AlertTriangle, XCircle, Lock, AlertCircle } from '@lucide/astro';

const iconComponents = {
  'email-format': AlertTriangle,
  'password-mismatch': XCircle,
  'invalid-credentials': Lock,
  'network-error': AlertCircle,
};

const alertConfig = {
  'email-format': {
    alertClass: 'alert-warning',
    defaultMessage: 'Please enter a valid email address',
  },
  // ... other configs
};

const IconComponent = iconComponents[type] || AlertCircle;
const config = alertConfig[type];
---

<div class={`alert ${config.alertClass}`}>
  <IconComponent size={24} class="shrink-0" />
  <span>{config.defaultMessage}</span>
</div>
```

#### Before (Conditional SVG)

```astro
<button onclick="togglePassword()">
  {
    showPassword ? (
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path
          fill-rule="evenodd"
          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
          clip-rule="evenodd"
        />
      </svg>
    ) : (
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
          clip-rule="evenodd"
        />
        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
      </svg>
    )
  }
</button>
```

#### After (Conditional Lucide Icons)

```astro
---
import { Eye, EyeOff } from '@lucide/astro';

const showPassword = false; // dynamic state
---

<button onclick="togglePassword()">
  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
</button>
```

## Risk Mitigation

### Potential Issues

1. **Breaking Changes**: Icon names or sizes might not match exactly
   - **Mitigation**: Use mapping table, test each component in Storybook

2. **Visual Differences**: Lucide icons may look slightly different
   - **Mitigation**: Review in Storybook, adjust sizes if needed

3. **Performance**: Importing many icons could increase bundle size
   - **Mitigation**: Lucide supports tree-shaking, only imports used icons

4. **Accessibility**: Missing ARIA labels after migration
   - **Mitigation**: Add aria-label to icon-only buttons

### Rollforward Plan

If issues are found: FIX IT.

## Notes

- **Design System Compliance**: This migration aligns with design-system/START.md Rule #7 (Icons: Use `@lucide/astro` for all icons)
- **Constitution Alignment**: Follows constitution.md Section I (Code Quality) and Section III (Quality Gates)
- **Accessibility**: Maintains WCAG 2.1 AA compliance throughout migration
- **Performance**: Lucide's tree-shaking ensures no bundle size increase
- **Future-Proof**: Lucide is actively maintained with 1000+ icons available
- **Security**: Eliminates unsafe `set:html` usage for SVG strings
- **Maintainability**: Single source of truth for all icons (no custom SVG paths to maintain)
- **Comprehensive Scope**: Migrates both Icon.astro component (24 files) AND inline SVGs (20 files)

### Code Quality & Accessibility Improvements (Priority: P3)

**Note:** These tasks are follow-up improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability. Use proper checklist when adding.

#### Task: Add aria-hidden to decorative icons in PasswordField.astro (Priority: P2)

**Checklist:**

- [ ] Add `aria-hidden="true"` to Eye icon in PasswordField.astro
- [ ] Add `aria-hidden="true"` to EyeOff icon in PasswordField.astro
- [ ] Add `aria-hidden="true"` to Check icons in PasswordField.astro
- [ ] Add `aria-hidden="true"` to X icons in PasswordField.astro
- [ ] Test with screen reader to verify icons are not announced
- [ ] Run quality gates

**Files to modify:**

- `src/components/atoms/PasswordField.astro`

**Rationale:**

The Eye, EyeOff, Check, and X icons are decorative and should have `aria-hidden="true"` to prevent screen readers from announcing them. The button already has an `aria-label` that describes the action, and the requirement list items have `aria-label` at the parent level. Adding `aria-hidden="true"` to decorative icons is a WCAG best practice that prevents redundant screen reader announcements.

**Estimated Time:** 30 minutes

**Status:** Pending

---

#### Task: Consider using ChevronRight instead of rotated ChevronLeft (Priority: P4)

**Checklist:**

- [ ] Review TransactionList.astro pagination Next button implementation
- [ ] Replace `<ChevronLeft size={16} class="stroke-current rotate-180" />` with `<ChevronRight size={16} class="stroke-current" />`
- [ ] Update imports to include ChevronRight
- [ ] Test pagination functionality
- [ ] Run quality gates

**Files to modify:**

- `src/components/organisms/TransactionList.astro`
- `src/components/organisms/TransactionList.behavior.test.ts` (update tests)

**Rationale:**

The current implementation uses `ChevronLeft` rotated 180 degrees for the Next button. While functionally equivalent, using `ChevronRight` directly is more semantically correct and eliminates the CSS rotation. This is a minor stylistic preference - the current implementation works fine.

**Estimated Time:** 15 minutes

**Status:** Pending
