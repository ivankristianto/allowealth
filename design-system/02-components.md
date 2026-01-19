# Components

Component patterns, best practices, and implementation guidelines for building consistent UI components.

## Component Philosophy

### Atomic Design Methodology

This project follows **Atomic Design** principles:

```
Atoms → Molecules → Organisms → Layouts → Pages
```

- **Atoms**: Basic building blocks (Button, Input, Badge, Icon)
- **Molecules**: Simple combinations (Modal, Toast, Form groups)
- **Organisms**: Complex compositions (TransactionList, SummaryCards)
- **Layouts**: Page structure (Header, Footer, Navigation, PageContainer)
- **Pages**: Complete views (Dashboard, Transactions, Budget)

### Component Structure

Every Astro component should follow this structure:

```astro
---
/**
 * Component Name
 *
 * Clear, concise description of what this component does and when to use it.
 *
 * @param {string} variant - Description of this prop
 * @param {boolean} disabled - Description of this prop
 * @param {string} className - Additional CSS classes
 */

import DependencyComponent from './DependencyComponent.astro';
import { colors, spacing } from '@/lib/tokens';

export interface Props {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
  // ... other props
}

const { variant = 'primary', disabled = false, className = '' } = Astro.props;

// Build classes using array + filter + join pattern
const componentClasses = [
  'base-classes',
  variant === 'primary' && 'primary-classes',
  variant === 'secondary' && 'secondary-classes',
  disabled && 'disabled-classes',
  className,
]
  .filter(Boolean)
  .join(' ');

// Component logic here
---

<!-- Component markup -->
<element class={componentClasses} aria-disabled={disabled}>
  <slot />
</element>

<!-- Client-side scripts (if needed) -->
<script>
  // Client-side JavaScript (avoid when possible)
</script>
```

### Component Checklist

Before creating a component:

- [ ] Check if a similar component already exists
- [ ] Can existing components be composed instead?
- [ ] Is this pattern reused 3+ times?
- [ ] Does it have distinct behavior or state?
- [ ] Will it improve maintainability?

If "yes" to 3+ questions, create a new component. Otherwise, use inline markup or compose existing components.

## Core Components

### Button

**Location:** `src/components/atoms/Button.astro`

**Purpose:** Primary interaction element for actions and navigation.

#### Props

```typescript
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string; // If provided, renders as <a> tag
  className?: string;
  id?: string;
}
```

#### Variants

| Variant     | Use Case                      | Example                    |
| ----------- | ----------------------------- | -------------------------- |
| `primary`   | Primary CTAs, main actions    | "Save", "Submit", "Create" |
| `secondary` | Secondary actions             | "Cancel", "Back"           |
| `outline`   | Tertiary actions, toggles     | "Filter", "Options"        |
| `ghost`     | Minimal actions, icon buttons | Close, Expand, Menu        |
| `danger`    | Destructive actions           | "Delete", "Remove"         |
| `warning`   | Caution actions               | "Proceed anyway"           |
| `success`   | Confirmation actions          | "Confirm", "Approve"       |

#### Usage Examples

```astro
<!-- Primary action -->
<Button variant="primary" type="submit"> Save Transaction </Button>

<!-- Secondary action -->
<Button variant="secondary" href="/transactions"> Cancel </Button>

<!-- Destructive action -->
<Button variant="danger" onclick="confirmDelete()"> Delete Account </Button>

<!-- Loading state -->
<Button variant="primary" loading={isSubmitting}> Submitting... </Button>

<!-- Small size -->
<Button variant="outline" size="sm"> Filter </Button>
```

#### Accessibility

- Uses semantic `<button>` or `<a>` tag
- Includes `aria-disabled` when disabled
- Includes `aria-busy` when loading
- Keyboard accessible (Tab, Enter, Space)
- Focus visible styles applied automatically

### Card

**Location:** `src/components/atoms/Card.astro`

**Purpose:** Container for grouping related content.

#### Props

```typescript
interface Props {
  bordered?: boolean; // Show border (default: true)
  compact?: boolean; // Use compact padding (default: false)
  hoverable?: boolean; // Add hover effect (default: false)
  className?: string;
  role?: string; // ARIA role
  'aria-labelledby'?: string;
}
```

#### Usage Examples

```astro
<!-- Standard card -->
<Card>
  <h3 class="text-lg font-semibold mb-2">Recent Transactions</h3>
  <TransactionList transactions={recentTransactions} />
</Card>

<!-- Compact card -->
<Card compact>
  <p class="text-sm">Summary information</p>
</Card>

<!-- Hoverable card (interactive) -->
<Card hoverable>
  <a href="/transaction/123">
    <h4>Transaction #123</h4>
    <p>Click for details</p>
  </a>
</Card>

<!-- Card with accessibility -->
<Card role="region" aria-labelledby="budget-heading">
  <h2 id="budget-heading">Monthly Budget</h2>
  <!-- content -->
</Card>
```

#### Spacing

- Default padding: `24px` (--spacing-card)
- Compact padding: `16px` (--spacing-4)
- Margin between cards: `24px` (--spacing-6)

### Input

**Location:** `src/components/atoms/Input.astro`

**Purpose:** Form input for text, numbers, dates, and selects.

#### Props

```typescript
interface Props {
  type?: 'text' | 'number' | 'email' | 'date' | 'password';
  placeholder?: string;
  value?: string | number;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  className?: string;
  id?: string;
  name?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  required?: boolean;
  pattern?: string;
  title?: string;
}
```

#### Usage Examples

```astro
import Label from '@/components/atoms/Label.astro'; import Input from
'@/components/atoms/Input.astro';

<!-- Text input with label -->
<div class="form-control">
  <Label htmlFor="name" required>Full Name</Label>
  <Input id="name" name="name" type="text" placeholder="Enter your name" required />
</div>

<!-- Number input with validation -->
<div class="form-control">
  <Label htmlFor="amount" required>Amount</Label>
  <Input
    id="amount"
    name="amount"
    type="number"
    min={0}
    step={0.01}
    error={!!errors.amount}
    errorMessage={errors.amount}
    required
  />
</div>

<!-- Date input -->
<div class="form-control">
  <Label htmlFor="date" required>Transaction Date</Label>
  <Input id="date" name="date" type="date" max={new Date().toISOString().split('T')[0]} required />
</div>
```

#### Error States

```astro
<!-- Input with error -->
<Input id="email" name="email" type="email" error={true} errorMessage="Invalid email format" />
<!-- Renders with error styling and message below -->
```

### Badge

**Location:** `src/components/atoms/Badge.astro`

**Purpose:** Small status indicators and labels.

#### Props

```typescript
interface Props {
  variant?: 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  outline?: boolean;
  className?: string;
}
```

#### Usage Examples

```astro
<!-- Status badges -->
<Badge variant="success">Paid</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>

<!-- Outlined badges -->
<Badge variant="primary" outline>New</Badge>
<Badge variant="info" outline>Updated</Badge>

<!-- Sizes -->
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>

<!-- In a list -->
{categories.map((cat) => <Badge variant="primary">{cat.name}</Badge>)}
```

### Modal

**Location:** `src/components/molecules/Modal.astro`

**Purpose:** Dialog for focused user interactions.

#### Props

```typescript
interface Props {
  id: string; // Required for dialog functionality
  title?: string;
  open?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean; // Show close button (default: true)
  backdropClose?: boolean; // Close on backdrop click (default: true)
  className?: string;
}
```

#### Usage Examples

```astro
<!-- Basic modal -->
<Modal id="confirm-delete" title="Confirm Deletion">
  <p>Are you sure you want to delete this transaction?</p>

  <div slot="actions" class="flex gap-2 justify-end mt-4">
    <Button variant="secondary" onclick="closeModal()">Cancel</Button>
    <Button variant="danger" onclick="confirmDelete()">Delete</Button>
  </div>
</Modal>

<!-- Form modal -->
<Modal id="add-transaction" title="Add Transaction" size="lg">
  <TransactionForm
    action="/api/transactions"
    method="POST"
    categories={categories}
    paymentMethods={paymentMethods}
  />
</Modal>

<!-- Open modal programmatically -->
<script>
  function openModal(id) {
    const modal = document.getElementById(id);
    modal?.showModal();
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    modal?.close();
  }
</script>
```

#### Accessibility

- Uses native `<dialog>` element
- Traps focus within modal
- Closes on ESC key
- Closes on backdrop click (if enabled)
- Has proper ARIA attributes

### Toast

**Location:** `src/components/molecules/Toast.astro`

**Purpose:** Temporary notification messages.

#### Usage

```astro
import ToastContainer from '@/components/molecules/ToastContainer.astro';

<!-- Add to layout -->
<ToastContainer />

<!-- Trigger from JavaScript -->
<script>
  function showToast(message, type = 'success') {
    // Implementation in ToastContainer component
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message, type },
      })
    );
  }

  // Usage
  showToast('Transaction saved successfully!', 'success');
  showToast('Failed to save transaction', 'error');
  showToast('Budget limit approaching', 'warning');
</script>
```

## Component Patterns

### Conditional Classes

Use array + filter + join pattern for conditional classes:

```typescript
const classes = [
  'base-class',
  condition && 'conditional-class',
  anotherCondition ? 'true-class' : 'false-class',
  customClass,
]
  .filter(Boolean)
  .join(' ');
```

**Example:**

```typescript
const buttonClasses = [
  'btn',
  variant === 'primary' && 'btn-primary',
  variant === 'secondary' && 'btn-secondary',
  disabled && 'opacity-50 cursor-not-allowed',
  loading && 'loading',
  className,
]
  .filter(Boolean)
  .join(' ');
```

### Variant Patterns

Use Record types for variant mappings:

```typescript
const variantClasses: Record<string, string> = {
  primary: 'btn-primary text-white',
  secondary: 'bg-neutral-200 text-neutral-800',
  outline: 'btn-outline border-2',
};

const componentClasses = [
  'base-class',
  variantClasses[variant] || variantClasses.primary,
  className,
]
  .filter(Boolean)
  .join(' ');
```

### Size Patterns

```typescript
const sizeClasses: Record<string, string> = {
  sm: 'btn-sm px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'btn-lg px-6 py-3 text-lg',
};

const classes = ['base-class', sizeClasses[size] || sizeClasses.md].filter(Boolean).join(' ');
```

### Prop Defaults

Always provide sensible defaults:

```typescript
const {
  variant = 'primary', // Most common variant
  size = 'md', // Medium size
  disabled = false, // Enabled by default
  className = '', // Empty string (not undefined)
} = Astro.props;
```

### Slot Usage

Use slots for flexible content:

```astro
<!-- Default slot -->
<Card>
  <slot />
</Card>

<!-- Named slots -->
<Modal>
  <div slot="header">
    <h3>Modal Title</h3>
  </div>

  <slot />
  <!-- Default content -->

  <div slot="actions">
    <Button>Confirm</Button>
  </div>
</Modal>
```

### Composition

Prefer composition over creating new components:

```astro
<!-- ✅ GOOD: Compose existing components -->
<Card>
  <h3 class="text-lg font-semibold mb-4">Recent Transactions</h3>
  <div class="space-y-2">
    {
      transactions.map((tx) => (
        <div class="flex justify-between p-2 hover:bg-neutral-50 rounded">
          <span>{tx.description}</span>
          <Currency amount={tx.amount} currency={tx.currency} />
        </div>
      ))
    }
  </div>
</Card>

<!-- ❌ BAD: Creating unnecessary wrapper component -->
<TransactionListCard transactions={transactions} />
```

## DaisyUI Integration

### Use DaisyUI Classes First

DaisyUI provides pre-styled components. Use them before custom CSS:

```html
<!-- Buttons -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-ghost">Ghost</button>

<!-- Inputs -->
<input class="input input-bordered w-full" />
<input class="input input-bordered input-error" />

<!-- Cards -->
<div class="card card-bordered bg-base-100">
  <div class="card-body">
    <h2 class="card-title">Card Title</h2>
    <p>Card content</p>
  </div>
</div>

<!-- Badges -->
<span class="badge badge-primary">Badge</span>

<!-- Alerts -->
<div class="alert alert-success">
  <span>Success message</span>
</div>
```

### DaisyUI Semantic Colors

DaisyUI provides semantic color classes that adapt to themes:

```html
<!-- Backgrounds -->
<div class="bg-base-100">Primary background</div>
<div class="bg-base-200">Secondary background</div>
<div class="bg-base-300">Tertiary background</div>

<!-- Text -->
<p class="text-base-content">Primary text</p>
<p class="text-primary">Primary brand color</p>
<p class="text-secondary">Secondary brand color</p>
<p class="text-accent">Accent color</p>

<!-- Borders -->
<div class="border border-base-300">Subtle border</div>
```

### Override DaisyUI When Needed

You can override DaisyUI classes with custom Tailwind classes:

```html
<!-- Override button size -->
<button class="btn btn-primary px-8 py-4">Larger button</button>

<!-- Override card padding -->
<div class="card card-bordered p-8">Custom padding</div>
```

## Component Anti-Patterns

### ❌ Don't Hardcode Values

```astro
<!-- BAD -->
<div style="color: #10b981; padding: 24px;">
  <!-- GOOD -->
  <div class="text-primary p-6"></div>
</div>
```

### ❌ Don't Over-Engineer

```astro
<!-- BAD: Unnecessary abstraction -->
<TextWithColorAndSize text="Hello" color="primary" size="lg" />

<!-- GOOD: Use semantic HTML -->
<h3 class="text-lg text-primary">Hello</h3>
```

### ❌ Don't Mix Paradigms

```astro
<!-- BAD: Mixing inline styles with classes -->
<button class="btn btn-primary" style="padding: 10px;">
  <!-- GOOD: Use classes only -->
  <button class="btn btn-primary px-4"></button></button
>
```

### ❌ Don't Ignore Accessibility

```astro
<!-- BAD: No label, no ARIA -->
<input type="text" placeholder="Name" />

<!-- GOOD: Proper label -->
<Label htmlFor="name">Name</Label>
<Input id="name" name="name" type="text" />
```

### ❌ Don't Create Single-Use Components

```astro
<!-- BAD: Component used once -->
<WelcomeMessage userName={user.name} />

<!-- GOOD: Inline markup -->
<div class="alert alert-info">
  <span>Welcome, {user.name}!</span>
</div>
```

## Testing Components

### Visual Testing

1. Test all variants (`primary`, `secondary`, `outline`, etc.)
2. Test all sizes (`sm`, `md`, `lg`)
3. Test states (`disabled`, `loading`, `error`)
4. Test with different content lengths
5. Test responsive behavior

### Accessibility Testing

1. **Keyboard navigation**: Tab, Enter, Space, Esc
2. **Screen reader**: Proper labels and ARIA attributes
3. **Focus visible**: Clear focus indicators
4. **Color contrast**: ≥4.5:1 for text
5. **Semantic HTML**: Correct element usage

### Manual Testing Checklist

- [ ] Component renders correctly
- [ ] All variants work as expected
- [ ] All sizes work as expected
- [ ] Props are typed correctly
- [ ] Default props are sensible
- [ ] Slots work correctly
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] Responsive across breakpoints
- [ ] No console errors
- [ ] No TypeScript errors

## Storybook Integration

### Creating Stories

All atomic components should have Storybook stories:

```typescript
// Button.stories.ts
import type { Meta, StoryObj } from '@storybook/html';

export default {
  title: 'Atoms/Button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
} satisfies Meta;

export const Primary: StoryObj = {
  args: {
    variant: 'primary',
    label: 'Primary Button',
  },
  render: (args) => {
    const button = document.createElement('button');
    button.className = `btn btn-${args.variant} btn-${args.size}`;
    button.textContent = args.label;
    button.disabled = args.disabled;
    if (args.loading) {
      button.innerHTML = '<span class="loading loading-spinner"></span> Loading';
    }
    return button;
  },
};

export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex gap-4';
    ['primary', 'secondary', 'outline', 'ghost', 'danger'].forEach((variant) => {
      const button = document.createElement('button');
      button.className = `btn btn-${variant}`;
      button.textContent = variant;
      container.appendChild(button);
    });
    return container;
  },
};
```

## Summary

### Component Development Checklist

- [ ] Check if component already exists
- [ ] Consider composition before creating new component
- [ ] Define TypeScript Props interface
- [ ] Provide sensible prop defaults
- [ ] Use design tokens (import from `@/lib/tokens`)
- [ ] Use DaisyUI classes when available
- [ ] Follow conditional classes pattern
- [ ] Implement all accessibility requirements
- [ ] Add ARIA attributes where needed
- [ ] Test keyboard navigation
- [ ] Test across responsive breakpoints
- [ ] Create Storybook story (for atoms)
- [ ] Document usage in component comments

### Next Steps

- **03-forms.md** - Form controls and validation patterns
- **04-accessibility.md** - Comprehensive accessibility guidelines
- **05-responsive.md** - Responsive design patterns
- **06-data-visualization.md** - Charts and financial data displays
