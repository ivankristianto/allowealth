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
