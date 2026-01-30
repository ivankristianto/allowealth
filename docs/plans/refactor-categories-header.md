# Refactoring Plan: Categories, Header, and TransactionCard Cleanup

**Version:** 1.0.0
**Date:** 2026-01-30
**Completed:** 2026-01-30
**Status:** ✅ Completed

---

## 1. Executive Summary

This plan addresses five refactoring tasks:

1. Remove `getCategoryMeta` from TransactionCard - use category's stored icon/color instead
2. Move categories page from `/categories` to `/budget/categories`
3. Make Header title/subtitle configurable per-page (remove hardcoded maps)
4. Extract Header notification into separate component
5. Reuse ThemeToggle component in Header mobile view

---

## 2. Dependencies Analysis

### 2.1 getCategoryMeta Usage

| File                                                         | Usage                    | Impact                              |
| ------------------------------------------------------------ | ------------------------ | ----------------------------------- |
| `src/lib/utils/categoryMeta.ts`                              | Source file              | **DELETE**                          |
| `src/components/molecules/TransactionCard.astro`             | Import & call            | **MODIFY**                          |
| `src/components/organisms/RecentTransactionsList.stories.ts` | Local duplicate function | **MODIFY** (has own implementation) |

**No tests exist** for `categoryMeta.ts` - safe to delete without test updates.

### 2.2 Categories Page Move

| File                                        | Change                                                         |
| ------------------------------------------- | -------------------------------------------------------------- |
| `src/pages/categories/index.astro`          | **MOVE** to `src/pages/budget/categories/index.astro`          |
| `src/pages/categories/categories-client.ts` | **MOVE** to `src/pages/budget/categories/categories-client.ts` |
| `src/components/layouts/Navigation.astro`   | **MODIFY** - update href & remove from navItems                |
| `AGENTS.md`                                 | **MODIFY** - update routes documentation                       |

### 2.3 Header Refactor

| File                                  | Change                                                             |
| ------------------------------------- | ------------------------------------------------------------------ |
| `src/components/layouts/Header.astro` | **MAJOR MODIFY** - remove `getPageTitle`, `getSubtitle`, add props |
| `src/layouts/ProtectedLayout.astro`   | **MODIFY** - pass title through                                    |
| `src/layouts/MainLayout.astro`        | Already supports title/subtitle props                              |
| All 15+ protected pages               | **MODIFY** - define own title/subtitle                             |

### 2.4 Notification Component Extraction

| File                                                  | Change                                   |
| ----------------------------------------------------- | ---------------------------------------- |
| `src/components/layouts/Header.astro`                 | **MODIFY** - extract notification markup |
| `src/components/molecules/NotificationDropdown.astro` | **CREATE**                               |

### 2.5 ThemeToggle Reuse

| File                                     | Change                                             |
| ---------------------------------------- | -------------------------------------------------- |
| `src/components/layouts/Header.astro`    | **MODIFY** - replace inline theme toggle           |
| `src/components/atoms/ThemeToggle.astro` | **MODIFY** - add size/variant props for header use |

---

## 3. Security Analysis

### 3.1 Potential Security Flaws

| Area                                              | Risk                                | Mitigation                                             |
| ------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Category icon/color from DB                       | XSS if icon name is user-controlled | CategoryIcon already sanitizes - uses allowlist lookup |
| Page title/subtitle from props                    | XSS if interpolating user data      | Use `textContent` not `innerHTML` - already safe       |
| Route change `/categories` → `/budget/categories` | Broken bookmarks, SEO               | Add redirect (optional, low priority)                  |

### 3.2 No New Security Concerns

- All changes are internal refactoring
- No new user input handling
- No new API endpoints

---

## 4. Minimal Viable File Structure

```
src/
├── components/
│   ├── atoms/
│   │   └── ThemeToggle.astro          # MODIFY - add compact variant
│   ├── molecules/
│   │   ├── TransactionCard.astro      # MODIFY - remove getCategoryMeta
│   │   └── NotificationDropdown.astro # CREATE - extracted from Header
│   └── layouts/
│       ├── Header.astro               # MODIFY - simplify, use components
│       └── Navigation.astro           # MODIFY - remove categories link
├── layouts/
│   └── ProtectedLayout.astro          # MODIFY - pass title/subtitle through
├── lib/
│   └── utils/
│       └── categoryMeta.ts            # DELETE
├── pages/
│   ├── categories/                    # DELETE (entire folder)
│   └── budget/
│       └── categories/
│           ├── index.astro            # CREATE (moved from /categories)
│           └── categories-client.ts   # CREATE (moved from /categories)
└── [15+ protected pages]              # MODIFY - add title/subtitle props
```

---

## 5. Implementation Order

Per constitution: **UI → Service → API → CLI → Seeder**

### Phase 1: TransactionCard + getCategoryMeta Cleanup

1. Modify `TransactionCard.astro` to use `category.icon` and `category.color`
2. Update `RecentTransactionsList.stories.ts` to use IconBadge pattern
3. Delete `src/lib/utils/categoryMeta.ts`
4. Run quality gates

### Phase 2: Categories Page Move

1. Create `src/pages/budget/categories/` directory
2. Move `index.astro` and `categories-client.ts`
3. Update `currentPath` in moved page to `/budget/categories`
4. Modify `Navigation.astro` - remove `/categories` from navItems
5. Update `AGENTS.md` routes documentation
6. Delete old `src/pages/categories/` folder
7. Run quality gates

### Phase 3: Header Title/Subtitle Refactor

1. Modify `Header.astro`:
   - Remove `getPageTitle()` and `getSubtitle()` functions
   - Remove `pathMap` and `titles` hardcoded objects
   - Accept `title` and `subtitle` as required props
2. Update `MainLayout.astro` to pass title prop to Header
3. Update all 15+ protected pages to define their own title/subtitle
4. Run quality gates

### Phase 4: Notification Component Extraction

1. Create `NotificationDropdown.astro` with extracted markup
2. Add `@TODO` comment for real notification implementation
3. Import and use in `Header.astro`
4. Run quality gates

### Phase 5: ThemeToggle Reuse

1. Add `variant` or `size` prop to `ThemeToggle.astro` for compact header use
2. Replace inline theme toggle in Header with ThemeToggle component
3. Ensure CSS classes match between old and new implementation
4. Remove duplicate theme toggle script from Header
5. Run quality gates

---

## 6. Pages Requiring Title/Subtitle Updates

| Page                   | Title          | Subtitle                        |
| ---------------------- | -------------- | ------------------------------- |
| `/dashboard`           | Dashboard      | Welcome back! {month}           |
| `/transactions`        | Transactions   | {count} transactions this month |
| `/budget`              | Budget         | Monthly budget overview         |
| `/budget/history`      | Budget History | Compare spending over time      |
| `/budget/categories`   | Categories     | Manage your transaction labels  |
| `/assets`              | Assets         | Net worth: {amount}             |
| `/assets/add`          | Add Asset      | Register a new account          |
| `/assets/edit/[id]`    | Edit Asset     | Update asset details            |
| `/assets/history`      | Asset History  | Track balance changes           |
| `/assets/history/[id]` | Asset History  | {asset name} history            |
| `/reports`             | Reports        | {month}                         |
| `/forecast`            | Forecast       | Based on your spending patterns |
| `/calculators`         | Calculators    | Financial planning tools        |
| `/settings`            | Settings       | Manage your preferences         |
| `/profile`             | Profile        | Manage your account details     |
| `/security`            | Security       | Protect your account            |
| `/transactions/export` | Export         | Download your transactions      |
| `/transactions/import` | Import         | Upload transactions             |

---

## 7. Risk Assessment

| Risk                               | Probability | Impact | Mitigation                            |
| ---------------------------------- | ----------- | ------ | ------------------------------------- |
| Breaking existing category display | Low         | Medium | Category already has icon/color in DB |
| Broken links to /categories        | Medium      | Low    | Users must update bookmarks           |
| Missing title on a page            | Low         | Low    | TypeScript will catch missing props   |
| Theme toggle behavior difference   | Low         | Medium | Reuse exact same logic                |

---

## 8. Testing Strategy

### Manual Testing Required

- [x] TransactionCard displays correct icons for different categories
- [x] Categories page accessible at `/budget/categories`
- [x] Navigation sidebar no longer shows Categories link
- [x] All page titles display correctly in Header
- [x] Notification dropdown opens/closes properly
- [x] Theme toggle works in mobile header
- [x] Theme toggle syncs with desktop floating toggle

### Automated Tests

- No tests for categoryMeta.ts (none exist)
- No tests for Header.astro (integration tests only)
- Update any E2E tests that navigate to `/categories`

---

## 9. Decisions (Confirmed)

| Decision                  | Choice                | Rationale                                          |
| ------------------------- | --------------------- | -------------------------------------------------- |
| Categories in Navigation  | **Remove completely** | Accessible via direct URL or link from Budget page |
| Redirect from /categories | **No redirect**       | Simpler implementation, 404 is acceptable          |
| ThemeToggle adaptation    | **Add size prop**     | Add 'sm' variant for compact header usage          |

---

## 10. Approval Checklist

- [x] Dependencies reviewed
- [x] Security analysis complete
- [x] File structure approved
- [x] Implementation order confirmed
- [x] Risk assessment acceptable
- [x] Clarification questions answered

---

## 11. Implementation Summary

**All phases completed successfully on 2026-01-30.**

### Files Modified

- `src/components/molecules/TransactionCard.astro` - Uses CategoryIcon with DB icon/color
- `src/components/organisms/RecentTransactionsList.stories.ts` - Updated with icon/color maps
- `src/components/layouts/Header.astro` - Accepts title prop, uses NotificationDropdown and ThemeToggle
- `src/components/layouts/Navigation.astro` - Removed Categories link
- `src/components/atoms/ThemeToggle.astro` - Added `size` prop ('sm' | 'md')
- `src/layouts/ProtectedLayout.astro` - Passes title/subtitle to Header
- `src/lib/types/transaction.ts` - Added icon/color to category relation
- `src/lib/utils/transaction.ts` - Updated DrizzleTransactionResult interface
- `src/services/dashboard.service.ts` - Added icon/color to recentTransactions
- 18+ protected pages - Added title/subtitle props

### Files Created

- `src/components/molecules/NotificationDropdown.astro` - Extracted notification UI
- `src/pages/budget/categories/index.astro` - Moved from /categories
- `src/pages/budget/categories/categories-client.ts` - Moved from /categories

### Files Deleted

- `src/lib/utils/categoryMeta.ts` - No longer needed
- `src/pages/categories/` - Moved to /budget/categories

### Quality Gates

- ✅ ESLint passed
- ✅ Stylelint passed
- ✅ Prettier passed
- ✅ TypeScript passed (0 errors)
