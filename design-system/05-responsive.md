# Responsive Design

Mobile-first responsive patterns.

## Breakpoints

```typescript
sm: 640px   md: 768px   lg: 1024px   xl: 1280px   2xl: 1536px
```

## Mobile-First Approach

```html
✅
<div class="text-sm md:text-base lg:text-lg">
  ❌
  <div class="text-lg md:text-base sm:text-sm">
    ✅
    <div class="w-full md:w-1/2 lg:w-1/3"></div>
  </div>
</div>
```

## Page Container Standard

MainLayout provides base padding: `p-4 lg:p-6` (16px mobile, 24px desktop).

**Do NOT add extra horizontal padding on mobile** - use only MainLayout's padding.

### Full-Width Pages (dashboard, transactions, budget)

```html
<div class="max-w-7xl mx-auto sm:px-2 lg:px-6 space-y-6 sm:space-y-8">
  <!-- Page content -->
</div>
```

- **Mobile**: No extra padding (uses MainLayout's `p-4` = 16px)
- **sm**: `px-2` adds 8px extra (24px total)
- **lg**: `px-6` adds 24px extra (48px total)
- **Vertical**: `space-y-6` mobile, `space-y-8` on sm+

### Narrower Pages (forms, settings)

```html
<div class="space-y-6">
  <div class="max-w-2xl">
    <!-- Narrower content like forms -->
  </div>
</div>
```

No extra padding needed - container is already narrow.

### Simple Pages

```html
<div class="space-y-6">
  <!-- Content using MainLayout's padding -->
</div>
```

## Common Patterns

### Grid Layout

```html
<!-- 1 col mobile, 2 tablet, 3 desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"></div>
```

### Typography

```html
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">Page Title</h1>
<p class="text-sm md:text-base">Body text</p>
```

### Spacing

```html
<Card className="p-4 md:p-6 lg:p-8">
  <section class="py-8 md:py-12 lg:py-16">
    <div class="space-y-4 md:space-y-6 lg:space-y-8"></div></section
></Card>
```

### Show/Hide

```html
<div class="hidden md:block">Desktop only</div>
<div class="md:hidden">Mobile only</div>
```

### Navigation

```html
<!-- Mobile: hamburger, Desktop: horizontal -->
<nav>
  <div class="hidden lg:flex gap-6">Desktop nav</div>
  <button class="lg:hidden">Menu</button>
</nav>
```

### Tables

```html
<!-- Desktop: table -->
<div class="hidden md:block">
  <table class="table w-full"></table>
</div>

<!-- Mobile: cards -->
<div class="md:hidden space-y-3">
  <Card compact>...</Card>
</div>
```

### Forms

```html
<!-- Full width mobile, half desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <input id="first-name" />
  <input id="last-name" />
</div>

<!-- Full width buttons mobile, auto desktop -->
<button className="w-full sm:w-auto">Submit</button>
```

## Touch Targets

Minimum **44x44px** on mobile.

```html
<button class="btn min-h-[44px]">
  <button class="btn-square w-11 h-11"></button>
</button>
```

## Testing Checklist

- [ ] Test at all breakpoints (< 640, 640, 768, 1024, 1280, 1536+)
- [ ] Test mobile portrait and landscape
- [ ] Touch targets ≥44px
- [ ] No horizontal overflow
- [ ] Text readable without zooming
