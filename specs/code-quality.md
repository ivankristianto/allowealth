## Code Quality Improvements

### Cleanup Tasks (Priority: P3-P4)

**Task: Remove Deprecated Component Patterns**

- [ ] Audit components for legacy patterns
- [ ] Remove unused CSS classes
- [ ] Consolidate duplicate styles
- [ ] Update any hardcoded values to use tokens

**Task: Storybook Story Updates**

- [x] Create stories for new atoms (ProgressBar, IconBadge) ✅
- [x] Create stories for new molecules (BudgetAlertBanner) ✅
- [x] Create stories for new organisms (SpendingCard) ✅
- [x] Create stories for new organisms (SpendingChart, BudgetCard, etc.) ✅
- [x] Create stories for TransactionSummaryCards ✅
- [x] Create stories for BudgetPageHeader ✅
- [x] Create stories for TransactionFiltersBar ✅

### Non-Blocking Feedback from Code Review (Task 6)

**P2-1: Hardcoded Size Values in Comments** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/atoms/IconBadge.astro` (lines 31-35)
- [x] **Issue:** Comments mention pixel values (20px, 24px, 30px) but use Tailwind classes
- **Action:** Update to reference Tailwind class names in comments instead

**Implementation Notes:**

- Updated comments to reference design system typography tokens (`fontSizes.xl`, `fontSizes['2xl']`, `fontSizes['3xl']`)
- Comments now include both token name, rem value, and pixel equivalent for clarity
- Example: `// fontSizes.xl (1.25rem / 20px)` instead of just `// 20px`

**P2-2: Inconsistent Status Badge Styling** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/SpendingCard.astro` (lines 110-118)
- [x] **Issue:** The status badge uses inline conditional class construction
- **Action:** Extract to a reusable `getStatusBadgeClasses` utility

**Implementation Notes:**

- Created `getStatusBadgeClasses()` function in `src/lib/tokens.ts`
- Function returns DaisyUI semantic color classes for theme compatibility
- Updated `SpendingCard.astro` to use the new utility
- Added comprehensive unit tests (12 tests) in `src/lib/tokens.test.ts`
- Type-safe implementation with explicit literal type annotations
- JSDoc documentation with @param, @returns, and @example

**Additional P2 Suggestions from Code Review (Added for Future Work):**

- **Extract BudgetStatusType type alias** - Currently the status type union is duplicated in multiple places. Could create `export type BudgetStatusType = 'status-ok' | 'status-warning' | 'status-danger';` for DRY compliance.
- **Standardize status type conventions** - Codebase has two different status conventions (`status-ok/warning/danger` vs `ok/warning/exceeded`). Consider standardizing.

**P2-3: Animations Not Using Motion Library** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/atoms/ProgressBar.astro` (line 69)
- [x] **Issue:** Uses CSS class instead of Motion library
- **Action:** Per design system guidelines, CSS transitions are appropriate for simple animations. Added prefers-reduced-motion support.

**Implementation Notes:**

- Used CSS transitions (per design system: "Use CSS Transitions For: Simple transforms")
- Added `@media (prefers-reduced-motion: reduce)` to disable animation for users who prefer reduced motion
- Used `requestAnimationFrame` for progressive enhancement
- 36 unit tests added covering animation behavior, accessibility, and status mapping

**P2-4: Missing Loading State Accessibility** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/SpendingCard.astro` (line 56)
- [x] **Issue:** Loading state could benefit from more descriptive aria-label
- **Action:** Added `aria-label="Loading spending data..."` and `aria-busy` attributes

**Implementation Notes:**

- Added `aria-busy={loading}` to indicate loading state
- Added `aria-label={loading ? 'Loading spending data...' : undefined}` for screen readers
- Wrapped skeleton elements with `aria-hidden="true"` to hide from assistive technology
- 25 unit tests added covering accessibility patterns

### Non-Blocking Feedback from Code Review (Task 9)

**P2-1: Missing Empty State** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/NetWorthWidget.astro`
- [x] **Issue:** Component has no explicit empty state (when all values are 0)
- **Action:** Added empty state with helpful message and CTA button to add first asset

**Implementation Notes:**

- Added `isEmpty` check: `totalIDR === 0 && totalUSD === 0 && localAssets === 0 && globalAssets === 0`
- Empty state shows Wallet icon, "No assets yet" message, and "Add Asset" CTA button
- Links to `/assets/add` for easy first asset creation
- 6 unit tests added covering empty state detection

### Non-Blocking Feedback from Code Review (Tasks 13 & 14)

**P2-1: Loading States Not Used**

- **Location:** `/home/ivan/works/k2-expenses-G8m/src/pages/transactions/index.astro`
- [ ] **Issue:** TransactionSummaryCards has loading prop support but it's never passed
- **Action:** Add loading state during data fetching for better UX

**P2-2: Hardcoded Currency**

- **Location:** `/home/ivan/works/k2-expenses-G8m/src/pages/transactions/index.astro`
- [ ] **Issue:** Currency is hardcoded as "IDR" instead of using user's preference
- **Action:** Use user.currency or user settings for currency preference

**P2-3: Store File Not Used**

- **Location:** `/home/ivan/works/k2-expenses-G8m/src/lib/stores/transactionFiltersStore.ts`
- [ ] **Issue:** Store exports functions that are never imported/used
- **Action:** Either remove the file or implement client-side enhancement (kept for future use)

**P3-1: Extract Month Navigation Logic to Utility**

- **Location:** `/home/ivan/works/k2-expenses-G8m/src/pages/transactions/index.astro`
- [ ] **Issue:** Month extraction logic could be in a reusable utility
- **Action:** Create `extractAvailableMonths()` in `@/lib/utils/date.ts`

**P3-2: Use `<button>` Instead of `<a>` for Filters**

- **Location:** `/home/ivan/works/k2-expenses-G8m/src/components/organisms/TransactionFiltersBar.astro`
- [ ] **Issue:** Type filter uses `<a>` elements with `role="button"` causing semantic confusion
- **Action:** Consider using `<button>` elements with form submission for true progressive enhancement

**P3-1: Component Could Use Design Token for Spacing**

- **Location:** Various locations in NetWorthWidget.astro
- [ ] **Issue:** Some spacing values use direct Tailwind classes (`mb-6`, `mt-3`, `gap-3`) instead of design system spacing tokens
- **Action:** Consider using `spacing` tokens where appropriate for consistency

**P3-2: Story Names Could Be More Descriptive**

- **Location:** `/home/ivan/works/expenses/src/components/organisms/NetWorthWidget.stories.ts`
- [ ] **Issue:** Stories like `LargeAssets` and `MinimalAssets` could use more descriptive names
- **Action:** Rename to `LargePortfolio`, `StartingPortfolio` for better clarity

### Non-Blocking Feedback from Code Review (Tasks 15-16)

**P2-1: Duplicate Category Icon Mapping** ✅ FIXED

- **Location:** `BudgetCard.astro` and `BudgetCardGrid.astro`
- [x] **Issue:** Category icon mapping is duplicated in both components
- **Action:** Extract to a shared utility function in `@/lib/tokens.ts` or create a dedicated `categoryIcons.ts` utility

**Implementation Notes:**

- Created `src/lib/utils/categoryIcons.ts` with centralized `categoryIconMap` and `getIconForCategory()` function
- Updated `BudgetCard.astro` to import and use the shared utility
- Updated `BudgetCardGrid.astro` to import and use the shared utility
- Updated both test files (`BudgetCard.test.ts`, `BudgetCardGrid.test.ts`) to import from shared utility
- Fixed deprecated `Home` icon by replacing with `House`
- All 57 tests pass

**P2-2: Magic Number for Skeleton Count** ✅ FIXED

- **Location:** `BudgetCardGrid.astro` (line 91)
- [x] **Issue:** Skeleton count is hardcoded as 6
- **Action:** Made `skeletonCount` a configurable prop with default value of 6

**Implementation Notes:**

- Added `skeletonCount?: number` prop to Props interface with JSDoc documentation
- Default value of 6 represents 2 rows in 3-column grid layout
- 5 unit tests added covering configurable skeleton count

**P2-3: Multiple Non-null Assertions in Budget Page** ✅ FIXED

- **Location:** `src/pages/budget/index.astro` (lines 20, 41, 99, 136)
- [x] **Issue:** Multiple `user!` non-null assertions
- **Action:** Added early return guard clause at top of frontmatter

**Implementation Notes:**

- Added guard clause: `if (!user) return Astro.redirect('/login');`
- Removed all `user!` non-null assertions (4 occurrences)
- Provides both type safety and handles edge cases gracefully

**P3-1: Animation Classes Could Use Motion Library**

- **Location:** `BudgetAdviceBanner.astro` script tag (lines 115-118)
- [ ] **Issue:** Uses CSS classes (`animate-out`, `fade-out`) instead of Motion library
- **Action:** Consider using Motion for consistency with design system pattern

**P3-2: Import Ordering Convention**

- **Location:** Various new components
- [ ] **Issue:** Import ordering could be more consistent (external → internal → types)
- **Action:** Apply consistent import ordering: external packages → @/ aliases → relative imports → types

### Non-Blocking Feedback from Code Review (Task 17 - Dark Mode)

**P1-1: SpendingChart Tooltip Colors Don't Update on Theme Change** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/SpendingChart.astro`
- [x] **Issue:** Chart tooltip colors are set at initialization time and don't update dynamically when theme changes
- **Action:** Added MutationObserver on `data-theme` attribute to update chart colors on theme change

**Implementation Notes:**

- Added `themeObserver` MutationObserver to watch for `data-theme` attribute changes
- Created `updateChartThemeColors()` function to update tooltip colors on all chart instances
- Uses `chart.update('none')` to update without animation for seamless theme switching
- Proper cleanup in `cleanupCharts()` function to prevent memory leaks
- Fixed `astro:page-load` → `astro:before-swap` event for proper cleanup timing
- 10 unit tests added covering theme detection and tooltip color logic

**P1-2: BudgetAlertBanner Uses is:inline with define:vars** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/molecules/BudgetAlertBanner.astro`
- [x] **Issue:** Uses `is:inline` with `define:vars` which limits script capabilities
- **Action:** Refactored to use data attributes pattern per CLAUDE.md guidelines

**P2-1: Consider Adding Theme Transition Animation** ✅ FIXED

- **Location:** `src/components/atoms/ThemeToggle.astro` and `src/styles/globals.css`
- [x] **Issue:** Theme switch is instant without transition
- **Action:** Added CSS transition with prefers-reduced-motion support

**Implementation Notes:**

- Added theme transition CSS in `globals.css` for html and body elements
- Respects `prefers-reduced-motion: no-preference` media query
- Added `.theme-transition` utility class for components needing theme-aware transitions
- Transitions: background-color, color, border-color (0.3s ease)

### Non-Blocking Feedback from Code Review (Storybook Stories - Code Quality Session)

**P1-1: Inconsistent ARIA Patterns Between Stories and Components** ✅ FIXED

- **Location:** All three new story files (TransactionSummaryCards, BudgetPageHeader, TransactionFiltersBar)
- [x] **Issue:** SVG icons in stories don't have `aria-hidden="true"` attribute that the Astro components include
- **Action:** Add `aria-hidden="true"` to all decorative SVG icons in stories

**Implementation Notes:**

- Added `aria-hidden="true"` to all decorative SVG icons in TransactionSummaryCards.stories.ts (3 icons)
- Added `aria-hidden="true"` to all decorative SVG icons in BudgetPageHeader.stories.ts (4 icons)
- Added `aria-hidden="true"` to all decorative SVG icons in TransactionFiltersBar.stories.ts (7 icons + 1 dynamic check icon)
- All icons now match the accessibility patterns in their corresponding Astro components

**P1-3: Story Helper Function Type Safety** ✅ FIXED

- **Location:** All three new story files
- [x] **Issue:** Stories use type assertions `as Args` instead of proper StoryObj generic typing
- **Action:** Use `type Story = StoryObj<Args>` pattern for proper type inference

**Implementation Notes:**

- Added `type Story = StoryObj<Args>` type alias to all three story files
- Updated all story exports from `export const X: StoryObj` to `export const X: Story`
- Removed type assertions `(args as Args)` from render functions - args are now properly typed

**P1-2: Missing aria-disabled Handling in Story** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/TransactionFiltersBar.stories.ts`
- [x] **Issue:** Month navigation buttons in story don't replicate aria-disabled pattern from Astro component
- **Action:** Match component's accessibility patterns for disabled state demonstration

**Implementation Notes:**

- Added `hasPrevMonth` and `hasNextMonth` props to interface
- Added calculation of disabled state based on month index
- Updated month navigation buttons with `aria-disabled`, `data-has-prev`, `data-has-next` attributes
- Added disabled state styling (opacity-30, cursor-not-allowed, pointer-events-none)
- Added `FirstMonthDisabled` and `LastMonthDisabled` stories

**P2-1: Meta Type Could Be More Specific** ✅ FIXED

- **Location:** All three new story files (TransactionSummaryCards, BudgetPageHeader, TransactionFiltersBar)
- [x] **Issue:** The `Meta` type is used without type parameters, so argTypes aren't type-checked against Args
- **Action:** Use `Meta<Args>` for better type safety: `const meta: Meta<TransactionSummaryCardsArgs> = { ... }`

**Implementation Notes:**

- Updated all three story files to use typed Meta: `Meta<TransactionSummaryCardsArgs>`, `Meta<BudgetPageHeaderArgs>`, `Meta<TransactionFiltersBarArgs>`
- Moved interfaces before meta declarations for proper TypeScript compilation
- Provides better type inference for argTypes

**P2-2: Duplicate Icon Definitions Across Stories** ✅ FIXED

- **Location:** BudgetPageHeader.stories.ts and TransactionFiltersBar.stories.ts
- [x] **Issue:** `chevronLeftIcon` and `chevronRightIcon` are defined identically in both files
- **Action:** Consider creating shared `stories/icons.ts` utility for common SVG icons

**Implementation Notes:**

- Created `src/stories/icons.ts` with shared icon definitions
- Exported `chevronLeftIcon`, `chevronRightIcon`, `chevronDownIcon`
- Updated BudgetPageHeader.stories.ts and TransactionFiltersBar.stories.ts to import from shared utility
- Added 19 unit tests for icon consistency and accessibility

**P2-3: Stories Missing Storybook Parameters** ✅ FIXED

- **Location:** All three new story files
- [x] **Issue:** Stories could have better presentation with layout and backgrounds parameters
- **Action:** Add `parameters: { layout: 'padded' }` for better story presentation

**Implementation Notes:**

- Added `parameters: { layout: 'padded' }` to meta object in all three story files
- Improves story presentation in Storybook UI

### Non-Blocking Feedback from Code Review (Code Quality Session 2)

**P2-1: ProgressBar - Add aria-valuetext for Accessibility Enhancement** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/atoms/ProgressBar.astro`
- [x] **Issue:** Screen reader users may benefit from human-readable progress description
- **Action:** Added `aria-valuetext={\`${clampedValue} percent\`}` to progressbar

**Implementation Notes:**

- Added `aria-valuetext` attribute for human-readable progress description
- 5 unit tests added covering aria-valuetext behavior

**P2-2: NetWorthWidget - Empty State Check Could Be More Robust** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/NetWorthWidget.astro` (line 48)
- [x] **Issue:** Uses strict equality with 0. May not handle null, undefined, or small floats
- **Action:** Changed to defensive falsy check: `!totalIDR && !totalUSD && !localAssets && !globalAssets`

**Implementation Notes:**

- Falsy check handles null, undefined, NaN, and exactly 0
- Small positive/negative floats (e.g., 0.01) correctly show normal state (truthy)
- 12 unit tests added covering edge cases including null, undefined, and mixed falsy values

**P2-3: SpendingCard - Loading State Screen Reader Enhancement** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/SpendingCard.astro`
- [x] **Issue:** Normal state could also benefit from aria-labelledby pointing to heading
- **Action:** Added `aria-labelledby={!loading && !error ? 'spending-card-title' : undefined}`

**Implementation Notes:**

- Added `aria-labelledby` pointing to heading for normal state
- Only active when not loading and no error
- 5 unit tests added covering aria-labelledby behavior

**P2-4: Theme Transition - Document .theme-transition Class Usage**

- **Location:** `/home/ivan/works/expenses/src/styles/globals.css`
- [ ] **Issue:** `.theme-transition` class defined but not documented/used
- **Action:** Document the class in design system or apply to relevant components

**P3-1: ProgressBar - Extract Animation Configuration to CSS Variables**

- **Location:** `/home/ivan/works/expenses/src/components/atoms/ProgressBar.astro`
- [ ] **Issue:** Animation timing (1s) and easing hardcoded in CSS
- **Action:** Consider extracting to `--animation-duration-slow` and `--animation-easing-ease-out`

**P3-2: BudgetCardGrid - Consider aria-rowcount for Large Lists** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/BudgetCardGrid.astro`
- [x] **Issue:** Large grids could benefit from total count announcement
- **Action:** Add `aria-rowcount={budgets.length}` to grid container

**Implementation Notes:**

- Added `aria-rowcount={budgets.length}` to the grid container
- Announces total number of budget items to screen readers
- 4 unit tests added covering aria-rowcount behavior

### Non-Blocking Feedback from Code Review (Code Quality Session 3)

**P2-1: SpendingChart - Theme Observer Doesn't Listen for System Preference Changes**

- **Location:** `/home/ivan/works/expenses/src/components/organisms/SpendingChart.astro`
- [ ] **Issue:** Observer only watches `data-theme` attribute. When no theme is explicitly set and user changes system preference, chart tooltips won't update
- **Action:** Add media query listener for `prefers-color-scheme` changes when no explicit theme is set

**P2-2: Budget Page - Unused Helper Functions Duplicating Server Logic**

- **Location:** `/home/ivan/works/expenses/src/pages/budget/index.astro` (lines 274-316)
- [ ] **Issue:** Functions `formatCurrencyClient`, `getStatus`, `getStatusBadgeClasses`, `getProgressColorClass` duplicate server-side logic
- **Action:** Document why duplication is necessary (client-side cannot import server modules) or consider shared utility

**P2-3: SpendingCard - aria-labelledby ID Could Conflict with Multiple Cards** ✅ FIXED

- **Location:** `/home/ivan/works/expenses/src/components/organisms/SpendingCard.astro`
- [x] **Issue:** If multiple SpendingCard components are on same page, they all have same ID (`spending-card-title`)
- **Action:** Generate unique IDs similar to SpendingChart pattern: `spending-card-${Math.random().toString(36).slice(2, 11)}`

**Implementation Notes:**

- Added unique ID generation: `const uniqueId = \`spending-card-${Math.random().toString(36).slice(2, 11)}\``
- Updated aria-labelledby to use uniqueId instead of hardcoded 'spending-card-title'
- Updated h3 id attribute to use uniqueId
- 9 unit tests added covering unique ID generation and behavior

**P3-3: ProgressBar - Consider Adding aria-label for Context**

- **Location:** `/home/ivan/works/expenses/src/components/atoms/ProgressBar.astro`
- [ ] **Issue:** While `aria-valuetext` helps, an optional `aria-label` prop would allow fuller context
- **Action:** Add optional `ariaLabel` prop for parent components to provide context (e.g., "Budget progress for January")
