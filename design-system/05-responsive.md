# Responsive Design

Mobile-first responsive design patterns for building adaptive layouts that work across all device sizes.

## Breakpoint System

### Breakpoint Values

```typescript
import { breakpoints } from '@/lib/tokens';

breakpoints.sm; // 640px  - Mobile landscape, small tablets
breakpoints.md; // 768px  - Tablet portrait
breakpoints.lg; // 1024px - Tablet landscape, small desktop
breakpoints.xl; // 1280px - Desktop
breakpoints['2xl']; // 1536px - Large desktop
```

### Device Targeting

| Breakpoint    | Device           | Typical Width   | Common Use                     |
| ------------- | ---------------- | --------------- | ------------------------------ |
| `< 640px`     | Mobile portrait  | 375px - 414px   | Phone screens                  |
| `sm: 640px`   | Mobile landscape | 640px - 767px   | Phone landscape, small tablets |
| `md: 768px`   | Tablet portrait  | 768px - 1023px  | iPad portrait                  |
| `lg: 1024px`  | Tablet landscape | 1024px - 1279px | iPad landscape, laptops        |
| `xl: 1280px`  | Desktop          | 1280px - 1535px | Desktop monitors               |
| `2xl: 1536px` | Large desktop    | 1536px+         | Large monitors, wide screens   |

## Mobile-First Approach

### Why Mobile-First?

1. **Performance**: Start with essential content, progressively enhance
2. **Simplicity**: Easier to add complexity than remove it
3. **Focus**: Forces prioritization of important content
4. **Modern**: Most traffic is mobile

### Mobile-First Pattern

```css
/* ✅ CORRECT: Mobile-first */
.element {
  /* Base styles for mobile (< 640px) */
  width: 100%;
  padding: 1rem;
}

@media (min-width: 768px) {
  /* Tablet and up */
  .element {
    width: 50%;
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  /* Desktop and up */
  .element {
    width: 33.333%;
    padding: 3rem;
  }
}
```

```html
<!-- ✅ CORRECT: Mobile-first with Tailwind -->
<div class="w-full md:w-1/2 lg:w-1/3 p-4 md:p-6 lg:p-8">Content</div>
```

```css
/* ❌ WRONG: Desktop-first */
.element {
  /* Desktop styles */
  width: 33.333%;
  padding: 3rem;
}

@media (max-width: 1024px) {
  .element {
    width: 50%;
    padding: 2rem;
  }
}

@media (max-width: 768px) {
  .element {
    width: 100%;
    padding: 1rem;
  }
}
```

## Responsive Layouts

### Grid Layouts

```html
<!-- 1 column on mobile, 2 on tablet, 3 on desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  <Card>Card 1</Card>
  <Card>Card 2</Card>
  <Card>Card 3</Card>
  <Card>Card 4</Card>
  <Card>Card 5</Card>
  <Card>Card 6</Card>
</div>

<!-- 1 column on mobile, 2 on tablet, 4 on desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
  <!-- Summary cards -->
</div>

<!-- Responsive gap spacing -->
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
  <!-- Gallery items -->
</div>
```

### Flexbox Layouts

```html
<!-- Stack on mobile, row on tablet+ -->
<div class="flex flex-col md:flex-row gap-4">
  <div class="flex-1">Content 1</div>
  <div class="flex-1">Content 2</div>
</div>

<!-- Center content on mobile, left-align on desktop -->
<div class="flex flex-col items-center lg:items-start">
  <h2>Heading</h2>
  <p>Description</p>
</div>

<!-- Responsive button group -->
<div class="flex flex-col sm:flex-row gap-2">
  <button variant="primary" className="w-full sm:w-auto">Primary</button>
  <button variant="secondary" className="w-full sm:w-auto">Secondary</button>
</div>
```

### Container Widths

```html
<!-- Full width container with max-width -->
<div class="container mx-auto px-4 md:px-6 lg:px-8">
  <!-- Content constrained to max-width -->
</div>

<!-- Custom max-widths -->
<div class="max-w-7xl mx-auto px-4">
  <!-- Extra large content -->
</div>

<div class="max-w-3xl mx-auto px-4">
  <!-- Reading-optimized width (articles) -->
</div>

<div class="max-w-md mx-auto px-4">
  <!-- Narrow content (forms) -->
</div>
```

## Responsive Typography

### Font Sizes

```html
<!-- Heading sizes -->
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">Page Title</h1>

<h2 class="text-xl md:text-2xl lg:text-3xl font-semibold">Section Heading</h2>

<h3 class="text-lg md:text-xl font-semibold">Subsection Heading</h3>

<!-- Body text -->
<p class="text-sm md:text-base">Body text that's slightly smaller on mobile</p>

<!-- Hero text -->
<h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">Hero Heading</h1>
```

### Line Heights

```html
<!-- Tighter line height on mobile -->
<h1 class="leading-tight md:leading-snug">Long Heading That Wraps</h1>

<!-- Responsive body text -->
<p class="leading-normal md:leading-relaxed">
  Paragraph text with comfortable reading on larger screens
</p>
```

## Responsive Spacing

### Padding

```html
<!-- Card padding -->
<Card className="p-4 md:p-6 lg:p-8"> Content </Card>

<!-- Section padding -->
<section class="py-8 md:py-12 lg:py-16">Section content</section>

<!-- Asymmetric padding -->
<div class="px-4 md:px-8 lg:px-12 py-6 md:py-8">Content</div>
```

### Margin

```html
<!-- Vertical spacing -->
<div class="space-y-4 md:space-y-6 lg:space-y-8">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Section margins -->
<section class="mt-8 md:mt-12 lg:mt-16 mb-12 md:mb-16 lg:mb-20">Section content</section>
```

### Gap

```html
<!-- Grid gap -->
<div class="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6">Grid items</div>

<!-- Flex gap -->
<div class="flex flex-wrap gap-2 md:gap-4">Flex items</div>
```

## Responsive Components

### Navigation

```html
<!-- Mobile: Hamburger menu, Desktop: Horizontal nav -->
<nav class="flex items-center justify-between p-4">
  <div class="text-xl font-bold">Logo</div>

  <!-- Desktop navigation -->
  <div class="hidden lg:flex gap-6">
    <a href="/">Dashboard</a>
    <a href="/transactions">Transactions</a>
    <a href="/budget">Budget</a>
  </div>

  <!-- Mobile menu button -->
  <button class="lg:hidden" aria-label="Menu">
    <Icon name="menu" />
  </button>
</nav>
```

### Sidebar Layout

```html
<!-- Mobile: Stack, Desktop: Sidebar -->
<div class="flex flex-col lg:flex-row gap-6">
  <!-- Sidebar -->
  <aside class="w-full lg:w-64 flex-shrink-0">Sidebar content</aside>

  <!-- Main content -->
  <main class="flex-1">Main content</main>
</div>
```

### Cards

```html
<!-- Responsive card layout -->
<Card className="w-full">
  <!-- Mobile: Stack -->
  <!-- Desktop: Row -->
  <div class="flex flex-col md:flex-row gap-4">
    <div class="md:w-1/3">Image or icon</div>
    <div class="md:w-2/3">
      <h3 class="text-lg md:text-xl font-semibold">Title</h3>
      <p class="text-sm md:text-base">Description</p>
    </div>
  </div>
</Card>
```

### Tables

```html
<!-- Desktop: Table, Mobile: Card stack -->
<div class="hidden md:block">
  <!-- Desktop table view -->
  <table class="w-full">
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Amount</th>
        <th>Category</th>
      </tr>
    </thead>
    <tbody>
      <!-- Table rows -->
    </tbody>
  </table>
</div>

<div class="md:hidden space-y-4">
  <!-- Mobile card view -->
  {transactions.map((tx) => (
  <Card compact>
    <div class="flex justify-between mb-2">
      <span class="font-semibold">{tx.description}</span>
      <Currency amount="{tx.amount}" currency="{tx.currency}" />
    </div>
    <div class="text-sm text-neutral-500">{tx.date} • {tx.category}</div>
  </Card>
  ))}
</div>
```

### Forms

```html
<!-- Responsive form layout -->
<form class="space-y-4">
  <!-- Full width on mobile, half on desktop -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="form-control">
      <label htmlFor="first-name">First Name</label>
      <input id="first-name" name="first_name" />
    </div>

    <div class="form-control">
      <label htmlFor="last-name">Last Name</label>
      <input id="last-name" name="last_name" />
    </div>
  </div>

  <!-- Full width field -->
  <div class="form-control">
    <label htmlFor="email">Email</label>
    <input id="email" name="email" type="email" />
  </div>

  <!-- Responsive button group -->
  <div class="flex flex-col sm:flex-row gap-2 justify-end">
    <button variant="secondary" className="w-full sm:w-auto">Cancel</button>
    <button variant="primary" type="submit" className="w-full sm:w-auto">Save</button>
  </div>
</form>
```

## Responsive Utilities

### Show/Hide

```html
<!-- Hide on mobile, show on tablet+ -->
<div class="hidden md:block">Desktop content</div>

<!-- Show on mobile, hide on tablet+ -->
<div class="md:hidden">Mobile content</div>

<!-- Show only on specific breakpoints -->
<div class="hidden lg:block xl:hidden">Only visible on lg screens</div>
```

### Text Alignment

```html
<!-- Center on mobile, left on desktop -->
<div class="text-center md:text-left">Content</div>

<!-- Right align on desktop -->
<div class="text-left lg:text-right">Content</div>
```

### Overflow and Scrolling

```html
<!-- Horizontal scroll on mobile, wrap on desktop -->
<div class="overflow-x-auto md:overflow-visible">
  <div class="flex md:flex-wrap gap-4 min-w-max md:min-w-0">
    <!-- Items -->
  </div>
</div>
```

## Images and Media

### Responsive Images

```html
<!-- Full width on mobile, constrained on desktop -->
<img src="/image.jpg" alt="Description" class="w-full md:w-auto md:max-w-md" />

<!-- Aspect ratio preserved -->
<div class="aspect-video w-full">
  <img src="/image.jpg" alt="Description" class="w-full h-full object-cover" />
</div>

<!-- Responsive image sizes -->
<img
  src="/image.jpg"
  srcset="/image-small.jpg 640w, /image-medium.jpg 1024w, /image-large.jpg 1920w"
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  alt="Description"
/>
```

### Video

```html
<!-- Responsive video container -->
<div class="aspect-video w-full">
  <video class="w-full h-full" controls>
    <source src="/video.mp4" type="video/mp4" />
  </video>
</div>
```

## Touch Targets

### Minimum Touch Target Size

**WCAG Guideline**: Interactive elements should be at least **44x44 pixels** on touch devices.

```css
/* Minimum touch target */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

```html
<!-- Buttons with adequate touch targets -->
<button class="btn btn-primary min-h-[44px]">Submit</button>

<!-- Icon buttons -->
<button class="btn btn-square btn-ghost w-11 h-11" aria-label="Close">
  <Icon name="x" />
</button>

<!-- Links with adequate spacing -->
<nav class="flex flex-col gap-2">
  <a href="/" class="py-2 px-4">Dashboard</a>
  <a href="/transactions" class="py-2 px-4">Transactions</a>
</nav>
```

## Performance

### Lazy Loading

```html
<!-- Lazy load images below the fold -->
<img src="/image.jpg" loading="lazy" alt="Description" />

<!-- Eager load above-the-fold images -->
<img src="/hero.jpg" loading="eager" alt="Hero image" />
```

### Responsive Images

```html
<!-- Serve different images based on screen size -->
<picture>
  <source media="(min-width: 1024px)" srcset="/image-large.jpg" />
  <source media="(min-width: 640px)" srcset="/image-medium.jpg" />
  <img src="/image-small.jpg" alt="Description" />
</picture>
```

## Testing Responsive Design

### Browser DevTools

**Chrome DevTools:**

1. Open DevTools (F12)
2. Click device toolbar (Ctrl+Shift+M)
3. Select device or set custom dimensions
4. Test at all breakpoints

**Common Test Sizes:**

- Mobile: 375x667 (iPhone SE), 414x896 (iPhone 11)
- Tablet: 768x1024 (iPad), 1024x768 (iPad landscape)
- Desktop: 1280x720, 1920x1080

### Responsive Testing Checklist

- [ ] Test at all breakpoints (< 640, 640, 768, 1024, 1280, 1536+)
- [ ] Test mobile portrait and landscape
- [ ] Test tablet portrait and landscape
- [ ] Test on actual devices (not just emulation)
- [ ] Test touch interactions on mobile
- [ ] Verify text is readable without zooming
- [ ] Verify buttons have adequate touch targets (≥44px)
- [ ] Verify horizontal scrolling is intentional (not a bug)
- [ ] Verify images load appropriately for screen size
- [ ] Test with slow network (throttling)

### Common Responsive Issues

#### Issue: Horizontal Overflow

```html
<!-- ❌ BAD: Fixed width causes overflow -->
<div style="width: 1200px;">Content</div>

<!-- ✅ GOOD: Responsive width -->
<div class="max-w-7xl mx-auto px-4">Content</div>
```

#### Issue: Text Too Small

```html
<!-- ❌ BAD: Text too small on mobile -->
<p class="text-xs">Important information</p>

<!-- ✅ GOOD: Readable on all devices -->
<p class="text-sm md:text-base">Important information</p>
```

#### Issue: Touch Targets Too Small

```html
<!-- ❌ BAD: Icon button too small -->
<button class="w-6 h-6">
  <Icon name="close" />
</button>

<!-- ✅ GOOD: Adequate touch target -->
<button class="w-11 h-11 flex items-center justify-center">
  <Icon name="close" />
</button>
```

## Responsive Patterns

### Dashboard Layout

```html
<!-- 1 column mobile, 2 columns tablet, 3 columns desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
  <!-- Summary cards -->
  <Card>Total Income</Card>
  <Card>Total Expenses</Card>
  <Card>Net Balance</Card>
  <Card>Budget Status</Card>
  <Card>Recent Transactions</Card>
  <Card>Upcoming Bills</Card>
</div>
```

### Transaction List

```html
<!-- Desktop: Table, Mobile: Cards -->
<div class="hidden md:block">
  <table class="w-full">
    <!-- Table view -->
  </table>
</div>

<div class="md:hidden space-y-3">
  {transactions.map((tx) => (
  <Card compact>
    <!-- Card view -->
  </Card>
  ))}
</div>
```

### Modal Sizing

```html
<!-- Full screen on mobile, centered on desktop -->
<Modal id="transaction-modal" className="w-full h-full md:w-auto md:h-auto md:max-w-2xl">
  <!-- Modal content -->
</Modal>
```

## Summary

### Responsive Design Checklist

- [ ] Use mobile-first approach (base styles for mobile, enhance for desktop)
- [ ] Test at all breakpoints (< 640, 640, 768, 1024, 1280, 1536+)
- [ ] Use responsive typography (text-sm md:text-base lg:text-lg)
- [ ] Use responsive spacing (p-4 md:p-6 lg:p-8)
- [ ] Provide adequate touch targets (≥44px) on mobile
- [ ] Show/hide content appropriately (hidden md:block)
- [ ] Use responsive grid layouts (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- [ ] Optimize images for different screen sizes
- [ ] Test on actual devices, not just emulation
- [ ] Verify no horizontal overflow
- [ ] Ensure text is readable without zooming

### Next Steps

- **06-data-visualization.md** - Charts and financial data displays
- **07-patterns.md** - Common UI patterns and compositions
