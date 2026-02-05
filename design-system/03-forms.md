# Forms

Form controls, validation, and submission patterns.

## Form Structure

```astro
<form id="form-id" class="space-y-4" novalidate>
  <div id="form-error" class="hidden alert alert-error" role="alert"></div>

  <FormField label="Name" htmlFor="name" required>
    <Input id="name" name="name" error={!!errors.name} errorMessage={errors.name} required />
  </FormField>

  <div class="card-actions justify-end gap-2 mt-6">
    <a href="/cancel" class="btn btn-ghost">Cancel</a>
    <Button type="submit" variant="primary">Submit</Button>
  </div>
</form>
```

## Form Controls

```astro
<!-- Text -->
<Input id="name" name="name" type="text" placeholder="Enter name" />

<!-- Number -->
<Input id="amount" name="amount" type="number" min={0} step={0.01} />

<!-- Currency -->
<CurrencyInput id="amount" name="amount" currency="IDR" />

<!-- Date -->
<DatePicker id="date" name="date" max={today} />

<!-- Select -->
<select id="category" name="category_id" class="select select-bordered w-full">
  <option value="">Select...</option>
  {categories.map((cat) => <option value={cat.id}>{cat.name}</option>)}
</select>

<!-- Textarea -->
<textarea id="description" name="description" class="textarea textarea-bordered" rows="3"
></textarea>

<!-- Checkbox -->
<Checkbox id="recurring" name="is_recurring" checked={values.is_recurring} />

<!-- Radio -->
<div class="join w-full">
  <input
    type="radio"
    name="type"
    value="expense"
    id="type-expense"
    class="join-item btn btn-sm flex-1"
  />
  <label for="type-expense" class="join-item btn btn-sm flex-1">Expense</label>
  <input
    type="radio"
    name="type"
    value="income"
    id="type-income"
    class="join-item btn btn-sm flex-1"
  />
  <label for="type-income" class="join-item btn btn-sm flex-1">Income</label>
</div>
```

## Labels

```astro
<Label htmlFor="field" required>Field Name</Label>
<Label htmlFor="field" helpText="Help text">Field Name</Label>
```

## Validation

### Client-Side

```typescript
function validateForm(data) {
  const errors = {};
  if (!data.email) errors.email = 'Email is required';
  if (!data.email.includes('@')) errors.email = 'Invalid email';
  return errors;
}
```

### Server-Side (Zod)

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  amount: z.number().positive('Must be positive'),
});

const result = schema.safeParse(data);
if (!result.success) {
  return { success: false, error: result.error };
}
```

### Error Display

```astro
<FormField label="Email" htmlFor="email" error={!!errors.email} errorMessage={errors.email}>
  <Input id="email" name="email" type="email" error={!!errors.email} />
</FormField>

<!-- Form error -->
<div id="form-error" class="hidden alert alert-error" role="alert"></div>
```

## Form Submission

```typescript
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';

  try {
    const formData = new FormData(form);
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    const result = await response.json();

    if (result.success) {
      window.location.href = '/success';
    } else {
      showFormError(result.error.message);
    }
  } catch (err) {
    showFormError('Network error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Save';
  }
});
```

## Accessibility

- Every input must have a label (`<Label>` or `aria-label`)
- Required fields: `required` attribute + `aria-required="true"`
- Error messages: `role="alert"` + `aria-describedby`
- Keyboard: Tab, Enter to submit, Esc to cancel
- Focus on first error after validation

```html
<label htmlFor="email">Email</label>
<input
  id="email"
  name="email"
  aria-required="true"
  aria-invalid="{!!errors.email}"
  aria-describedby="email-error"
/>
<span id="email-error" class="text-error" role="alert">{errors.email}</span>
```

## Form Checklist

- [ ] All fields have labels
- [ ] Required fields marked
- [ ] Client and server validation
- [ ] Error messages clear and helpful
- [ ] Loading state during submission
- [ ] Success feedback after submission
- [ ] Keyboard accessible
- [ ] ARIA attributes for errors
