import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/CSVImportForm',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Container | Card | \`bg-base-100 rounded-box p-6\` |
| Form Gap | 16px | \`flex flex-col gap-4\` |
| Step Indicator | DaisyUI steps | \`steps steps-horizontal\` |

### Icons (All 16px)

| Icon | Usage | Class |
|------|-------|-------|
| Check | Step complete, validation pass | \`size={16} stroke-current\` |
| RefreshCw | Processing/loading | \`size={16} stroke-current animate-spin\` |
| ArrowRight | Next step | \`size={16} stroke-current\` |
| Info | Help/info tooltip | \`size={16} stroke-current\` |
| ArrowLeft | Previous step | \`size={16} stroke-current\` |
| Plus | Add mapping | \`size={16} stroke-current\` |
| List | Column list | \`size={16} stroke-current\` |

### Multi-Step Form (5 Steps)

| Step | Name | Description |
|------|------|-------------|
| 1 | Upload | Select CSV file |
| 2 | Preview | Review file contents |
| 3 | Mapping | Map CSV columns to fields |
| 4 | Validation | Check data validity |
| 5 | Import | Confirm and import |

### Step States

| State | Classes |
|-------|---------|
| Complete | \`step step-primary\` with Check icon |
| Current | \`step step-primary\` highlighted |
| Pending | \`step\` (default) |
| Error | \`step step-error\` |

### File Upload

| Property | Value | Class |
|----------|-------|-------|
| Drop Zone | Dashed border | \`border-2 border-dashed border-base-300 rounded-lg\` |
| Drop Hover | Highlighted | \`border-accent bg-accent/5\` |
| Accepted | .csv files | \`accept=".csv"\` |

### Validation Display

| Status | Icon | Color |
|--------|------|-------|
| Valid | Check (inline SVG) | text-success |
| Invalid | X (inline SVG) | text-error |
| Warning | Alert triangle | text-warning |

### Column Mapping

| Property | Value | Class |
|----------|-------|-------|
| Select | DaisyUI | \`select select-bordered\` |
| Required Fields | Marked | \`text-error\` asterisk |
| Optional Fields | Normal | Standard label |

### Accessibility

- Step navigation via keyboard
- \`aria-current="step"\` on active step
- Error messages with \`role="alert"\`
- File input with \`aria-describedby\`
- Progress announced via \`aria-live\`

### Props

- **step**: Current step (1-5)
- **fileName**: Selected file name
- **previewData**: CSV preview rows
- **mappings**: Column to field mappings
- **validationResults**: Validation status per row
        `,
      },
    },
  },
  argTypes: {
    step: {
      control: { type: 'number', min: 1, max: 5 },
      description: 'Current step (1-5)',
    },
  },
};

export default meta;

/**
 * Helper function to create step indicator
 */
function createStepIndicator(currentStep: number): HTMLElement {
  const steps = ['Upload', 'Preview', 'Mapping', 'Validation', 'Import'];

  const container = document.createElement('ul');
  container.className = 'steps steps-horizontal w-full';

  steps.forEach((step, index) => {
    const li = document.createElement('li');
    const stepNum = index + 1;

    let stepClass = 'step';
    if (stepNum < currentStep) stepClass += ' step-primary';
    else if (stepNum === currentStep) stepClass += ' step-primary';

    li.className = stepClass;
    li.setAttribute('data-content', stepNum < currentStep ? '✓' : String(stepNum));
    if (stepNum === currentStep) li.setAttribute('aria-current', 'step');
    li.textContent = step;

    container.appendChild(li);
  });

  return container;
}

/**
 * Helper function to create CSVImportForm
 */
function createCSVImportForm(args: { step?: number }): HTMLElement {
  const { step = 1 } = args;

  const wrapper = document.createElement('div');
  wrapper.className = 'bg-base-100 rounded-box p-6 max-w-2xl';

  // Title
  const title = document.createElement('h2');
  title.className = 'text-xl font-bold mb-4';
  title.textContent = 'Import Transactions';
  wrapper.appendChild(title);

  // Step indicator
  wrapper.appendChild(createStepIndicator(step));

  // Spacer
  const spacer = document.createElement('div');
  spacer.className = 'h-6';
  wrapper.appendChild(spacer);

  // Step content
  const content = document.createElement('div');
  content.className = 'flex flex-col gap-4';

  if (step === 1) {
    // Upload step
    content.innerHTML = `
      <div class="border-2 border-dashed border-base-300 rounded-lg p-8 text-center hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-base-content/40">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
        </svg>
        <p class="text-base-content/60 mb-2">Drag and drop your CSV file here</p>
        <p class="text-sm text-base-content/40">or click to browse</p>
        <input type="file" accept=".csv" class="hidden" aria-describedby="file-hint" />
      </div>
      <p id="file-hint" class="text-xs text-base-content/50 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Supported format: CSV with headers
      </p>
    `;
  } else if (step === 2) {
    // Preview step
    content.innerHTML = `
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>2024-01-15</td><td>Grocery Store</td><td>-150,000</td><td>Food</td></tr>
            <tr><td>2024-01-14</td><td>Salary</td><td>+5,000,000</td><td>Income</td></tr>
            <tr><td>2024-01-13</td><td>Electric Bill</td><td>-350,000</td><td>Utilities</td></tr>
          </tbody>
        </table>
      </div>
      <p class="text-sm text-base-content/60">Showing 3 of 50 rows</p>
    `;
  } else if (step === 3) {
    // Mapping step
    content.innerHTML = `
      <div class="space-y-4">
        <div class="form-control">
          <label class="label"><span class="label-text">Date Column <span class="text-error">*</span></span></label>
          <select class="select select-bordered w-full">
            <option>Column A (Date)</option>
            <option>Column B (Description)</option>
            <option>Column C (Amount)</option>
          </select>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Amount Column <span class="text-error">*</span></span></label>
          <select class="select select-bordered w-full">
            <option>Column C (Amount)</option>
            <option>Column A (Date)</option>
            <option>Column B (Description)</option>
          </select>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Description Column</span></label>
          <select class="select select-bordered w-full">
            <option>Column B (Description)</option>
            <option>Column A (Date)</option>
            <option>Column C (Amount)</option>
          </select>
        </div>
      </div>
    `;
  } else if (step === 4) {
    // Validation step
    content.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-success">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="M20 6 9 17l-5-5"/></svg>
          <span>48 rows valid</span>
        </div>
        <div class="flex items-center gap-2 text-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          <span>2 rows with errors</span>
        </div>
      </div>
      <div class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span>Row 12: Invalid date format</span>
      </div>
    `;
  } else if (step === 5) {
    // Import step
    content.innerHTML = `
      <div class="text-center py-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-success"><path d="M20 6 9 17l-5-5"/></svg>
        <h3 class="text-lg font-bold mb-2">Ready to Import</h3>
        <p class="text-base-content/60">48 transactions will be imported</p>
      </div>
    `;
  }

  wrapper.appendChild(content);

  // Navigation buttons
  const nav = document.createElement('div');
  nav.className = 'flex justify-between mt-6';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = `btn btn-ghost ${step === 1 ? 'invisible' : ''}`;
  backBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
    Back
  `;
  nav.appendChild(backBtn);

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn btn-accent';
  nextBtn.innerHTML =
    step === 5
      ? `Import
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="M20 6 9 17l-5-5"/></svg>`
      : `Next
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
  nav.appendChild(nextBtn);

  wrapper.appendChild(nav);

  return wrapper;
}

// Step 1: Upload
export const Step1Upload: StoryObj = {
  args: { step: 1 },
  render: (args) => createCSVImportForm(args),
};

// Step 2: Preview
export const Step2Preview: StoryObj = {
  args: { step: 2 },
  render: (args) => createCSVImportForm(args),
};

// Step 3: Mapping
export const Step3Mapping: StoryObj = {
  args: { step: 3 },
  render: (args) => createCSVImportForm(args),
};

// Step 4: Validation
export const Step4Validation: StoryObj = {
  args: { step: 4 },
  render: (args) => createCSVImportForm(args),
};

// Step 5: Import
export const Step5Import: StoryObj = {
  args: { step: 5 },
  render: (args) => createCSVImportForm(args),
};

// All Steps
export const AllSteps: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    for (let step = 1; step <= 5; step++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-2';

      const label = document.createElement('p');
      label.className = 'text-sm font-medium text-base-content/60';
      label.textContent = `Step ${step}`;
      wrapper.appendChild(label);

      wrapper.appendChild(createCSVImportForm({ step }));
      container.appendChild(wrapper);
    }

    return container;
  },
};
