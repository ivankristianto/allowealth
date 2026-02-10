import { animate } from 'motion/mini';
import { formatCurrency } from '@/lib/formatting/currency-client';
import { CURRENCY_META, DEFAULT_CURRENCY } from '@/lib/constants/currency';
import type { Currency } from '@/lib/constants/currency';

type TransactionType = 'expense' | 'income';

interface SubmittedTransaction {
  type: TransactionType;
  title?: string;
  description?: string;
  transaction_date: string;
  category_id: string;
  amount: string | number;
  currency?: string;
}

interface OpenDrawerDetail {
  type?: TransactionType;
}

interface EditDrawerDetail {
  id: string;
  type: TransactionType;
  title?: string;
  description?: string;
  amount?: string | number;
  currency?: string;
  category_id?: string;
  asset_id?: string;
  transaction_date?: string;
}

const ACTIVE_TAB_CLASSES = ['bg-white', 'shadow-sm', 'text-primary'] as const;
const INACTIVE_TAB_CLASSES = ['bg-transparent', 'text-neutral'] as const;

function initTransactionDrawer(): void {
  const drawer = document.getElementById('transaction-drawer');
  if (!(drawer instanceof HTMLElement)) return;
  if (drawer.dataset.initialized === 'true') return;
  drawer.dataset.initialized = 'true';

  const expenseBtn = drawer.querySelector('[data-tab="expense"]') as HTMLButtonElement | null;
  const incomeBtn = drawer.querySelector('[data-tab="income"]') as HTMLButtonElement | null;
  const expenseForm = document.getElementById('drawer-expense-form');
  const incomeForm = document.getElementById('drawer-income-form');

  if (!expenseBtn || !incomeBtn || !expenseForm || !incomeForm) return;

  const setActiveTab = (type: TransactionType): void => {
    if (type === 'expense') {
      expenseBtn.classList.remove(...INACTIVE_TAB_CLASSES, 'bg-base-300');
      expenseBtn.classList.add(...ACTIVE_TAB_CLASSES);
      expenseBtn.setAttribute('aria-selected', 'true');
      expenseBtn.setAttribute('tabindex', '0');

      incomeBtn.classList.remove(...ACTIVE_TAB_CLASSES);
      incomeBtn.classList.add(...INACTIVE_TAB_CLASSES);
      incomeBtn.setAttribute('aria-selected', 'false');
      incomeBtn.setAttribute('tabindex', '-1');

      expenseForm.classList.remove('hidden');
      expenseForm.setAttribute('aria-hidden', 'false');
      incomeForm.classList.add('hidden');
      incomeForm.setAttribute('aria-hidden', 'true');
      return;
    }

    incomeBtn.classList.remove(...INACTIVE_TAB_CLASSES, 'bg-base-300');
    incomeBtn.classList.add(...ACTIVE_TAB_CLASSES);
    incomeBtn.setAttribute('aria-selected', 'true');
    incomeBtn.setAttribute('tabindex', '0');

    expenseBtn.classList.remove(...ACTIVE_TAB_CLASSES);
    expenseBtn.classList.add(...INACTIVE_TAB_CLASSES);
    expenseBtn.setAttribute('aria-selected', 'false');
    expenseBtn.setAttribute('tabindex', '-1');

    incomeForm.classList.remove('hidden');
    incomeForm.setAttribute('aria-hidden', 'false');
    expenseForm.classList.add('hidden');
    expenseForm.setAttribute('aria-hidden', 'true');
  };

  expenseBtn.addEventListener('click', () => setActiveTab('expense'));
  incomeBtn.addEventListener('click', () => setActiveTab('income'));

  const list = document.getElementById('drawer-recent-list') as HTMLUListElement | null;
  const emptyState = document.getElementById('empty-state-message');
  const countBadge = document.getElementById('session-count');
  const sessionSummary = document.getElementById('session-summary');
  const expenseIconTemplate = document.getElementById('icon-expense');
  const incomeIconTemplate = document.getElementById('icon-income');

  let sessionCount = 0;
  const sessionTotals: Record<string, number> = {};
  let hasSubmittedInSession = false;

  const formatMoney = (amount: number | string, currency: string = DEFAULT_CURRENCY): string => {
    return formatCurrency(Number(amount), currency);
  };

  const updateSessionSummary = (): void => {
    if (!sessionSummary || !countBadge) return;
    countBadge.textContent = String(sessionCount);
    if (sessionCount > 0) {
      const currencies = Object.keys(sessionTotals);
      const totalStr = currencies.map((cur) => formatMoney(sessionTotals[cur], cur)).join(' + ');
      sessionSummary.textContent = `${sessionCount} item${sessionCount !== 1 ? 's' : ''} · ${totalStr}`;
    } else {
      countBadge.textContent = '0';
      sessionSummary.textContent = '0 items';
    }
  };

  const resetSessionState = (): void => {
    if (!list || !emptyState || !countBadge) return;
    sessionCount = 0;
    for (const key of Object.keys(sessionTotals)) delete sessionTotals[key];
    updateSessionSummary();
    list.innerHTML = '';
    list.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
  };

  const forms = drawer.querySelectorAll('form[data-bulk="true"]');
  forms.forEach((form) => {
    const handleTransactionSubmitted = (event: Event): void => {
      const customEvent = event as CustomEvent<SubmittedTransaction>;
      const data = customEvent.detail;

      if (!list || !emptyState || !countBadge) return;

      emptyState.classList.add('hidden');
      emptyState.classList.remove('flex');
      list.classList.remove('hidden');

      const template = data.type === 'expense' ? expenseIconTemplate : incomeIconTemplate;
      if (!(template instanceof HTMLTemplateElement)) return;
      const iconClone = template.content.cloneNode(true);

      const li = document.createElement('li');
      li.className =
        'bg-base-100 rounded-lg border border-base-200 p-2 flex items-center justify-between gap-2 overflow-hidden';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'flex items-center gap-2 min-w-0 flex-1';

      const iconContainer = document.createElement('div');
      iconContainer.appendChild(iconClone);
      contentDiv.appendChild(iconContainer);

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'min-w-0 flex-1';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'font-semibold text-xs text-primary truncate';
      titleDiv.textContent = data.description || data.title || '';

      const metaDiv = document.createElement('div');
      metaDiv.className = 'text-xs text-neutral/60 font-medium';

      const apiCategory = (data as unknown as Record<string, unknown>).category as
        | { id: string; name: string }
        | null
        | undefined;
      let categoryLabel = apiCategory?.name;
      if (!categoryLabel) {
        const categorySelect = form.querySelector(
          'select[name="category_id"]'
        ) as HTMLSelectElement | null;
        const catId = data.category_id || (apiCategory?.id ?? '');
        const categoryOption = categorySelect?.querySelector(
          `option[value="${catId}"]`
        ) as HTMLOptionElement | null;
        categoryLabel = categoryOption?.textContent || catId || '';
      }

      const dateStr = data.transaction_date;
      // Parse as local date to avoid timezone shift (UTC midnight → previous day in UTC- zones)
      let formattedDate = '';
      if (dateStr) {
        const str = String(dateStr).split('T')[0];
        const [y, m, d] = str.split('-').map(Number);
        formattedDate = new Date(y, m - 1, d).toLocaleDateString();
      }
      metaDiv.textContent = `${formattedDate} · ${categoryLabel}`;

      detailsDiv.append(titleDiv, metaDiv);
      contentDiv.appendChild(detailsDiv);
      li.appendChild(contentDiv);

      const amountDiv = document.createElement('div');
      amountDiv.className = `font-bold text-xs whitespace-nowrap tabular-nums ${data.type === 'expense' ? 'text-error' : 'text-success'}`;
      amountDiv.innerText = `${data.type === 'expense' ? '-' : '+'} ${formatMoney(data.amount, data.currency)}`;
      li.appendChild(amountDiv);

      list.insertBefore(li, list.firstChild);
      animate(li, { opacity: [0, 1], x: [20, 0], height: [0, 'auto'] }, { duration: 0.4 });

      sessionCount += 1;
      const cur = data.currency || DEFAULT_CURRENCY;
      sessionTotals[cur] = (sessionTotals[cur] || 0) + (Number(data.amount) || 0);
      hasSubmittedInSession = true;
      updateSessionSummary();
    };

    form.addEventListener('transaction-submitted', handleTransactionSubmitted);
  });

  // Open drawer in create mode
  document.addEventListener('open-transaction-drawer', ((event: CustomEvent<OpenDrawerDetail>) => {
    resetEditMode();
    const requestedType: TransactionType | undefined = event.detail?.type;
    if (requestedType === 'expense' || requestedType === 'income') {
      setActiveTab(requestedType);
    }
    drawer.dispatchEvent(new CustomEvent('drawer:open'));
  }) as EventListener);

  // Open drawer in edit mode with transaction data
  document.addEventListener('edit-transaction-drawer', ((event: CustomEvent<EditDrawerDetail>) => {
    const detail: EditDrawerDetail = event.detail;
    if (!detail?.id) return;

    const type: TransactionType = detail.type === 'income' ? 'income' : 'expense';
    setActiveTab(type);

    // Hide tabs and recent items for edit mode
    const tabContainer: HTMLElement | null = drawer.querySelector('[role="tablist"]');
    const recentSection: HTMLElement | null = drawer.querySelector('[data-recent-section]');
    if (tabContainer) tabContainer.classList.add('hidden');
    if (recentSection) recentSection.classList.add('hidden');

    // Get the active form
    const formContainer = type === 'expense' ? expenseForm : incomeForm;
    const form = formContainer?.querySelector(
      'form[data-transaction-form]'
    ) as HTMLFormElement | null;
    if (!form) return;

    // Set edit mode on form
    form.dataset.mode = 'edit';
    form.dataset.transactionId = detail.id;

    // Populate form fields
    const setInput = (name: string, value: string | number | null | undefined): void => {
      const input = form.querySelector(`[name="${name}"]`) as
        | HTMLInputElement
        | HTMLSelectElement
        | null;
      if (input) {
        input.value = value == null ? '' : String(value);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    setInput('title', detail.title ?? detail.description ?? '');
    setInput('amount', detail.amount ?? '');
    setInput('currency', detail.currency ?? DEFAULT_CURRENCY);
    setInput('category_id', detail.category_id ?? '');
    setInput('asset_id', detail.asset_id ?? '');
    setInput('transaction_date', detail.transaction_date ?? '');

    // Update category chip active state
    if (detail.category_id) {
      const chips = form.querySelectorAll<HTMLButtonElement>('[data-category-chip]');
      // Auto-expand overflow if selected category is hidden
      const overflowChips = form.querySelectorAll<HTMLButtonElement>('[data-category-overflow]');
      const isOverflow = Array.from(overflowChips).some(
        (c) => c.dataset.categoryChip === detail.category_id
      );
      if (isOverflow) {
        overflowChips.forEach((chip) => chip.classList.remove('hidden'));
        const catToggle = form.querySelector('[data-category-toggle]') as HTMLButtonElement | null;
        if (catToggle) {
          catToggle.setAttribute('aria-expanded', 'true');
          catToggle.textContent = 'Less';
        }
      }
      chips.forEach((chip) => {
        const isActive = chip.dataset.categoryChip === detail.category_id;
        chip.classList.toggle('bg-accent', isActive);
        chip.classList.toggle('text-white', isActive);
        chip.classList.toggle('bg-base-200', !isActive);
        chip.classList.toggle('text-base-content/70', !isActive);
        chip.classList.toggle('hover:bg-accent/10', !isActive);
        chip.classList.toggle('hover:text-accent', !isActive);
        chip.setAttribute('aria-checked', isActive ? 'true' : 'false');
      });
    }

    // Update date quick-pick active state
    if (detail.transaction_date) {
      const todayStr = form.dataset.today || '';
      const yesterdayStr = form.dataset.yesterday || '';
      const datePickBtns = form.querySelectorAll<HTMLElement>('[data-date-pick]');
      const dateCustomInput = form.querySelector('[data-date-custom]') as HTMLInputElement | null;
      const dateLabel = form.querySelector('[data-date-label]') as HTMLElement | null;

      let activePick = 'custom';
      if (detail.transaction_date === todayStr) activePick = 'today';
      else if (detail.transaction_date === yesterdayStr) activePick = 'yesterday';

      datePickBtns.forEach((btn) => {
        const pick = btn.dataset.datePick || '';
        const isActive = pick === activePick;
        btn.classList.toggle('btn-accent', isActive);
        btn.classList.toggle('text-accent-content', isActive);
        btn.classList.toggle('btn-ghost', !isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      if (dateCustomInput) {
        dateCustomInput.value = detail.transaction_date;
      }
      if (dateLabel) {
        if (activePick === 'custom') {
          const d = new Date(detail.transaction_date + 'T00:00:00');
          dateLabel.textContent = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        } else {
          dateLabel.textContent = 'Other';
        }
      }
    }

    // Update currency badge
    if (detail.currency) {
      const currencyBadge = form.querySelector('[data-currency-badge]') as HTMLElement | null;
      if (currencyBadge) {
        const meta = CURRENCY_META[detail.currency as Currency];
        if (meta) {
          currencyBadge.textContent = `${meta.symbol} ${detail.currency}`;
        }
      }
    }

    // Update submit button text
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    // Update drawer title
    const titleEl = drawer.querySelector('[id$="-title"]');
    if (titleEl) titleEl.textContent = `Edit ${type === 'expense' ? 'Expense' : 'Income'}`;

    drawer.dispatchEvent(new CustomEvent('drawer:open'));
  }) as EventListener);

  function resetEditMode(): void {
    // Restore tabs and recent section
    const tabContainer = drawer.querySelector('[role="tablist"]');
    const recentSection = drawer.querySelector('[data-recent-section]');
    if (tabContainer) (tabContainer as HTMLElement).classList.remove('hidden');
    if (recentSection) (recentSection as HTMLElement).classList.remove('hidden');

    // Reset all forms back to create mode
    drawer.querySelectorAll('form[data-transaction-form]').forEach((form) => {
      const f = form as HTMLFormElement;
      f.dataset.mode = 'create';
      f.dataset.transactionId = '';

      // Reset fields manually (preserve structure)
      const titleInput = f.querySelector('input[name="title"]') as HTMLInputElement | null;
      const amountInput = f.querySelector('input[name="amount"]') as HTMLInputElement | null;
      if (titleInput) titleInput.value = '';
      if (amountInput) amountInput.value = '';

      // Reset category chips
      const chips = f.querySelectorAll<HTMLButtonElement>('[data-category-chip]');
      chips.forEach((chip) => {
        chip.classList.remove('bg-accent', 'text-white');
        chip.classList.add(
          'bg-base-200',
          'text-base-content/70',
          'hover:bg-accent/10',
          'hover:text-accent'
        );
        chip.setAttribute('aria-checked', 'false');
      });
      // Collapse overflow chips
      const overflowChips = f.querySelectorAll<HTMLButtonElement>('[data-category-overflow]');
      overflowChips.forEach((chip) => chip.classList.add('hidden'));
      const catToggle = f.querySelector('[data-category-toggle]') as HTMLButtonElement | null;
      if (catToggle) {
        catToggle.setAttribute('aria-expanded', 'false');
        catToggle.textContent = `+${overflowChips.length} more`;
      }
      const categorySelect = f.querySelector(
        'select[name="category_id"]'
      ) as HTMLSelectElement | null;
      if (categorySelect) categorySelect.value = '';

      // Reset date to today
      const todayStr = f.dataset.today || '';
      const hiddenDate = f.querySelector(
        'input[name="transaction_date"]'
      ) as HTMLInputElement | null;
      const dateCustom = f.querySelector('[data-date-custom]') as HTMLInputElement | null;
      const dateLabelEl = f.querySelector('[data-date-label]') as HTMLElement | null;
      if (hiddenDate) hiddenDate.value = todayStr;
      if (dateCustom) dateCustom.value = todayStr;
      if (dateLabelEl) dateLabelEl.textContent = 'Other';

      const datePickBtns = f.querySelectorAll<HTMLElement>('[data-date-pick]');
      datePickBtns.forEach((btn) => {
        const pick = btn.dataset.datePick || '';
        const isToday = pick === 'today';
        btn.classList.toggle('btn-accent', isToday);
        btn.classList.toggle('text-accent-content', isToday);
        btn.classList.toggle('btn-ghost', !isToday);
        btn.setAttribute('aria-pressed', isToday ? 'true' : 'false');
      });

      // Reset currency badge
      const currencyInput = f.querySelector('input[name="currency"]') as HTMLInputElement | null;
      const currencyBadge = f.querySelector('[data-currency-badge]') as HTMLElement | null;
      if (currencyInput) currencyInput.value = DEFAULT_CURRENCY;
      if (currencyBadge) {
        const meta = CURRENCY_META[DEFAULT_CURRENCY];
        currencyBadge.textContent = `${meta.symbol} ${DEFAULT_CURRENCY}`;
      }

      const submitBtn = f.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      if (submitBtn) submitBtn.textContent = 'Save Entry';
    });

    // Restore drawer title
    const titleEl = drawer.querySelector('[id$="-title"]');
    if (titleEl) titleEl.textContent = 'Add Transaction';
  }

  // Reset when drawer closes
  drawer.addEventListener('drawer-closed', () => {
    const hadSubmissions = hasSubmittedInSession;
    resetEditMode();
    resetSessionState();
    hasSubmittedInSession = false;

    if (hadSubmissions) {
      document.dispatchEvent(new CustomEvent('transactions-changed'));
    }
  });
}

initTransactionDrawer();
document.addEventListener('astro:page-load', initTransactionDrawer);
