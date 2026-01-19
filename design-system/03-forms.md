# Forms

Comprehensive guidelines for form design, validation, and user experience in the Personal Finance Manager application.

## Form Philosophy

Forms are critical for data entry in a financial application. They must be:

- **Clear**: Users understand what's expected
- **Forgiving**: Helpful validation and error messages
- **Efficient**: Minimal friction, smart defaults
- **Accessible**: Keyboard navigable, screen reader friendly
- **Secure**: Proper validation, XSS prevention

## Form Structure

### Basic Form Layout

```astro
<form id="form-id" class="space-y-4" novalidate>
  <!-- Global error message -->
  <div id="form-error" class="hidden alert alert-error" role="alert"></div>

  <!-- Form field -->
  <div class="form-control">
    <Label htmlFor="field-id" required>Field Label</Label>
    <Input
      id="field-id"
      name="field_name"
      type="text"
      required
      error={!!errors.field_name}
      errorMessage={errors.field_name}
    />
  </div>

  <!-- Actions -->
  <div class="card-actions justify-end gap-2 mt-6">
    <a href="/cancel-url" class="btn btn-ghost">Cancel</a>
    <Button type="submit" variant="primary">Submit</Button>
  </div>
</form>
```

### Form Spacing

- **Form field spacing**: `16px` (--spacing-form, `space-y-4`)
- **Label to input**: `4px` (`mb-1`)
- **Error message**: `4px` below input (`mt-1`)
- **Form actions**: `24px` above actions (`mt-6`)
- **Button gap**: `8px` (`gap-2`)

## Form Controls

### Text Input

```astro
import Input from '@/components/atoms/Input.astro'; import Label from
'@/components/atoms/Label.astro';

<div class="form-control">
  <Label htmlFor="name" required>Full Name</Label>
  <Input
    id="name"
    name="name"
    type="text"
    placeholder="Enter your full name"
    required
    error={!!errors.name}
    errorMessage={errors.name}
  />
</div>
```

### Number Input

```astro
<div class="form-control">
  <Label htmlFor="amount" required>Amount</Label>
  <Input
    id="amount"
    name="amount"
    type="number"
    min={0}
    step={0.01}
    placeholder="0.00"
    required
    error={!!errors.amount}
    errorMessage={errors.amount}
  />
</div>
```

### Currency Input

```astro
import CurrencyInput from '@/components/atoms/CurrencyInput.astro';

<div class="form-control">
  <Label htmlFor="amount" required>Amount</Label>
  <CurrencyInput
    id="amount"
    name="amount"
    value={values.amount || ''}
    currency={values.currency || 'IDR'}
    required
    error={!!errors.amount}
    errorMessage={errors.amount}
  />
</div>
```

### Date Picker

```astro
import DatePicker from '@/components/atoms/DatePicker.astro';

<div class="form-control">
  <Label htmlFor="date" required>Transaction Date</Label>
  <DatePicker
    id="date"
    name="transaction_date"
    value={values.transaction_date || today}
    max={today}
    required
    error={!!errors.transaction_date}
    errorMessage={errors.transaction_date}
  />
</div>
```

### Select Dropdown

```astro
<div class="form-control">
  <Label htmlFor="category" required>Category</Label>
  <select id="category" name="category_id" class="select select-bordered w-full" required>
    <option value="">Select a category...</option>
    {
      categories.map((cat) => (
        <option value={cat.id} selected={values.category_id === cat.id}>
          {cat.name}
        </option>
      ))
    }
  </select>
  {
    errors.category_id && (
      <span class="text-error text-sm mt-1" role="alert">
        {errors.category_id}
      </span>
    )
  }
</div>
```

### Textarea

```astro
<div class="form-control">
  <Label htmlFor="description">Description</Label>
  <textarea
    id="description"
    name="description"
    class="textarea textarea-bordered w-full"
    placeholder="Optional notes..."
    rows="3">{values.description || ''}</textarea
  >
  <span class="text-xs text-neutral-500 mt-1">Optional</span>
</div>
```

### Checkbox

```astro
import Checkbox from '@/components/atoms/Checkbox.astro';

<div class="form-control">
  <label class="label cursor-pointer justify-start gap-2">
    <Checkbox id="recurring" name="is_recurring" checked={values.is_recurring} />
    <span class="label-text">Recurring transaction</span>
  </label>
</div>
```

### Radio Buttons

```astro
<div class="form-control">
  <Label required>Transaction Type</Label>
  <div class="join w-full">
    <input
      type="radio"
      name="type"
      value="expense"
      id="type-expense"
      class="join-item btn btn-sm flex-1"
      checked={formType === 'expense'}
    />
    <label for="type-expense" class="join-item btn btn-sm flex-1"> Expense </label>

    <input
      type="radio"
      name="type"
      value="income"
      id="type-income"
      class="join-item btn btn-sm flex-1"
      checked={formType === 'income'}
    />
    <label for="type-income" class="join-item btn btn-sm flex-1"> Income </label>
  </div>
</div>
```

## Labels and Helper Text

### Label with Required Indicator

```astro
<Label htmlFor="field-id" required> Field Name </Label>
<!-- Renders with asterisk (*) -->
```

### Label with Help Text

```astro
<Label htmlFor="field-id" helpText="Additional context"> Field Name </Label>
<!-- Renders with subtle help text below -->
```

### Inline Helper Text

```astro
<div class="form-control">
  <Label htmlFor="password">Password</Label>
  <Input id="password" name="password" type="password" />
  <span class="text-xs text-neutral-500 mt-1">
    Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number
  </span>
</div>
```

## Validation

### Client-Side Validation

#### HTML5 Validation

Use native HTML5 attributes:

```html
<!-- Required fields -->
<input required />

<!-- Email validation -->
<input type="email" />

<!-- Number constraints -->
<input type="number" min="0" max="1000" step="0.01" />

<!-- Pattern matching -->
<input pattern="[0-9]{4}" title="4-digit code" />

<!-- Min/max length -->
<input minlength="8" maxlength="50" />
```

#### Custom JavaScript Validation

```astro
<script>
  function validateForm(formData) {
    const errors = {};

    // Required field
    if (!formData.name) {
      errors.name = 'Name is required';
    }

    // Email format
    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Number range
    if (formData.amount < 0) {
      errors.amount = 'Amount must be positive';
    }

    // Custom business logic
    if (formData.type === 'expense' && !formData.category_id) {
      errors.category_id = 'Category is required for expenses';
    }

    return errors;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
</script>
```

### Server-Side Validation

Always validate on the server using Zod schemas:

```typescript
// API route validation
import { z } from 'zod';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  currency: z.enum(['IDR', 'USD']),
  category_id: z.string().min(1, 'Category is required'),
  payment_method_id: z.string().min(1, 'Payment method is required'),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  description: z.string().optional(),
});

// Validate request body
const result = transactionSchema.safeParse(requestBody);
if (!result.success) {
  return {
    success: false,
    error: {
      message: 'Validation failed',
      details: result.error.issues,
    },
  };
}
```

### Error Display

#### Field-Level Errors

```astro
<Input id="email" name="email" type="email" error={!!errors.email} errorMessage={errors.email} />
<!-- Shows red border and error message below input -->
```

#### Form-Level Errors

```astro
<form>
  <!-- Global error container -->
  <div id="form-error" class="hidden alert alert-error" role="alert">
    <Icon name="error" />
    <span id="form-error-text"></span>
  </div>

  <!-- Form fields... -->
</form>

<script>
  function showFormError(message) {
    const errorEl = document.getElementById('form-error');
    const errorText = document.getElementById('form-error-text');
    if (errorEl && errorText) {
      errorText.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  function clearFormError() {
    const errorEl = document.getElementById('form-error');
    if (errorEl) {
      errorEl.classList.add('hidden');
    }
  }
</script>
```

#### Validation Messages

**Good validation messages:**

- ✅ "Email is required"
- ✅ "Amount must be greater than 0"
- ✅ "Password must be at least 8 characters"
- ✅ "Category is required for expenses"

**Bad validation messages:**

- ❌ "Invalid input"
- ❌ "Error"
- ❌ "Field cannot be empty"
- ❌ "Please fix this"

### Real-Time Validation

#### On Blur

```astro
<script>
  const emailInput = document.getElementById('email');

  emailInput?.addEventListener('blur', (e) => {
    const value = e.target.value;
    if (value && !isValidEmail(value)) {
      setFieldError('email', 'Invalid email format');
    } else {
      clearFieldError('email');
    }
  });
</script>
```

#### On Input (Debounced)

```astro
<script>
  let debounceTimeout;

  amountInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const value = parseFloat(e.target.value);
      if (isNaN(value) || value <= 0) {
        setFieldError('amount', 'Amount must be greater than 0');
      } else {
        clearFieldError('amount');
      }
    }, 300);
  });
</script>
```

## Form Submission

### Standard Form Submission

```astro
<script>
  const form = document.getElementById('transaction-form');
  const submitButton = form?.querySelector('button[type="submit"]');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();

    // Disable submit button
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
    }

    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      // Client-side validation
      const errors = validateForm(data);
      if (Object.keys(errors).length > 0) {
        displayErrors(errors);
        return;
      }

      // Submit to API
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Handle validation errors from server
        if (result.error?.details) {
          displayServerErrors(result.error.details);
        } else {
          showFormError(result.error?.message || 'Failed to save');
        }
      } else {
        // Success - redirect
        window.location.href = '/transactions';
      }
    } catch (err) {
      showFormError('Network error. Please try again.');
    } finally {
      // Re-enable submit button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Transaction';
      }
    }
  });
</script>
```

### Loading States

```astro
<!-- Button with loading state -->
<Button type="submit" variant="primary" loading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save Transaction'}
</Button>

<!-- Or manually manage -->
<button id="submit-btn" class="btn btn-primary" type="submit"> Save Transaction </button>

<script>
  function setLoading(loading) {
    const btn = document.getElementById('submit-btn');
    if (btn) {
      btn.disabled = loading;
      btn.innerHTML = loading
        ? '<span class="loading loading-spinner"></span> Saving...'
        : 'Save Transaction';
    }
  }
</script>
```

### Success Feedback

```astro
<script>
  async function handleSubmit() {
    // ... submit logic

    if (result.success) {
      // Show success toast
      showToast('Transaction saved successfully!', 'success');

      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '/transactions';
      }, 1000);
    }
  }
</script>
```

## Form Patterns

### Multi-Step Forms

```astro
<form id="multi-step-form">
  <!-- Progress indicator -->
  <div class="flex justify-between mb-8">
    <div class="step" data-step="1">
      <div class="step-number active">1</div>
      <span class="text-sm">Basic Info</span>
    </div>
    <div class="step" data-step="2">
      <div class="step-number">2</div>
      <span class="text-sm">Details</span>
    </div>
    <div class="step" data-step="3">
      <div class="step-number">3</div>
      <span class="text-sm">Review</span>
    </div>
  </div>

  <!-- Step 1 -->
  <div id="step-1" class="form-step">
    <!-- Step 1 fields -->
  </div>

  <!-- Step 2 -->
  <div id="step-2" class="form-step hidden">
    <!-- Step 2 fields -->
  </div>

  <!-- Step 3 -->
  <div id="step-3" class="form-step hidden">
    <!-- Step 3 fields -->
  </div>

  <!-- Navigation -->
  <div class="flex justify-between mt-6">
    <Button id="prev-btn" variant="secondary" onclick="previousStep()"> Previous </Button>
    <Button id="next-btn" variant="primary" onclick="nextStep()"> Next </Button>
    <Button id="submit-btn" variant="primary" type="submit" class="hidden"> Submit </Button>
  </div>
</form>
```

### Conditional Fields

```astro
<div class="form-control">
  <Label htmlFor="type" required>Transaction Type</Label>
  <select id="type" name="type" class="select select-bordered">
    <option value="expense">Expense</option>
    <option value="income">Income</option>
  </select>
</div>

<!-- Conditional field: Only show for expenses -->
<div id="budget-warning" class="hidden">
  <div class="alert alert-warning mt-4">
    <span>This will affect your monthly budget</span>
  </div>
</div>

<script>
  const typeSelect = document.getElementById('type');
  const budgetWarning = document.getElementById('budget-warning');

  typeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'expense') {
      budgetWarning?.classList.remove('hidden');
    } else {
      budgetWarning?.classList.add('hidden');
    }
  });
</script>
```

### Dependent Selects

```astro
<script>
  // Update payment methods based on selected currency
  const categorySelect = document.getElementById('category');
  const paymentMethodSelect = document.getElementById('payment_method');

  categorySelect?.addEventListener('change', async (e) => {
    const categoryId = e.target.value;

    // Fetch compatible payment methods
    const response = await fetch(`/api/payment-methods?category=${categoryId}`);
    const data = await response.json();

    // Update payment method options
    paymentMethodSelect.innerHTML = '<option value="">Select...</option>';
    data.paymentMethods.forEach((pm) => {
      const option = document.createElement('option');
      option.value = pm.id;
      option.textContent = pm.name;
      paymentMethodSelect.appendChild(option);
    });
  });
</script>
```

### Auto-Save

```astro
<script>
  let autoSaveTimeout;

  function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(async () => {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      // Save draft
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      // Show saved indicator
      showToast('Draft saved', 'info');
    }, 2000); // 2 second debounce
  }

  // Attach to all form inputs
  form?.querySelectorAll('input, select, textarea').forEach((input) => {
    input.addEventListener('input', autoSave);
  });
</script>
```

## Form Accessibility

### Required Elements

1. **Labels**: Every form control must have an associated label
2. **Error messages**: Use `role="alert"` for error announcements
3. **Required indicators**: Visual (\*) and `aria-required="true"`
4. **Field descriptions**: Use `aria-describedby` for help text
5. **Focus management**: Logical tab order, visible focus states

### ARIA Attributes

```html
<!-- Input with label and error -->
<label for="email" id="email-label"> Email Address <span class="text-error">*</span> </label>
<input
  id="email"
  name="email"
  type="email"
  aria-labelledby="email-label"
  aria-required="true"
  aria-invalid="true"
  aria-describedby="email-error email-hint"
/>
<span id="email-hint" class="text-sm text-neutral-500"> We'll never share your email </span>
<span id="email-error" class="text-error text-sm" role="alert"> Invalid email format </span>
```

### Keyboard Navigation

- **Tab**: Move to next field
- **Shift+Tab**: Move to previous field
- **Enter**: Submit form
- **Space**: Toggle checkbox/radio
- **Arrow keys**: Navigate radio buttons, select options
- **Esc**: Cancel/close modal forms

## Form Best Practices

### Do's

- ✅ Use clear, descriptive labels
- ✅ Provide helpful error messages
- ✅ Show required fields clearly
- ✅ Use appropriate input types
- ✅ Validate on both client and server
- ✅ Disable submit button during submission
- ✅ Provide success feedback
- ✅ Use smart defaults
- ✅ Group related fields
- ✅ Keep forms short and focused

### Don'ts

- ❌ Don't use placeholder as label
- ❌ Don't hide important information
- ❌ Don't use generic error messages
- ❌ Don't validate before user interaction
- ❌ Don't submit without user confirmation (for destructive actions)
- ❌ Don't clear form on error
- ❌ Don't use CAPTCHA unless absolutely necessary
- ❌ Don't make optional fields required
- ❌ Don't use "reset" buttons
- ❌ Don't validate on every keystroke (use debounce)

## Summary

### Form Implementation Checklist

- [ ] All fields have associated labels
- [ ] Required fields marked visually and with `aria-required`
- [ ] Appropriate input types used
- [ ] Client-side validation implemented
- [ ] Server-side validation implemented
- [ ] Error messages are clear and helpful
- [ ] Loading states during submission
- [ ] Success feedback after submission
- [ ] Keyboard accessible (tab order, enter to submit)
- [ ] Focus management (focus first error on validation fail)
- [ ] ARIA attributes for errors and descriptions
- [ ] Form tested with screen reader
- [ ] Mobile-friendly (touch targets ≥44px)

### Next Steps

- **04-accessibility.md** - Comprehensive accessibility guidelines
- **05-responsive.md** - Responsive design patterns
