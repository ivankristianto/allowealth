# Design: Home Button in Docs Header

**Issue:** ALL-58  
**Date:** 2026-03-21  
**Status:** Approved for Implementation

---

## Summary

Add a "Home" button in the Starlight documentation header that links back to the main Allowealth landing page (`https://allowealth.io`). This addresses the disconnected user experience where documentation visitors have no clear path back to the marketing site.

---

## Problem Statement

Users browsing the documentation site (`docs.allowealth.io`) currently have no navigation path back to the main landing page. This creates friction when users want to return to the homepage, pricing page, or other marketing content after reading documentation.

---

## Requirements

### Functional Requirements

1. **Home Button Visibility**: A "Home" button appears in the Starlight header
2. **Navigation**: Clicking the button navigates to `https://allowealth.io`
3. **Responsive**: Button is visible on both desktop and mobile views
4. **Styling**: Matches existing Starlight header elements

### Non-Functional Requirements

- **Maintainability**: Use Starlight's built-in configuration options (minimal custom code)
- **Performance**: No additional JavaScript or assets required
- **Accessibility**: Follows Starlight's built-in accessibility patterns

### Out of Scope

- Modifying the landing page (apps/site) — it already has links to docs
- Changing the docs site title/logo behavior
- Adding navigation to other external sites

---

## Solution Design

### Approach: Social Links Configuration

Use Starlight's `social` configuration option to add a home/website link. This is the most straightforward approach requiring only configuration changes.

**Why this approach:**
- **Low maintenance**: Single config change, survives Starlight updates
- **Built-in styling**: Inherits Starlight's social link styles
- **Familiar location**: Users expect navigation actions in the header's right section
- **Icon included**: Starlight provides a standard home/house icon

**Alternative considered (rejected):**
- Header component override would require custom Astro components and ongoing maintenance as Starlight evolves

---

## Implementation Details

### Configuration Change

In `apps/docs/astro.config.mjs`, add a `social` object to the Starlight configuration:

```javascript
starlight({
  title: 'Allowealth Docs',
  // ... existing config
  social: {
    github: 'https://github.com/ivankristianto/allowealth',
    website: 'https://allowealth.io', // Adds home icon
  },
})
```

### Visual Behavior

- **Desktop**: Home icon appears in the header's right section alongside other social links
- **Mobile**: Home icon appears in the mobile menu header
- **Hover states**: Follows Starlight's default social link hover styling
- **Theme support**: Automatically adapts to light/dark themes

### Acceptance Criteria Verification

| Criteria | Implementation |
|----------|---------------|
| Button in header | ✓ Social links render in header by default |
| Links to allowealth.io | ✓ URL configured in social.website |
| Desktop & mobile | ✓ Starlight handles responsive layout |
| Matches styling | ✓ Uses Starlight's social link styles |

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Home icon appears in desktop header
- [ ] Home icon appears in mobile header/menu
- [ ] Clicking icon navigates to `https://allowealth.io`
- [ ] Icon styling matches existing social links
- [ ] Works in both light and dark themes
- [ ] No console errors

### Verification Steps

1. Run `bun run dev` in `apps/docs/`
2. Open `http://localhost:4321`
3. Verify home icon in header
4. Click home icon, verify navigation to allowealth.io
5. Test responsive behavior at various viewport sizes
6. Toggle theme and verify icon visibility

---

## Files Modified

- `apps/docs/astro.config.mjs` — Add `social` configuration object

---

## Risks and Mitigation

| Risk | Mitigation |
|------|-----------|
| Social links not visible enough | Position is standard for navigation actions; users intuitively look to header right side for actions |
| Starlight version changes behavior | Configuration-based approach minimizes breaking changes |
| Icon not recognizable as "Home" | Uses standard home/house iconography; tooltip on hover clarifies |

---

## Success Criteria

- Users can navigate from docs to landing page in one click
- Implementation requires minimal ongoing maintenance
- No regressions in existing docs functionality
