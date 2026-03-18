# Nav Restructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure primary sidebar and mobile navigation into three labeled groups (Track / Plan / Analyze) and fix the Docs link so it opens in a new tab without losing the user.

**Architecture:** `UserNav.astro` switches from a flat array to a grouped data structure rendered with section labels and dividers. `MobileCommandCenter.astro` replaces the accent header + More Options accordion with a user card header and flat grouped grid. Both changes are contained entirely within their respective component files — no new files, no shared state.

**Tech Stack:** Astro 5.x, `@lucide/astro`, DaisyUI v5 / Tailwind CSS v4

---

## Files Modified

| File | What changes |
|------|-------------|
| `src/components/layouts/UserNav.astro` | Grouped nav structure, section labels, dividers, Docs styling, `BarChart2` icon |
| `src/components/layouts/MobileCommandCenter.astro` | Replace header + accordion with user card + flat grouped grid, `BarChart2` icon, remove More Options JS |

---

### Task 1: Restructure UserNav.astro

**Files:**
- Modify: `src/components/layouts/UserNav.astro`

The current file maps a flat `userNavItems` array. Replace it with a `navGroups` array and a separate `utilityItems` array, then render with labels and dividers.

- [ ] **Step 1: Replace the import list and data structure**

Replace lines 1–40 (the entire frontmatter) with:

```astro
---
import {
  LayoutDashboard,
  Receipt,
  RefreshCw,
  Donut,
  Wallet,
  BarChart2,
  TrendingUp,
  Calculator,
  Settings,
  ClipboardList,
  ExternalLink,
} from '@lucide/astro';

interface Props {
  currentPath?: string;
}

const { currentPath = '/' } = Astro.props;

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Track',
    items: [
      { href: '/transactions', label: 'Transactions', icon: Receipt },
      { href: '/recurring', label: 'Recurring', icon: RefreshCw },
      { href: '/accounts', label: 'Accounts', icon: Wallet },
    ],
  },
  {
    label: 'Plan',
    items: [
      { href: '/budget', label: 'Budget', icon: Donut },
      { href: '/forecast', label: 'Forecast', icon: TrendingUp },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart2 },
      { href: '/calculators', label: 'Calculators', icon: Calculator },
    ],
  },
];

const utilityItems: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: 'https://docs.allowealth.io', label: 'Docs', icon: ClipboardList, external: true },
];

const isActive = (href: string) => {
  if (href === '/settings') {
    return (
      currentPath === '/profile' ||
      currentPath === '/security' ||
      currentPath.startsWith('/settings')
    );
  }
  if (currentPath === href) return true;
  return currentPath.startsWith(href + '/');
};
---
```

- [ ] **Step 2: Replace the template**

Replace everything after the closing `---` with:

```astro
{
  navGroups.map((group, groupIndex) => (
    <>
      {groupIndex > 0 && (
        <li role="presentation" aria-hidden="true">
          <hr class="my-1 border-base-content/10 mx-2 group-data-[sidebar-collapsed=true]:mx-1" />
        </li>
      )}
      {group.label && (
        <li role="presentation">
          <span
            aria-hidden="true"
            class="block px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-base-content/30 group-data-[sidebar-collapsed=true]:hidden"
          >
            {group.label}
          </span>
        </li>
      )}
      {group.items.map((item) => {
        const active = isActive(item.href);
        return (
          <li class="shrink-0">
            <a
              href={item.href}
              data-nav-href={item.href}
              rel={item.external ? 'noopener noreferrer' : undefined}
              target={item.external ? '_blank' : undefined}
              title={item.label}
              aria-label={item.external ? `${item.label} (opens in new tab)` : item.label}
              class={`relative flex items-center gap-4 py-4 px-5 text-base rounded-xl transition-all duration-200 group border group-data-[sidebar-collapsed=true]:justify-center group-data-[sidebar-collapsed=true]:px-0 group-data-[sidebar-collapsed=true]:gap-0 ${
                active
                  ? 'bg-accent/10 text-accent font-bold border-accent/20'
                  : 'text-base-content/60 hover:text-base-content font-medium border-transparent'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`}
              aria-current={!item.external && active ? 'page' : undefined}
            >
              <item.icon
                size={22}
                class={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-accent' : ''}`}
                aria-hidden="true"
              />
              <span class="group-data-[sidebar-collapsed=true]:hidden">{item.label}</span>
              <span
                class={`ml-auto w-2 h-2 bg-accent rounded-full animate-pulse group-data-[sidebar-collapsed=true]:hidden ${active ? '' : 'hidden'}`}
                data-nav-dot
                aria-hidden="true"
              />
            </a>
          </li>
        );
      })}
    </>
  ))
}

{/* Utility zone: Settings + Docs */}
<li role="presentation" aria-hidden="true">
  <hr class="my-1 border-base-content/10 mx-2 group-data-[sidebar-collapsed=true]:mx-1" />
</li>
{
  utilityItems.map((item) => {
    const active = isActive(item.href);
    const isDocs = item.external;
    return (
      <li class="shrink-0">
        <a
          href={item.href}
          data-nav-href={item.href}
          rel={item.external ? 'noopener noreferrer' : undefined}
          target={item.external ? '_blank' : undefined}
          title={item.label}
          aria-label={item.external ? `${item.label} (opens in new tab)` : item.label}
          class={`relative flex items-center gap-4 py-4 px-5 text-base rounded-xl transition-all duration-200 group border group-data-[sidebar-collapsed=true]:justify-center group-data-[sidebar-collapsed=true]:px-0 group-data-[sidebar-collapsed=true]:gap-0 ${
            isDocs
              ? 'text-base-content/40 hover:text-base-content/60 font-medium border-transparent'
              : active
                ? 'bg-accent/10 text-accent font-bold border-accent/20'
                : 'text-base-content/60 hover:text-base-content font-medium border-transparent'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`}
          aria-current={!item.external && active ? 'page' : undefined}
        >
          <item.icon
            size={22}
            class={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${active && !isDocs ? 'text-accent' : ''}`}
            aria-hidden="true"
          />
          <span class="group-data-[sidebar-collapsed=true]:hidden">{item.label}</span>
          {isDocs && (
            <ExternalLink
              size={12}
              class="ml-auto shrink-0 group-data-[sidebar-collapsed=true]:hidden"
              aria-hidden="true"
            />
          )}
          {!isDocs && (
            <span
              class={`ml-auto w-2 h-2 bg-accent rounded-full animate-pulse group-data-[sidebar-collapsed=true]:hidden ${active ? '' : 'hidden'}`}
              data-nav-dot
              aria-hidden="true"
            />
          )}
        </a>
      </li>
    );
  })
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd /Users/ivan/Works/allowealth && bun run typecheck 2>&1 | tail -20
```

Expected: `0 errors`

- [ ] **Step 4: Open the app and verify visually**

Navigate to `http://main.allowealth.local:4350/dashboard` in Chrome.

Check:
- Section labels "Track", "Plan", "Analyze" appear in the sidebar
- Dividers separate each group
- Docs is visually muted (lighter than other items) with a small ↗ icon
- Clicking Docs opens `https://docs.allowealth.io` in a **new tab**
- Dashboard remains at the top with its active state
- Collapse the sidebar (click `<` toggle) — labels disappear, dividers remain

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/UserNav.astro
git commit -m "feat(nav): restructure sidebar into Track/Plan/Analyze groups with muted Docs link"
```

---

### Task 2: Restructure MobileCommandCenter.astro

**Files:**
- Modify: `src/components/layouts/MobileCommandCenter.astro`

This task replaces the accent header bar and More Options accordion with a user card header and flat grouped grid. Only the `!isSuperAdmin` branch changes. The admin branch is untouched.

- [ ] **Step 1: Update the import list**

In the frontmatter (lines 8–29), replace `ChartBar` with `BarChart2` and remove `ChevronDown` (no longer needed). Also remove `ClipboardList` from the import since Docs moves to the user links section using `ExternalLink` instead:

```astro
import {
  ArrowLeftRight,
  Wallet,
  Donut,
  BarChart2,
  Menu,
  X,
  User,
  Shield,
  LogOut,
  Settings,
  House,
  RefreshCw,
  TrendingUp,
  Calculator,
  ClipboardList,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  Activity,
} from '@lucide/astro';
```

Note: keep `ClipboardList` for the admin Audit Logs tile (line 262). Remove `ChevronDown` only.

- [ ] **Step 2: Replace the sheet header**

Replace the current header block (lines 131–151):

```astro
{/* Header - Distinctive accent background */}
<div
  class="flex items-center justify-between px-5 sm:px-6 py-4 bg-linear-to-r from-accent/10 via-accent/5 to-transparent border-b border-accent/10"
>
  ...
</div>
```

With a user card header:

```astro
{/* User Card Header */}
<div class="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-base-content/8">
  <div class="flex items-center gap-3">
    <div
      class="w-11 h-11 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm ring-2 ring-accent/10 shrink-0"
    >
      {user?.name ? user.name.substring(0, 2).toUpperCase() : '--'}
    </div>
    <div class="min-w-0">
      <p class="font-semibold text-base-content truncate leading-tight">{user?.name || 'User'}</p>
      <p class="text-xs text-base-content/50 truncate">{user?.email || ''}</p>
    </div>
  </div>
  <Button
    variant="ghost"
    className="command-close-btn p-3 rounded-xl border-0 bg-base-200 text-base-content/60 hover:text-base-content hover:bg-base-300"
    data-menu-close
    aria-label="Close navigation menu"
  >
    <X size={20} aria-hidden="true" />
  </Button>
</div>
```

- [ ] **Step 3: Replace the main navigation grid (both branches)**

Replace the entire outer `<div class="p-4 sm:p-5 grid grid-cols-3 gap-3">` block (which wraps both the user branch and the admin branch) with the following. The user branch gets a grouped layout; the admin branch is preserved unchanged inside its own container:

```astro
{/* Main Navigation - grouped (user) */}
{
  !isSuperAdmin && (
    <div class="p-4 sm:p-5 space-y-4">
      {/* Dashboard */}
      <div>
        <a
          href="/dashboard"
          class={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-95 ${isActive('/dashboard') ? 'bg-accent text-accent-content shadow-md shadow-accent/20' : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content'}`}
          aria-current={isActive('/dashboard') ? 'page' : undefined}
        >
          <House size={22} stroke-width={isActive('/dashboard') ? 2.5 : 2} aria-hidden="true" />
          <span class="text-sm font-semibold">Dashboard</span>
        </a>
      </div>

      {/* Track */}
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-widest text-base-content/30 px-1 mb-2" aria-hidden="true">Track</p>
        <div class="grid grid-cols-3 gap-3">
          <a
            href="/transactions"
            class={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${isActive('/transactions') ? 'bg-accent text-accent-content shadow-md shadow-accent/20' : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content'}`}
            aria-current={isActive('/transactions') ? 'page' : undefined}
          >
            <ArrowLeftRight size={22} stroke-width={isActive('/transactions') ? 2.5 : 2} aria-hidden="true" />
            <span class="text-xs font-semibold">Transactions</span>
          </a>
          <a
            href="/recurring"
            class={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${isActive('/recurring') ? 'bg-accent text-accent-content shadow-md shadow-accent/20' : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content'}`}
            aria-current={isActive('/recurring') ? 'page' : undefined}
          >
            <RefreshCw size={22} stroke-width={isActive('/recurring') ? 2.5 : 2} aria-hidden="true" />
            <span class="text-xs font-semibold">Recurring</span>
          </a>
          <a
            href="/accounts"
            class={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${isActive('/accounts') ? 'bg-accent text-accent-content shadow-md shadow-accent/20' : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content'}`}
            aria-current={isActive('/accounts') ? 'page' : undefined}
          >
            <Wallet size={22} stroke-width={isActive('/accounts') ? 2.5 : 2} aria-hidden="true" />
            <span class="text-xs font-semibold">Accounts</span>
          </a>
        </div>
      </div>

      {/* Plan */}
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-widest text-base-content/30 px-1 mb-2" aria-hidden="true">Plan</p>
        <div class="grid grid-cols-3 gap-3">
          <a
            href="/budget"
            class={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${isActive('/budget') ? 'bg-accent text-accent-content shadow-md shadow-accent/20' : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content'}`}
            aria-current={isActive('/budget') ? 'page' : undefined}
          >
            <Donut size={22} stroke-width={isActive('/budget') ? 2.5 : 2} aria-hidden="true" />
            <span class="text-xs font-semibold">Budget</span>
          </a>
          <a
            href="/forecast"
            class={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${isActive('/forecast') ? 'bg-accent text-accent-content shadow-md shadow-accent/20' : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content'}`}
            aria-current={isActive('/forecast') ? 'page' : undefined}
          >
            <TrendingUp size={22} stroke-width={isActive('/forecast') ? 2.5 : 2} aria-hidden="true" />
            <span class="text-xs font-semibold">Forecast</span>
          </a>
        </div>
      </div>

      {/* Analyze */}
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-widest text-base-content/30 px-1 mb-2" aria-hidden="true">Analyze</p>
        <div class="grid grid-cols-3 gap-3">
          <a
            href="/reports"
            class={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${isActive('/reports') ? 'bg-accent text-accent-content shadow-md shadow-accent/20' : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content'}`}
            aria-current={isActive('/reports') ? 'page' : undefined}
          >
            <BarChart2 size={22} stroke-width={isActive('/reports') ? 2.5 : 2} aria-hidden="true" />
            <span class="text-xs font-semibold">Reports</span>
          </a>
          <a
            href="/calculators"
            class={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${isActive('/calculators') ? 'bg-accent text-accent-content shadow-md shadow-accent/20' : 'bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content'}`}
            aria-current={isActive('/calculators') ? 'page' : undefined}
          >
            <Calculator size={22} stroke-width={isActive('/calculators') ? 2.5 : 2} aria-hidden="true" />
            <span class="text-xs font-semibold">Calculators</span>
          </a>
        </div>
      </div>
    </div>
  )
}

{/* Admin navigation - unchanged, just wrapped in its own container */}
{
  isSuperAdmin && (
    <div class="p-4 sm:p-5 grid grid-cols-3 gap-3">
      {/* admin branch — copy the existing admin <a> tiles here verbatim, no changes */}
    </div>
  )
}
```

> **Note:** For the admin grid tiles, copy the existing `isSuperAdmin` branch from the original file exactly as-is (the five tiles: Dashboard `/admin`, Workspaces, Users, Audit Logs, Diagnostics). No changes needed there.

- [ ] **Step 4: Remove the More Options accordion blocks**

Delete lines 286–348 entirely (the `{!isSuperAdmin && <div class="px-4...">More Options button</div>}` block and the `{!isSuperAdmin && <div id="more-menu-content"...>` expanded content block).

- [ ] **Step 5: Replace the bottom user section**

Replace the current bottom user card (lines 350–396) with a flat user links list:

```astro
{/* User links */}
{
  !isSuperAdmin && (
    <div class="mx-4 sm:mx-5 mb-6 mt-2 border-t border-base-content/8 pt-3 space-y-1">
      <a
        href="/profile"
        class="flex items-center gap-3 px-4 py-3 min-h-11 rounded-xl text-base-content/70 hover:bg-base-200 hover:text-base-content transition-all active:scale-95 text-sm font-medium"
      >
        <User size={18} aria-hidden="true" />
        Profile
      </a>
      <a
        href="/security"
        class="flex items-center gap-3 px-4 py-3 min-h-11 rounded-xl text-base-content/70 hover:bg-base-200 hover:text-base-content transition-all active:scale-95 text-sm font-medium"
      >
        <Shield size={18} aria-hidden="true" />
        Security
      </a>
      <a
        href="/settings"
        class="flex items-center gap-3 px-4 py-3 min-h-11 rounded-xl text-base-content/70 hover:bg-base-200 hover:text-base-content transition-all active:scale-95 text-sm font-medium"
      >
        <Settings size={18} aria-hidden="true" />
        Settings
      </a>
      <hr class="border-base-content/8 mx-2" aria-hidden="true" />
      <a
        href="https://docs.allowealth.io"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-3 px-4 py-3 min-h-11 rounded-xl text-base-content/40 hover:text-base-content/60 hover:bg-base-200 transition-all active:scale-95 text-sm font-medium"
        aria-label="Documentation (opens in new tab)"
      >
        <ExternalLink size={18} aria-hidden="true" />
        Documentation
      </a>
      <hr class="border-base-content/8 mx-2" aria-hidden="true" />
      <Button
        variant="ghost"
        className="logout-btn w-full justify-start gap-3 px-4 py-3 min-h-11 rounded-xl border-0 text-error hover:bg-error/10 text-sm font-medium"
      >
        <LogOut size={18} aria-hidden="true" />
        Sign out
      </Button>
    </div>
  )
}
```

- [ ] **Step 6: Simplify More Options JS from the `<script>` block**

Remove the accordion-specific code while keeping the focus trap working. Make these targeted edits:

1. **Remove** the `moreMenuBtn`, `moreMenuContent`, and `chevronIcon` variable declarations.
2. **Remove** the `if (!(moreMenuBtn instanceof HTMLButtonElement)) return;` guard.
3. **Remove** the entire `moreMenuBtn.addEventListener('click', ...)` block.
4. **Remove** the three lines inside `closeSheet` that reset the more menu state (`moreMenuContent?.classList.add('hidden')`, `chevronIcon?.classList.remove('rotate-180')`, `moreMenuBtn.setAttribute(...)`).
5. **Replace** the `cachedFocusableElements` / `getFocusableElements` / `invalidateFocusCache` block with a simpler non-caching version — the focus trap still needs `getFocusableElements`, but without cache invalidation it can be a plain function:

```ts
const getFocusableElements = () => {
  return Array.from(
    sheet.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('inert'));
};
```

The remaining script handles: open/close sheet, backdrop click, escape key, link click → close, logout, focus trap, MutationObserver cleanup, view transition cleanup.

- [ ] **Step 7: Verify no TypeScript errors**

```bash
cd /Users/ivan/Works/allowealth && bun run typecheck 2>&1 | tail -20
```

Expected: `0 errors`

- [ ] **Step 8: Verify visually on mobile**

In Chrome DevTools, switch to a mobile viewport (e.g. iPhone 14, 390px wide) and navigate to `http://main.allowealth.local:4350/dashboard`.

Check:
- Bottom bar still shows with Menu button and quick-access icons
- Tap Menu — sheet slides up
- Sheet shows user card at top (initials, name, email) with close button
- Track / Plan / Analyze section labels appear above their grids
- Forecast and Calculators are now in the main grid (not hidden behind More Options)
- No "More Options" button anywhere
- Scroll to bottom — user links (Profile, Security, Settings, Documentation ↗, Sign out) appear
- Tap Documentation — opens `https://docs.allowealth.io` in a new tab

- [ ] **Step 9: Run quality gates**

```bash
cd /Users/ivan/Works/allowealth
bun run lint:fix
bun run format:fix
bun run typecheck
```

Expected: all pass with no errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/layouts/MobileCommandCenter.astro
git commit -m "feat(nav): restructure mobile command center with grouped navigation and user card header"
```

---

### Task 3: Final verification

- [ ] **Step 1: Full build check**

```bash
cd /Users/ivan/Works/allowealth && bun run build 2>&1 | tail -30
```

Expected: build completes with no errors.

- [ ] **Step 2: Smoke-test sidebar collapse**

In Chrome at `http://main.allowealth.local:4350/dashboard`:
1. Click the `<` collapse toggle
2. Confirm section labels disappear, dividers remain, icons align correctly
3. Click `>` to expand — labels reappear

- [ ] **Step 3: Smoke-test active states**

Navigate to `/transactions`, `/budget`, `/reports` — confirm the correct item highlights in each group.

- [ ] **Step 4: Smoke-test Docs on desktop**

Click Docs in the sidebar — confirm it opens in a **new tab** and the app stays open in the original tab.
