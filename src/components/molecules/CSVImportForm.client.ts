/**
 * CSVImportForm Client-Side Script
 *
 * Multi-step CSV import logic:
 * 1. File upload and parsing
 * 2. Preview validation
 * 3. Column mapping interface
 * 4. Import execution with CSRF protection
 */

import { getCsrfToken } from '@/lib/csrf-client';

(function () {
  'use strict';

  // Helper function to clone icon templates
  function cloneIconTemplate(templateId: string): Element {
    const template = document.getElementById(templateId);
    if (!template?.firstElementChild) {
      console.error(`Icon template "${templateId}" not found or empty`);
      // Fallback: create placeholder if template not found
      const placeholder = document.createElement('span');
      placeholder.className = 'shrink-0 h-6 w-6';
      placeholder.setAttribute('aria-hidden', 'true');
      return placeholder;
    }
    const clone = template.firstElementChild.cloneNode(true) as Element;
    clone.setAttribute('aria-hidden', 'true');
    return clone;
  }

  // Get action URL from the hidden form's data attribute
  const importForm = document.getElementById('csv-import-form');
  const action = importForm ? importForm.getAttribute('data-action') || '' : '';

  if (!action) {
    console.error('CSVImportForm: missing data-action attribute on #csv-import-form');
    return;
  }

  // DOM Elements - Upload Step
  const fileInput = document.getElementById('csv-file-input') as HTMLInputElement | null;
  const fileError = document.getElementById('file-error');
  const dropZone = document.getElementById('csv-drop-zone');
  const stepUpload = document.getElementById('step-upload');
  const loadingState = document.getElementById('loading-state');
  const previewSection = document.getElementById('preview-section');
  const mappingSection = document.getElementById('mapping-section');
  const importProgressSection = document.getElementById('import-progress-section');
  const importResultsSection = document.getElementById('import-results-section');

  // DOM Elements - Preview Step
  const previewHeader = document.getElementById('preview-header');
  const previewBody = document.getElementById('preview-body');
  const fileInfoText = document.getElementById('file-info-text');
  const rowCount = document.getElementById('row-count');
  const validationResults = document.getElementById('validation-results');
  const resetButton = document.getElementById('reset-button');
  const proceedButton = document.getElementById(
    'proceed-to-mapping-button'
  ) as HTMLButtonElement | null;

  // DOM Elements - Mapping Step
  const mappingHeader = document.getElementById('mapping-header');
  const mappingPreviewRow = document.getElementById('mapping-preview-row');
  const mappingFields = document.getElementById('mapping-fields');
  const backToPreviewButton = document.getElementById('back-to-preview-button');
  const autoMapButton = document.getElementById('auto-map-button');
  const confirmImportButton = document.getElementById('confirm-import-button');
  const mappingValidation = document.getElementById('mapping-validation');

  // DOM Elements - Results Step
  const resultSummary = document.getElementById('result-summary');
  const statImported = document.getElementById('stat-imported');
  const statSkipped = document.getElementById('stat-skipped');
  const statErrors = document.getElementById('stat-errors');
  const errorDetailsSection = document.getElementById('error-details-section');
  const errorTableBody = document.getElementById('error-table-body');
  const importAnotherButton = document.getElementById('import-another-button');

  // CSV Data Storage
  let csvData: { file: File | null; headers: string[]; rows: string[][] } = {
    file: null,
    headers: [],
    rows: [],
  };

  // Target fields that need mapping
  const TARGET_FIELDS = [
    { key: 'date', label: 'Date', required: true, helpText: 'Transaction date (YYYY-MM-DD)' },
    { key: 'type', label: 'Type', required: true, helpText: 'Transaction type (expense/income)' },
    { key: 'amount', label: 'Amount', required: true, helpText: 'Transaction amount' },
    { key: 'currency', label: 'Currency', required: true, helpText: 'Currency code (IDR/USD)' },
    { key: 'category', label: 'Category', required: true, helpText: 'Category name' },
    {
      key: 'account',
      label: 'Account',
      required: true,
      helpText: 'Account/account name',
    },
    { key: 'description', label: 'Description', required: false, helpText: 'Optional notes' },
  ];

  // Show error message
  function showError(message: string) {
    if (!fileError || !dropZone) return;
    fileError.textContent = message;
    fileError.classList.remove('hidden');
    dropZone.classList.add('border-error');
  }

  // Hide error message
  function hideError() {
    if (!fileError || !dropZone) return;
    fileError.textContent = '';
    fileError.classList.add('hidden');
    dropZone.classList.remove('border-error');
  }

  // CSV Parser
  function parseCSV(text: string): string[][] {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentLine.push(currentField);
          currentField = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentLine.push(currentField);
          if (currentLine.some((field) => field.trim() !== '')) {
            lines.push(currentLine);
          }
          currentLine = [];
          currentField = '';
          if (char === '\r') i++;
        } else if (char !== '\r') {
          currentField += char;
        }
      }
    }

    // Don't forget the last line/field
    if (currentField || currentLine.length) {
      currentLine.push(currentField);
      if (currentLine.some((field) => field.trim() !== '')) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  // Validate CSV structure
  function validateCSVStructure(
    headers: string[],
    rows: string[][]
  ): { errors: string[]; warnings: string[] } {
    const issues = {
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Check for empty CSV
    if (headers.length === 0) {
      issues.errors.push('No columns found in CSV file');
    }

    // Check for minimum rows
    if (rows.length === 0) {
      issues.errors.push('No data rows found in CSV file');
    }

    // Warnings for very small CSVs
    if (rows.length < 3) {
      issues.warnings.push(`CSV has only ${rows.length} data row(s)`);
    }

    return issues;
  }

  // Render preview table
  function renderPreview(headers: string[], rows: string[][]) {
    if (!previewHeader || !previewBody || !rowCount) return;

    // Render header
    previewHeader.innerHTML = '';
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      previewHeader.appendChild(th);
    });

    // Render body (first 10 rows)
    previewBody.innerHTML = '';
    const previewRows = rows.slice(0, 10);

    previewRows.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = cell || '(empty)';
        tr.appendChild(td);
      });
      previewBody.appendChild(tr);
    });

    rowCount.textContent = `Showing first ${previewRows.length} of ${rows.length} total rows`;
  }

  // Render validation results
  function renderValidation(issues: { errors: string[]; warnings: string[] }) {
    if (!validationResults || !proceedButton) return;

    // Clear previous results
    while (validationResults.firstChild) {
      validationResults.removeChild(validationResults.firstChild);
    }

    if (issues.errors.length === 0 && issues.warnings.length === 0) {
      // Success message
      const successDiv = document.createElement('div');
      successDiv.className = 'alert alert-success';

      const icon = cloneIconTemplate('icon-check-template');
      successDiv.appendChild(icon);

      const span = document.createElement('span');
      span.textContent = 'CSV structure is valid! Click "Map Columns" to continue.';
      successDiv.appendChild(span);

      validationResults.appendChild(successDiv);
      proceedButton.disabled = false;
      return;
    }

    // Errors
    if (issues.errors.length > 0) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-error';
      errorDiv.setAttribute('role', 'alert');

      const icon = cloneIconTemplate('icon-error-template');
      errorDiv.appendChild(icon);

      const div = document.createElement('div');
      const h4 = document.createElement('h4');
      h4.className = 'font-bold';
      h4.textContent = 'Validation Errors';
      const ul = document.createElement('ul');
      ul.className = 'text-sm mt-1 list-disc list-inside';

      issues.errors.forEach((error) => {
        const li = document.createElement('li');
        li.textContent = error;
        ul.appendChild(li);
      });

      div.appendChild(h4);
      div.appendChild(ul);
      errorDiv.appendChild(div);
      validationResults.appendChild(errorDiv);

      proceedButton.disabled = true;
    }

    // Warnings
    if (issues.warnings.length > 0) {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'alert alert-warning';

      const icon = cloneIconTemplate('icon-warning-template');
      warningDiv.appendChild(icon);

      const div = document.createElement('div');
      const h4 = document.createElement('h4');
      h4.className = 'font-bold';
      h4.textContent = 'Warnings';
      const ul = document.createElement('ul');
      ul.className = 'text-sm mt-1 list-disc list-inside';

      issues.warnings.forEach((warning) => {
        const li = document.createElement('li');
        li.textContent = warning;
        ul.appendChild(li);
      });

      div.appendChild(h4);
      div.appendChild(ul);
      warningDiv.appendChild(div);
      validationResults.appendChild(warningDiv);
    }
  }

  // Build mapping interface
  function buildMappingInterface(headers: string[], firstRow: string[]) {
    if (!mappingHeader || !mappingPreviewRow || !mappingFields) return;

    // Render header reference
    mappingHeader.innerHTML = '';
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      th.className = 'text-center';
      mappingHeader.appendChild(th);
    });

    // Render preview row reference
    mappingPreviewRow.innerHTML = '';
    firstRow.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = cell || '(empty)';
      td.className = 'text-center';
      mappingPreviewRow.appendChild(td);
    });

    // Build field mapping selects
    mappingFields.innerHTML = '';
    TARGET_FIELDS.forEach((field) => {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'form-control';

      // Label
      const label = document.createElement('label');
      label.className = 'label';
      label.htmlFor = `map-${field.key}`;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'label-text';
      labelSpan.textContent = field.label;
      if (field.required) {
        labelSpan.textContent += ' *';
      }

      const labelHelp = document.createElement('span');
      labelHelp.className = 'label-text-alt';
      labelHelp.textContent = field.helpText;

      label.appendChild(labelSpan);
      label.appendChild(labelHelp);
      fieldDiv.appendChild(label);

      // Select
      const select = document.createElement('select');
      select.id = `map-${field.key}`;
      select.name = `map_${field.key}`;
      select.className = 'select select-bordered w-full';
      select.required = field.required;
      select.dataset.field = field.key;

      // Default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '-- Select column --';
      select.appendChild(defaultOption);

      // Add options for each header
      headers.forEach((header) => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;

        // Auto-suggest based on header name
        const headerLower = header.toLowerCase().replace(/[_\s]/g, '');
        const fieldLower = field.key.toLowerCase().replace(/[_\s]/g, '');

        if (headerLower === fieldLower) {
          option.selected = true;
        } else if (headerLower.includes(fieldLower) || fieldLower.includes(headerLower)) {
          option.textContent += ' (suggested)';
        }

        select.appendChild(option);
      });

      fieldDiv.appendChild(select);
      mappingFields.appendChild(fieldDiv);
    });
  }

  // Auto-detect mappings
  function autoDetectMappings() {
    TARGET_FIELDS.forEach((field) => {
      const select = document.getElementById(`map-${field.key}`) as HTMLSelectElement | null;
      if (!select) return;

      const headerLower = field.key.toLowerCase().replace(/[_\s]/g, '');
      let bestMatch: string | null = null;
      let bestScore = 0;

      // Find best matching header
      csvData.headers.forEach((header) => {
        const normalized = header.toLowerCase().replace(/[_\s]/g, '');

        // Exact match
        if (normalized === headerLower) {
          bestMatch = header;
          bestScore = 100;
          return;
        }

        // Contains match
        if (normalized.includes(headerLower) || headerLower.includes(normalized)) {
          if (bestScore < 75) {
            bestMatch = header;
            bestScore = 75;
          }
        }
      });

      if (bestMatch) {
        select.value = bestMatch;
      }
    });
  }

  // Validate mappings
  function validateMappings(): string[] {
    const errors: string[] = [];
    const mappedColumns = new Set<string>();

    TARGET_FIELDS.forEach((field) => {
      const select = document.getElementById(`map-${field.key}`) as HTMLSelectElement | null;
      if (!select) return;

      const value = select.value;
      if (!value && field.required) {
        errors.push(`${field.label} is required`);
      } else if (value) {
        if (mappedColumns.has(value)) {
          errors.push(`Column "${value}" is mapped to multiple fields`);
        }
        mappedColumns.add(value);
      }
    });

    return errors;
  }

  // Show mapping validation message
  function showMappingValidation(message: string, isError: boolean) {
    if (!mappingValidation) return;
    mappingValidation.className = isError ? 'alert alert-error' : 'alert alert-success';
    mappingValidation.innerHTML = '';

    const templateId = isError ? 'icon-error-template' : 'icon-check-template';
    const icon = cloneIconTemplate(templateId);
    mappingValidation.appendChild(icon);

    const span = document.createElement('span');
    span.textContent = message;
    mappingValidation.appendChild(span);

    mappingValidation.classList.remove('hidden');
  }

  // Hide mapping validation
  function hideMappingValidation() {
    if (!mappingValidation) return;
    mappingValidation.classList.add('hidden');
  }

  // Navigate between steps
  function showStep(step: string) {
    stepUpload?.classList.add('hidden');
    previewSection?.classList.add('hidden');
    mappingSection?.classList.add('hidden');
    importProgressSection?.classList.add('hidden');
    importResultsSection?.classList.add('hidden');

    switch (step) {
      case 'upload':
        stepUpload?.classList.remove('hidden');
        break;
      case 'preview':
        previewSection?.classList.remove('hidden');
        break;
      case 'mapping':
        mappingSection?.classList.remove('hidden');
        break;
      case 'import':
        importProgressSection?.classList.remove('hidden');
        break;
      case 'results':
        importResultsSection?.classList.remove('hidden');
        break;
    }
  }

  if (!dropZone || !fileInput) return;

  // Drop zone: click to browse
  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  // Drop zone: keyboard support (Enter/Space)
  dropZone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Drop zone: drag events
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('border-accent');
  });

  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('border-accent');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('border-accent');
    const file = e.dataTransfer?.files[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Please select a CSV file');
        return;
      }
      handleFile(file);
    }
  });

  // Shared file handler
  function handleFile(file: File) {
    hideError();
    loadingState?.classList.remove('hidden');
    previewSection?.classList.add('hidden');

    file
      .text()
      .then(function (text) {
        if (!text.trim()) {
          throw new Error('File is empty');
        }

        // Strip BOM from Excel UTF-8 exports
        const cleanText = text.replace(/^\uFEFF/, '');

        const lines = parseCSV(cleanText);

        if (lines.length < 2) {
          throw new Error('CSV file must contain at least a header row and one data row');
        }

        const headers = lines[0].map(function (h) {
          return h.trim();
        });
        const rows = lines.slice(1);

        csvData = { file: file, headers: headers, rows: rows };

        const issues = validateCSVStructure(headers, rows);

        if (fileInfoText) {
          fileInfoText.textContent =
            'Found ' + rows.length + ' rows with ' + headers.length + ' columns';
        }
        renderPreview(headers, rows);
        renderValidation(issues);

        loadingState?.classList.add('hidden');
        showStep('preview');
      })
      .catch(function (err) {
        loadingState?.classList.add('hidden');
        showStep('upload');
        showError(err.message || 'Failed to parse CSV file');
      });
  }

  // Handle file selection via input
  fileInput.addEventListener('change', function (e) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) handleFile(file);
  });

  // Reset button
  resetButton?.addEventListener('click', function () {
    fileInput.value = '';
    csvData = { file: null, headers: [], rows: [] };
    showStep('upload');
    hideError();
  });

  // Proceed to mapping
  proceedButton?.addEventListener('click', function () {
    buildMappingInterface(csvData.headers, csvData.rows[0] || []);
    showStep('mapping');
    hideMappingValidation();
  });

  // Back to preview
  backToPreviewButton?.addEventListener('click', function () {
    showStep('preview');
  });

  // Auto-detect mappings
  autoMapButton?.addEventListener('click', function () {
    autoDetectMappings();
    showMappingValidation('Mappings auto-detected! Please review and confirm.', false);

    setTimeout(hideMappingValidation, 3000);
  });

  // Confirm import
  confirmImportButton?.addEventListener('click', async function () {
    const errors = validateMappings();

    if (errors.length > 0) {
      showMappingValidation('Please fix the following issues:\n' + errors.join('\n'), true);
      return;
    }

    hideMappingValidation();

    // Collect mappings
    const mappings: Record<string, string> = {};
    TARGET_FIELDS.forEach((field) => {
      const select = document.getElementById(`map-${field.key}`) as HTMLSelectElement | null;
      if (select && select.value) {
        mappings[field.key] = select.value;
      }
    });

    // Show loading state
    showStep('import');

    try {
      // Create FormData
      const formData = new FormData();
      if (csvData.file) {
        formData.append('csv_file', csvData.file);
      }

      // Add column mappings
      Object.entries(mappings).forEach(([key, value]) => {
        formData.append(`map_${key}`, value);
      });

      // Get CSRF token using shared utility
      const csrfToken = getCsrfToken() || '';

      // Send import request
      const response = await fetch(action, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Import failed');
      }

      // Show results
      displayImportResults(result.data.result);
      showStep('results');

      // Show toast notification
      if (typeof (window as any).showToast === 'function') {
        const message = `Import complete: ${result.data.result.imported} imported, ${result.data.result.skipped} skipped`;
        (window as any).showToast(
          message,
          result.data.result.errors.length > 0 ? 'warning' : 'success'
        );
      }
    } catch (error) {
      // Show error and go back to mapping step
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(errorMessage, 'error');
      }
      showStep('mapping');
      showMappingValidation(errorMessage || 'Import failed. Please try again.', true);
    }
  });

  // Display import results
  function displayImportResults(result: {
    imported: number;
    skipped: number;
    errors: { row: number; message: string }[];
  }) {
    if (!resultSummary || !statImported || !statSkipped || !statErrors) return;

    // Update stats
    statImported.textContent = String(result.imported || 0);
    statSkipped.textContent = String(result.skipped || 0);
    statErrors.textContent = String(result.errors?.length || 0);

    // Set summary alert style
    resultSummary.className = 'alert';
    resultSummary.innerHTML = '';

    const hasErrors = result.errors && result.errors.length > 0;
    const hasSuccess = result.imported > 0;

    if (hasErrors) {
      resultSummary.classList.add('alert-warning');
    } else if (hasSuccess) {
      resultSummary.classList.add('alert-success');
    } else {
      resultSummary.classList.add('alert-error');
    }

    // Create summary content with Lucide icon templates
    let iconTemplateId: string;
    if (hasErrors && !hasSuccess) {
      iconTemplateId = 'icon-error-template';
    } else if (hasErrors) {
      iconTemplateId = 'icon-warning-template';
    } else {
      iconTemplateId = 'icon-check-template';
    }

    const summaryIcon = cloneIconTemplate(iconTemplateId);

    const summaryDiv = document.createElement('div');
    const summaryTitle = document.createElement('h4');
    summaryTitle.className = 'font-bold';
    summaryTitle.textContent = hasSuccess ? 'Import Completed' : 'Import Failed';

    const summaryText = document.createElement('p');
    summaryText.className = 'text-sm';
    summaryText.textContent = `Successfully imported ${result.imported} transaction(s), skipped ${result.skipped}, and encountered ${result.errors?.length || 0} error(s).`;

    summaryDiv.appendChild(summaryTitle);
    summaryDiv.appendChild(summaryText);

    resultSummary.appendChild(summaryIcon);
    resultSummary.appendChild(summaryDiv);

    // Show error details if there are errors
    if (hasErrors && errorDetailsSection && errorTableBody) {
      errorDetailsSection.classList.remove('hidden');
      errorTableBody.innerHTML = '';

      result.errors.forEach((error) => {
        const tr = document.createElement('tr');
        const rowTd = document.createElement('td');
        rowTd.textContent = `Row ${error.row}`;
        const messageTd = document.createElement('td');
        messageTd.textContent = error.message;
        tr.appendChild(rowTd);
        tr.appendChild(messageTd);
        errorTableBody.appendChild(tr);
      });
    } else {
      errorDetailsSection?.classList.add('hidden');
    }
  }

  // Import another button
  importAnotherButton?.addEventListener('click', function () {
    // Reset all state
    if (fileInput) fileInput.value = '';
    csvData = { file: null, headers: [], rows: [] };
    hideError();
    showStep('upload');
  });
})();
