# Home Button in Docs Header - Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Home button to the Starlight docs header that links to allowealth.io

**Architecture:** Use Starlight's built-in `social` configuration to add a website/home link. No custom components needed.

**Tech Stack:** Astro, Starlight

---

## File Structure

| File | Purpose |
|------|---------|
| `apps/docs/astro.config.mjs` | Starlight configuration - add social link |

---

## Task 1: Add Social Link Configuration

**Files:**
- Modify: `apps/docs/astro.config.mjs`

- [ ] **Step 1: Read the current astro.config.mjs**

Run: `cat apps/docs/astro.config.mjs`

Purpose: Understand current configuration structure

- [ ] **Step 2: Add social configuration to Starlight**

Locate the `starlight({...})` configuration object. Add a `social` property with the website link.

Change from:
```javascript
starlight({
  title: 'Allowealth Docs',
  description: 'User and developer documentation for Allowealth.',
  logo: {
    src: './public/favicon.svg',
    alt: 'Allowealth',
  },
  favicon: '/favicon.svg',
  customCss: ['./src/styles/brand.css'],
  sidebar: [...],
}),
```

To:
```javascript
starlight({
  title: 'Allowealth Docs',
  description: 'User and developer documentation for Allowealth.',
  logo: {
    src: './public/favicon.svg',
    alt: 'Allowealth',
  },
  favicon: '/favicon.svg',
  customCss: ['./src/styles/brand.css'],
  social: {
    github: 'https://github.com/ivankristianto/allowealth',
    website: 'https://allowealth.io',
  },
  sidebar: [...],
}),
```

- [ ] **Step 3: Verify the configuration is valid**

Run: `cd apps/docs && bun run build`

Expected: Build completes successfully with no errors

- [ ] **Step 4: Test locally**

Run: `cd apps/docs && bun run dev`

Open `http://localhost:4321` in browser.

Verify:
- [ ] Home icon (house/website icon) appears in header
- [ ] Clicking icon navigates to `https://allowealth.io`
- [ ] Icon visible on desktop
- [ ] Icon visible on mobile (use devtools responsive mode)
- [ ] Styling matches existing social links

- [ ] **Step 5: Commit the changes**

```bash
git add apps/docs/astro.config.mjs
git commit -m "feat(docs): add home button linking to allowealth.io (ALL-58)"
```

---

## Testing Checklist

Before considering this complete:

- [ ] Home icon appears in desktop header
- [ ] Home icon appears in mobile header
- [ ] Clicking icon navigates to `https://allowealth.io` in new tab
- [ ] Icon styling matches existing social links
- [ ] Works in both light and dark themes
- [ ] Build passes (`bun run build`)
- [ ] No console errors

---

## Notes

- The `website` key in social config uses a house/home icon by default in Starlight
- No additional styling needed - inherits Starlight's social link styles
- The icon will have a tooltip showing the URL on hover
- This is a configuration-only change - no custom components required
