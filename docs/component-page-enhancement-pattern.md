# Component/Page Enhancement Pattern

## Overview

This project uses a **Component/Page Enhancement Pattern** where Astro components provide reusable UI structure and behavior, while pages enhance components with application-specific logic like API calls. This pattern promotes reusability, testability, and flexibility.

## Architecture

### Component Role

**What components provide:**

- Complete UI structure and styling
- Client-side validation logic
- User interaction handlers (password toggle, form clearing)
- Loading states and error/success message display
- **Placeholder/simulated behavior** for standalone operation

**What components don't provide:**

- Actual API calls (except when truly generic)
- Business logic that varies by context

### Page Role

**What pages provide:**

- Application-specific behavior enhancement
- Real API calls using fetch()
- Custom error handling for API responses
- Page-specific redirects or navigation
- Integration with authentication state

**How pages enhance components:**

1. Use `DOMContentLoaded` event listener
2. Query selector for component elements using `data-*` attributes
3. Add event listeners with `e.stopImmediatePropagation()` to override default handlers
4. Implement fetch API calls
5. Use the same UI state management patterns (submitting class, loading spinner, messages container)

## Example: RegistrationForm Component

### Component Implementation

**File:** `/src/components/molecules/RegistrationForm.astro`

The component provides:

- Form structure with all required fields
- Client-side validation for name, email, password requirements, and password matching
- Password visibility toggle for confirm password field
- Loading state management (submitting class, button text/spinner toggle)
- Simulated submission that works standalone

**Key sections:**

```astro
<!-- Form with data attribute for page scripts to find -->
<form
  id="registration-form"
  data-registration-form
  action="/api/auth/register"
  method="POST"
  novalidate
>
  <!-- Form fields -->
  <Button type="submit" data-submit-button>
    <span data-button-text>Create Account</span>
    <span data-loading-spinner class="hidden">
      <span class="loading loading-spinner"></span>
      Creating account...
    </span>
  </Button>
</form>
```

The component includes a **simulated submission** (lines 313-328) that:

- Provides a working demo in Storybook
- Allows the component to function in prototypes
- Serves as a reference implementation for page-level scripts

### Page Enhancement Implementation

**File:** `/src/pages/register.astro`

The page enhances the component by:

```astro
<RegistrationForm />

<script define:vars={{ apiSignupUrl: '/api/auth/signup' }}>
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-registration-form]');
    const messagesContainer = document.getElementById('registration-messages');
    const submitButton = form?.querySelector('[data-submit-button]');
    const buttonText = submitButton?.querySelector('[data-button-text]');
    const loadingSpinner = submitButton?.querySelector('[data-loading-spinner]');

    if (!form || !messagesContainer) return;

    // Override form submission to use real API
    form.addEventListener('submit', async (e) => {
      // Prevent the component's default handler
      e.stopImmediatePropagation();

      // Clear previous messages
      messagesContainer.innerHTML = '';

      const formData = new FormData(form);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        'confirm-password': formData.get('confirm-password'),
      };

      // ... validation code ...

      // Show loading state (using component's UI patterns)
      form.classList.add('submitting');
      if (buttonText) buttonText.classList.add('hidden');
      if (loadingSpinner) loadingSpinner.classList.remove('hidden');

      try {
        const response = await fetch(apiSignupUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
          }),
        });

        const result = await response.json();

        // Handle success/error responses
        if (response.ok && result.success) {
          // Success handling with same UI patterns
          messagesContainer.innerHTML = `...`;
          form.reset();
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          // Error handling
          messagesContainer.innerHTML = `...`;
        }
      } catch (error) {
        // Network error handling
      } finally {
        // Reset loading state
        form.classList.remove('submitting');
        if (buttonText) buttonText.classList.remove('hidden');
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
      }
    });
  });
</script>
```

## Key Techniques

### 1. Data Attributes for Selection

Components use `data-*` attributes so pages can reliably find elements:

```astro
<form data-registration-form>
  <Button data-submit-button>
    <span data-button-text> <span data-loading-spinner></span></span></Button
  >
</form>
```

Pages query these attributes:

```javascript
const form = document.querySelector('[data-registration-form]');
const submitButton = form?.querySelector('[data-submit-button]');
```

### 2. Event Handler Override

Pages use `e.stopImmediatePropagation()` to prevent the component's default handler:

```javascript
form.addEventListener('submit', async (e) => {
  e.stopImmediatePropagation(); // Block component's handler
  // Implement page-specific API call
});
```

### 3. UI State Management

Both component and page use the same UI state patterns:

```javascript
// Show loading state
form.classList.add('submitting');
buttonText.classList.add('hidden');
loadingSpinner.classList.remove('hidden');
submitButton.disabled = true;

// ... API call ...

// Reset loading state
form.classList.remove('submitting');
buttonText.classList.remove('hidden');
loadingSpinner.classList.add('hidden');
submitButton.disabled = false;
```

### 4. Message Container Integration

Components provide message containers with ARIA attributes:

```astro
<div id="form-messages" aria-live="polite" aria-atomic="true"></div>
```

Pages can provide their own containers:

```astro
<div id="registration-messages" aria-live="polite" aria-atomic="true">
  {
    errorMessage && (
      <div role="alert" class="alert alert-error">
        ...
      </div>
    )
  }
</div>
<RegistrationForm />
```

## Benefits

### 1. Reusability

- Same component can be used in multiple contexts
- Each page can customize API endpoints and behavior
- No need to modify component for different use cases

### 2. Testability

- Components work standalone in Storybook
- No mock API calls needed for component development
- Visual testing is simpler

### 3. Separation of Concerns

- Component: UI structure, validation, user interactions
- Page: Business logic, API calls, routing
- Clear boundaries between layers

### 4. Progressive Enhancement

- Start with simulated behavior for rapid prototyping
- Add real API calls when backend is ready
- Component works even without backend

### 5. Flexibility

- Pages can customize error handling
- Different pages can use different API endpoints
- Easy to add page-specific logic (analytics, logging, etc.)

## When to Use This Pattern

### Good Use Cases:

✅ Forms that need different API endpoints in different contexts
✅ Components that should work in Storybook/prototypes
✅ UI that might be reused across multiple pages with slight variations
✅ Components where API behavior is context-dependent

### Not Suitable:

❌ Truly one-time-only components (just put behavior in component)
❌ Generic components that always call the same API (like LoginForm)
❌ Components with no user interaction/state

## Comparison: LoginForm vs RegistrationForm

### LoginForm Component

**File:** `/src/components/molecules/LoginForm.astro`

- **Includes API call directly in component** (lines 177-184)
- Why? Login always uses the same endpoint (`/api/auth/login`)
- No page-specific customization needed
- Simpler to use: just drop the component in any page

### RegistrationForm Component

**File:** `/src/components/molecules/RegistrationForm.astro`

- **Uses simulated submission, expects page override**
- Why? Registration might need different endpoints or workflows
- More flexible for different contexts (admin registration, user registration, etc.)
- Requires page-level enhancement script

## Implementation Checklist

When implementing this pattern for a new component:

### Component Development:

- [ ] Add `data-*` attributes to key elements for page selection
- [ ] Implement client-side validation
- [ ] Add loading state management (classes, hidden elements)
- [ ] Provide message container with ARIA attributes
- [ ] Include simulated/placeholder behavior
- [ ] Document the enhancement pattern in JSDoc comments
- [ ] Reference the example implementation (page file)

### Page Development:

- [ ] Use `DOMContentLoaded` event listener
- [ ] Query for component using `data-*` attributes
- [ ] Use `e.stopImmediatePropagation()` to override default handlers
- [ ] Implement fetch API call
- [ ] Use same UI state management patterns as component
- [ ] Handle success/error responses appropriately
- [ ] Consider page-specific error display (query params, etc.)

## Related Patterns

- **Container/Presentational Pattern**: Similar separation of UI and logic
- **Headless UI**: UI components without behavior, enhanced by hooks
- **Progressive Enhancement**: Core functionality works, enhanced by JavaScript

## Further Reading

- `/src/components/molecules/RegistrationForm.astro` - Component with full pattern documentation
- `/src/pages/register.astro` - Example page-level enhancement
- `/src/components/molecules/LoginForm.astro` - Example of when NOT to use this pattern
