---
name: Allowealth
description: Calm, trustworthy, precise financial tooling for a household. The Steady Ledger.
colors:
  forest-signal: '#15803d'
  forest-signal-hover: '#166534'
  forest-signal-dark: '#22c55e'
  forest-signal-dark-hover: '#16a34a'
  slate-ink: '#0f172a'
  slate-mist: '#f1f5f9'
  surface-base: '#ffffff'
  surface-raised: '#f8fafc'
  surface-edge: '#e2e8f0'
  neutral-muted: '#475569'
  success-emerald: '#047857'
  warning-amber: '#b45309'
  error-rose: '#e11d48'
  info-sky: '#0284c7'
  dark-base: '#111827'
  dark-raised: '#1e293b'
  dark-edge: '#334155'
  dark-content: '#cbd5e1'
  dark-heading: '#e2e8f0'
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '2.25rem'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.025em'
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '1.875rem'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.025em'
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: 'normal'
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '0.8125rem'
    fontWeight: 500
    lineHeight: 1
    letterSpacing: '0.025em'
  numeric:
    fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace"
    fontSize: '0.9375rem'
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 'normal'
rounded:
  field: '0'
  sm: '0.125rem'
  md: '0.375rem'
  lg: '0.5rem'
  card: '0.75rem'
  button: '1rem'
  full: '9999px'
spacing:
  form: '1rem'
  card: '1.75rem'
  section: '2rem'
components:
  button-primary:
    backgroundColor: '{colors.forest-signal}'
    textColor: '{colors.surface-base}'
    rounded: '{rounded.button}'
    padding: '0.625rem 1.25rem'
    height: '2.5rem'
    typography: '{typography.body}'
  button-primary-hover:
    backgroundColor: '{colors.forest-signal-hover}'
    textColor: '{colors.surface-base}'
    rounded: '{rounded.button}'
  button-outline:
    backgroundColor: '{colors.surface-base}'
    textColor: '{colors.forest-signal}'
    rounded: '{rounded.button}'
    padding: '0.625rem 1.25rem'
    height: '2.5rem'
  button-ghost:
    backgroundColor: '{colors.surface-base}'
    textColor: '{colors.slate-ink}'
    rounded: '{rounded.button}'
  input-field:
    backgroundColor: '{colors.surface-base}'
    textColor: '{colors.slate-ink}'
    rounded: '{rounded.field}'
    padding: '0.5rem 0.75rem'
    height: '2.5rem'
    typography: '{typography.label}'
  card:
    backgroundColor: '{colors.surface-base}'
    textColor: '{colors.slate-ink}'
    rounded: '{rounded.card}'
    padding: '1.75rem'
  badge:
    backgroundColor: '{colors.slate-mist}'
    textColor: '{colors.slate-ink}'
    rounded: '{rounded.full}'
    padding: '0.25rem 0.625rem'
    typography: '{typography.label}'
---

# Design System: Allowealth

## 1. Overview

**Creative North Star: "The Steady Ledger"**

Allowealth carries the quiet composure of a good accountant's hand. Money is stressful, so the interface never adds to the noise: figures are honest and exact, surfaces are calm, and nothing shouts. The green pen comes out only when it matters. Restraint is not the absence of design here, it is the design. The page recedes so the numbers can lead.

This is a **product** register and a **Restrained** color system: tinted slate neutrals carry the surface, and a single forest-green accent (Forest Signal) appears on roughly a tenth of any screen, reserved for the one action or status that deserves attention. Two themes are first-class and equally maintained: a bright light mode for daytime household glances and a comfortable, glare-free dark mode for late-night reviews. Components feel **refined and restrained**, furniture-grade craft, whisper-soft elevation, intentional edges. The system deliberately holds a small tension: fields are sharp-cornered (0 radius) for ledger-like precision, while buttons are softly rounded (16px) so the call to action feels approachable, not stern.

It explicitly rejects four things. It is not **gamified fintech** (no confetti, badges, streaks, dopamine nudges). It is not an **enterprise banking dashboard** (no heavy corporate chrome, no dense gray clutter). It is not a **generic SaaS template** (no cream-and-purple gradients, no hero-metric card rows, no identical icon grids). And it is not **crypto / neon dark** (no neon-on-black, no glowing gradients, no hype). This is serious, long-horizon, private money.

**Key Characteristics:**

- Restrained palette: tinted slate neutrals plus one forest-green signal.
- Forest Signal appears on ≤10% of any screen; its rarity is the point.
- Flat by default; depth comes from tonal layering, not heavy shadows.
- Sharp fields, soft buttons: a deliberate precision/approachability tension.
- Exact numbers in a tabular monospace; honesty over flattery.
- WCAG 2.1 AA in both themes; color is never the only signal.

## 2. Colors: The Steady Ledger Palette

A near-monochrome slate foundation, tinted cool, broken by a single deliberate forest green. Semantic colors are muted at the 600–700 level in light mode for AA contrast, then desaturated to the 400 level in dark mode to avoid glare.

### Primary

- **Forest Signal** (`#15803d` light / `#22c55e` dark): The one accent. Primary CTAs, active navigation, focus rings, on-track status, positive confirmation. Hover deepens to `#166534` (light) / `#16a34a` (dark). It is rare on purpose: the more of it you see, the less it means.

### Neutral

- **Slate Ink** (`#0f172a`): Headings and primary text in light mode. Maximum contrast (~17:1 on white). In dark mode, headings shift to **Slate Heading** (`#e2e8f0`, ~14:1 on dark-base).
- **Slate Mist** (`#f1f5f9`): Light-mode tonal fill for badges and quiet emphasis.
- **Neutral Muted** (`#475569`): Secondary text, icons, muted labels. AA-safe on raised surfaces.
- **Surface Base** (`#ffffff` light / `#111827` dark): The body and sidebar floor.
- **Surface Raised** (`#f8fafc` light / `#1e293b` dark): Cards and elevated surfaces, one tonal step up.
- **Surface Edge** (`#e2e8f0` light / `#334155` dark): Borders, dividers, hover states, two steps up.

### Tertiary (semantic status)

- **Success Emerald** (`#047857` light / `#34d399` dark): Positive status, confirmations. Distinct from the accent so "this happened" reads apart from "do this".
- **Warning Amber** (`#b45309` light / `#fbbf24` dark): Budget caution (80–99% spent).
- **Error Rose** (`#e11d48` light / `#f87171` dark): Over budget (≥100%), destructive actions.
- **Info Sky** (`#0284c7` light / `#38bdf8` dark): Neutral information, USD currency. Kept visually distinct from Forest Signal.
- **Currency:** IDR renders in emerald (`#047857`), USD in sky (`#0284c7`), so currency is legible at a glance without reading the symbol.

### Named Rules

**The One Signal Rule.** Forest Signal covers ≤10% of any given screen. It marks the single most important action or the on-track state, nothing else. If two greens compete on one view, one of them is wrong.

**The Tinted Neutral Rule.** Never `#000` or pure `#fff` as a working text/border value. Neutrals are slate, tinted cool. Surfaces step tonally (base → raised → edge), 6–10% luminance apart, so elevation reads without a shadow.

**The Honest Color Rule.** Status color always pairs with text or an icon. A red number is never the only signal that a budget is blown; color-blind and glancing users get the word too.

## 3. Typography

**Display / Body / Label Font:** Inter (with `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` fallback)
**Numeric Font:** SF Mono (with `Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace` fallback)

**Character:** Inter is neutral, legible, and quietly modern; it gets out of the way. The monospace is reserved for figures so columns of money align to the digit and read as exact, the typographic signature of a ledger.

### Hierarchy

- **Display** (700, 2.25rem / 36px, line-height 1.25, tracking -0.025em): Rare, large moments only (auth screens, the occasional standout figure). Not for routine page chrome.
- **Headline** (700, 1.875rem / 30px, line-height 1.25): Major page identity where a page wants weight.
- **Title** (600, 1.25rem / 20px, line-height 1.375): Section and card headings. The workhorse heading inside the app.
- **Body** (400, 0.9375rem / 15px, line-height 1.5): Default reading text. Cap measured prose at 65–75ch. The base is intentionally restrained (15px) for dense financial views, never below 13px.
- **Label** (500, 0.8125rem / 13px, tracking 0.025em): Field labels, badges, metadata. 13px is the accessible floor; nothing renders smaller.
- **Numeric** (500, SF Mono, tabular): Amounts, balances, totals. Aligns to the digit for scannable columns.

### Named Rules

**The Tabular Money Rule.** Currency and quantitative figures use the monospace stack so digits align in columns. Prose never uses it; mono is for numbers that must be compared, not for flavor.

**The 13px Floor Rule.** No text smaller than 13px (`text-xs`), ever. Hierarchy comes from weight (400 → 600 → 700) and scale, not from shrinking labels into illegibility.

## 4. Elevation

Flat by default. Depth is communicated first by tonal layering (the three-step surface ramp: base → raised → edge), then by 1px borders, and only last by shadows. Light-mode shadows are whisper-soft, near-invisible ambient lift on cards (`0 1px 3px rgba(0,0,0,0.05)`), never the heavy drop shadows of a 2014 app. Dark mode leans almost entirely on the surface ramp and borders, since shadows barely read on near-black.

The single expressive exception is the **accent glow**: a soft, forest-tinted shadow (`0 10px 15px -3px rgb(21 128 61 / 0.25)`) reserved for primary CTAs. It is the one place the system permits a colored shadow, and it reinforces the One Signal Rule rather than competing with it.

### Shadow Vocabulary

- **Premium / Card** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px 0 rgb(0 0 0 / 0.03)`): The resting state for cards. Barely there.
- **Ambient sm → lg** (`--shadow-sm` … `--shadow-lg`): Reserved for transient layers (dropdowns, popovers). Use the smallest that does the job.
- **Accent Glow** (`box-shadow: 0 10px 15px -3px rgb(21 128 61 / 0.25)`): Primary CTA only. The forest-tinted lift that says "this is the action".

### Named Rules

**The Flat-At-Rest Rule.** Surfaces are flat at rest and earn elevation through tone and border, not shadow. A shadow above `--shadow-sm` is a response to state (a floating menu, a CTA), never a default decoration. If it looks like a card is hovering for no reason, the shadow is wrong.

## 5. Components

Components are **refined and restrained**: precise edges, soft transitions (200ms, `cubic-bezier(0.4, 0, 0.2, 1)`), focus that is always visible.

### Buttons

- **Shape:** Softly rounded (`rounded-2xl`, 1rem / 16px) by default. Every button declares explicit rounding; the DaisyUI default is never relied upon.
- **Primary:** Forest Signal fill, white text, `0.625rem 1.25rem` padding, `2.5rem` height, plus the accent glow shadow. This is the only button that glows.
- **Hover / Focus:** Background deepens (`#166534`); focus shows a 2px Forest Signal ring with 2px offset. `transition-all` 200ms.
- **Outline:** Transparent fill, Forest Signal text and 1px border, hover fills to `accent/10`. For secondary actions that still want the accent's authority.
- **Ghost:** Base text with a 1px `surface-edge` border, hover fills to `surface-raised`. For low-emphasis actions. Never a bare borderless ghost on a colored background (fails non-text contrast).

### Inputs / Fields

- **Style:** Sharp-cornered (`0` radius, the deliberate ledger edge), 1px `surface-edge` border, `surface-base` fill, `2.5rem` height, 13px text.
- **Focus:** Border shifts to Forest Signal with a soft 2px ring at 25% opacity (`rgb(21 128 61 / 0.25)`). No glow, no jump.
- **Error / Disabled:** Error pairs a rose border with an icon and message (never color alone). Disabled uses native `disabled` plus reduced opacity.

### Cards / Containers

- **Corner Style:** Gently rounded (`rounded-card`, 0.75rem / 12px).
- **Background:** `surface-base`, sitting on the `surface-raised` body for tonal separation.
- **Border:** 1px `surface-edge`. The border does the separating work; the shadow only whispers.
- **Shadow Strategy:** Resting premium/card shadow only (see Elevation). Hover lift is reserved for cards that are genuinely clickable.
- **Internal Padding:** `1.75rem` (28px). Never nest a card inside a card.

### Badges

- **Style:** Slate-mist fill, slate-ink text, fully rounded, `0.25rem 0.625rem` padding, weight 700, 13px.
- **State:** Semantic variants (success/warning/error/info) follow the status palette and always include a word, not just a tint.

### Navigation (Sidebar + Mobile Bottom Nav)

- **Desktop sidebar:** 16rem wide, items at `0.625rem 1rem` padding, 22px icons. The **active item** is the one sanctioned use of a colored leading indicator: a 2px Forest Signal left border plus a faint left-to-right accent gradient wash. Hover fills to `surface-raised`.
- **Mobile bottom nav:** Fixed, near-opaque surface (`bg-base-100/95`, not heavy blur, for iOS Safari performance), with a center floating action button haloed in a soft forest radial glow.
- **States:** Default neutral-muted, hover surface-raised, active Forest Signal text + indicator.

## 6. Do's and Don'ts

### Do:

- **Do** keep Forest Signal to ≤10% of any screen: one primary action, on-track status, focus, active nav. Its rarity is its meaning (The One Signal Rule).
- **Do** render money and comparable figures in the SF Mono stack so digits align in columns (The Tabular Money Rule).
- **Do** build depth from the tonal surface ramp (base `#ffffff`/`#111827` → raised `#f8fafc`/`#1e293b` → edge `#e2e8f0`/`#334155`) and 1px borders before reaching for a shadow.
- **Do** give buttons explicit `rounded-2xl` (16px) and keep fields sharp (0 radius). The tension is intentional.
- **Do** pair every status color with a word or icon; never signal "over budget" with red alone (The Honest Color Rule).
- **Do** maintain both themes as first-class; light uses 600–700 tokens for AA, dark desaturates to 400 to kill glare.
- **Do** keep text at 13px or larger and build hierarchy through weight and scale (The 13px Floor Rule).
- **Do** honor `prefers-reduced-motion`; motion is feedback, never required to understand state.

### Don't:

- **Don't** gamify. No confetti, badges-as-rewards, streaks, dopamine nudges, or mascots. Money is not a game.
- **Don't** build an enterprise banking dashboard: no dense gray corporate chrome, no clutter, no cold institutional density.
- **Don't** reach for generic SaaS clichés: no cream-and-purple gradients, no hero-metric card rows (big number + small label + gradient accent), no identical icon-heading-text card grids.
- **Don't** go crypto/neon: no neon-on-black, no glowing gradient surfaces, no hype. Forest stays muted; dark mode stays comfortable, never electric.
- **Don't** use a colored side-stripe border (`border-left`/`border-right` > 1px) on cards, list items, callouts, or alerts. The 2px Forest Signal indicator is permitted on the **active nav item only**, nowhere else.
- **Don't** use `background-clip: text` gradient text. Emphasis comes from weight and size, in a single solid color.
- **Don't** apply decorative glassmorphism or large `backdrop-blur` on fixed/always-visible surfaces (it tanks iOS Safari). Use near-opaque fills (`bg-base-100/95`) and `radial-gradient` instead of blur blobs.
- **Don't** let a second green compete with Forest Signal, nest cards, or drop a shadow heavier than `--shadow-sm` at rest.
