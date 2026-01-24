### Future Improvement: Extract Large Component Logic

**Goal:** Improve maintainability of large components

**Files affected:**

- `src/components/atoms/PasswordField.astro` (282 lines)
- `src/components/molecules/TransactionForm.astro` (978 lines)

**Recommendation:**

- Extract validation logic to separate utility files
- Extract localStorage helpers to shared utilities
- Consider splitting PasswordField into smaller atoms

**Estimated Time:** 4-6 hours

**Status:** ⏳ Future

---

### Future Improvement: Add Motion Library to More Components

**Goal:** Consistent animation system across all interactive components

**Components to consider:**

- Dropdown menus
- List item hover animations
- Card hover effects
- Page transitions

**Estimated Time:** 3-4 hours

**Status:** ⏳ Future

---

### Future Improvement: Enhanced Focus Trap for Modals

**Goal:** Better accessibility for modal dialogs

**Current State:** Modal works but focus trap could be more robust

**Recommendation:**

- Add explicit focus trap using focus-trap library or custom implementation
- Ensure tab cycling stays within modal
- Return focus to trigger element on close

**Estimated Time:** 2 hours

**Status:** ⏳ Future

### Task 5: Mobile Bottom Navigation (Priority: P1)

**Goal:** Implement mobile navigation bar with floating action button (FAB) for add transaction

**Current Issue:** No dedicated mobile navigation component with FAB pattern.

**Checklist:**

- [ ] Create MobileNavigation layout component
- [ ] Implement 5-slot layout (Home, Ledger, +FAB, Budget, Settings)
- [ ] Create elevated FAB with scale animation on tap
- [ ] Add glass effect background (`backdrop-blur-xl`)
- [ ] Style nav items with icon + label (uppercase tracking-widest, 10px)
- [ ] Implement active state styling (text-accent, scale-110)
- [ ] Add shadow for elevation (`shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`)
- [ ] Hide on desktop (`lg:hidden`)
- [ ] Add to MainLayout
- [ ] Add `role="navigation"` and `aria-label`
- [ ] Ensure touch targets minimum 44x44px
- [ ] Create Storybook story
- [x] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/layouts/MobileNavigation.astro` (new)
- `src/layouts/MainLayout.astro`

**Accessibility:**

- [ ] Add `role="navigation"` to nav element
- [ ] Add `aria-label="Mobile navigation"`
- [ ] Add `aria-current="page"` to active item
- [ ] Ensure FAB has accessible label ("Add new transaction")
- [ ] Minimum touch target 44x44px for all buttons

**UI Change:**

```
Mobile viewport (< 1024px):

┌─────────────────────────────────────┐
│                                     │
│         Page Content                │
│                                     │
├───────────────┬─────┬───────────────┤
│ 🏠    📋    │ [+] │    📊    ⚙️   │
│ HOME  LEDGER │ FAB │  BUDGET  SET  │
└───────────────┴─────┴───────────────┘
                  ↑ elevated button (-top-10)
```

**Status:** ⏳ Pending

---
