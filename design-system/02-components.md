# Components

Component patterns for atoms, molecules, and organisms.

## Structure Template

```astro
---
/**
 * ComponentName - Brief description
 * @param {string} variant - primary | secondary
 */
export interface Props {
  variant?: 'primary' | 'secondary';
  className?: string;
}

const { variant = 'primary', className = '' } = Astro.props;

const classes = ['base-classes', variant === 'primary' && 'primary-classes', className]
  .filter(Boolean)
  .join(' ');
---

<element class={classes}><slot /></element>
```

## Core Components

### Button (`src/components/atoms/Button.astro`)

```astro
<Button variant="primary" type="submit">Save</Button>
<Button variant="outline" size="sm">Filter</Button>
<Button variant="danger" onclick="confirmDelete()">Delete</Button>
<Button loading={isSubmitting}>Submitting...</Button>
```

**Variants:** `primary` | `secondary` | `outline` | `ghost` | `danger` | `warning` | `success`
**Sizes:** `sm` | `md` | `lg`

### Card (`src/components/atoms/Card.astro`)

```astro
<Card>Content</Card>
<Card compact>Compact padding</Card>
<Card hoverable>Interactive card</Card>
```

### Input (`src/components/atoms/Input.astro`)

```astro
<Input id="name" name="name" type="text" required />
<Input id="amount" type="number" min={0} step={0.01} />
<Input id="email" type="email" error={!!errors.email} errorMessage={errors.email} />
```

### Modal (`src/components/molecules/Modal.astro`)

```astro
<Modal id="confirm-delete" title="Confirm">
  <p>Are you sure?</p>
  <div slot="actions">
    <Button variant="danger">Delete</Button>
  </div>
</Modal>

<script>
  document.getElementById('modal-id')?.showModal();
  document.getElementById('modal-id')?.close();
</script>
```

**Sizes:** `sm` | `md` | `lg` | `xl`

### Badge (`src/components/atoms/Badge.astro`)

```astro
<Badge variant="success">Paid</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="primary" outline>New</Badge>
```

## Patterns

### Conditional Classes

```typescript
const classes = [
  'base',
  variant === 'primary' && 'btn-primary',
  disabled && 'opacity-50',
  className,
]
  .filter(Boolean)
  .join(' ');
```

### Variant Mapping

```typescript
const variantClasses: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'bg-neutral-200',
};

const classes = ['base', variantClasses[variant] || variantClasses.primary]
  .filter(Boolean)
  .join(' ');
```

### Prop Defaults

```typescript
const { variant = 'primary', size = 'md', disabled = false, className = '' } = Astro.props;
```

## DaisyUI Classes

```html
<button class="btn btn-primary">
  <input class="input input-bordered" />
  <div class="card card-bordered bg-base-100">
    <span class="badge badge-primary">
      <div class="alert alert-warning">
        <dialog class="modal"></dialog></div
    ></span>
  </div>
</button>
```

## Component Checklist

- [ ] Check existing components first
- [ ] Use design tokens (import from `@/lib/tokens`)
- [ ] TypeScript Props interface
- [ ] Sensible prop defaults
- [ ] DaisyUI classes when available
- [ ] ARIA attributes where needed
- [ ] Keyboard accessible
- [ ] Responsive

## Anti-Patterns

❌ Hardcoded: `style="color: #10b981"`
✅ Token: `class="text-primary"`

❌ Over-engineered: `<TextWithColorAndSize text="Hello" color="primary" />`
✅ Simple: `<h3 class="text-lg text-primary">Hello</h3>`

❌ No accessibility: `<input placeholder="Name" />`
✅ With label: `<Label htmlFor="name">Name</Label><Input id="name" />`
