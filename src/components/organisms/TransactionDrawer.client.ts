import { animate } from 'motion';
import { formatCurrency } from '@/lib/formatting/currency-client';

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
  const expenseIconTemplate = document.getElementById('icon-expense');
  const incomeIconTemplate = document.getElementById('icon-income');

  let sessionCount = 0;

  const formatMoney = (amount: number | string, currency = 'IDR'): string => {
    return formatCurrency(Number(amount), currency);
  };

  const resetSessionState = (): void => {
    if (!list || !emptyState || !countBadge) return;
    sessionCount = 0;
    countBadge.innerText = '0';
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
        'bg-base-100 rounded-2xl shadow-sm border border-base-200 p-3 flex items-center justify-between gap-3 overflow-hidden relative';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'flex items-center gap-3 min-w-0 flex-1';

      const iconContainer = document.createElement('div');
      iconContainer.appendChild(iconClone);
      contentDiv.appendChild(iconContainer);

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'min-w-0 flex-1';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'font-bold text-sm text-primary truncate';
      titleDiv.textContent = data.description || data.title || '';

      const metaDiv = document.createElement('div');
      metaDiv.className = 'text-xs text-neutral font-medium';

      const categorySelect = form.querySelector(
        'select[name="category_id"]'
      ) as HTMLSelectElement | null;
      const categoryOption = categorySelect?.querySelector(
        `option[value="${data.category_id}"]`
      ) as HTMLOptionElement | null;
      const categoryLabel = categoryOption?.textContent || data.category_id;
      metaDiv.textContent = `${data.transaction_date} • ${categoryLabel}`;

      detailsDiv.append(titleDiv, metaDiv);
      contentDiv.appendChild(detailsDiv);
      li.appendChild(contentDiv);

      const amountDiv = document.createElement('div');
      amountDiv.className = `font-bold text-sm whitespace-nowrap ${data.type === 'expense' ? 'text-error' : 'text-success'}`;
      amountDiv.innerText = `${data.type === 'expense' ? '-' : '+'} ${formatMoney(data.amount, data.currency)}`;
      li.appendChild(amountDiv);

      list.insertBefore(li, list.firstChild);
      animate(li, { opacity: [0, 1], x: [20, 0], height: [0, 'auto'] }, { duration: 0.4 });

      sessionCount += 1;
      countBadge.innerText = String(sessionCount);
    };

    form.addEventListener('transaction-submitted', handleTransactionSubmitted);
  });

  // Open drawer in create mode
  document.addEventListener('open-transaction-drawer', ((event: CustomEvent<OpenDrawerDetail>) => {
    resetEditMode();
    // If a specific tab is requested, switch to it
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
    const recentSection: HTMLElement | null = drawer.querySelector('.mt-8.pt-6');
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
    setInput('currency', detail.currency ?? 'IDR');
    setInput('category_id', detail.category_id ?? '');
    setInput('asset_id', detail.asset_id ?? '');
    setInput('transaction_date', detail.transaction_date ?? '');

    // Update submit button text
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    // Update cancel button to close drawer
    const cancelBtn = form.querySelector('[data-close-modal]') as HTMLButtonElement | null;
    if (cancelBtn) {
      cancelBtn.onclick = (e) => {
        e.preventDefault();
        resetEditMode();
        drawer.dispatchEvent(new CustomEvent('drawer:close'));
      };
    }

    // Update drawer title
    const titleEl = drawer.querySelector('[id$="-title"]');
    if (titleEl) titleEl.textContent = `Edit ${type === 'expense' ? 'Expense' : 'Income'}`;

    drawer.dispatchEvent(new CustomEvent('drawer:open'));
  }) as EventListener);

  function resetEditMode(): void {
    // Restore tabs and recent section
    const tabContainer = drawer.querySelector('[role="tablist"]');
    const recentSection = drawer.querySelector('.mt-8.pt-6');
    if (tabContainer) (tabContainer as HTMLElement).classList.remove('hidden');
    if (recentSection) (recentSection as HTMLElement).classList.remove('hidden');

    // Reset all forms back to create mode
    drawer.querySelectorAll('form[data-transaction-form]').forEach((form) => {
      const f = form as HTMLFormElement;
      f.dataset.mode = 'create';
      f.dataset.transactionId = '';
      f.reset();

      const submitBtn = f.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      if (submitBtn) submitBtn.textContent = 'Save Entry';

      const cancelBtn = f.querySelector('[data-close-modal]') as HTMLButtonElement | null;
      if (cancelBtn) cancelBtn.onclick = null;
    });

    // Restore drawer title
    const titleEl = drawer.querySelector('[id$="-title"]');
    if (titleEl) titleEl.textContent = 'Add Transaction';
  }

  // Reset when drawer closes
  drawer.addEventListener('drawer-closed', () => {
    resetEditMode();
    resetSessionState();
  });
}

initTransactionDrawer();
document.addEventListener('astro:page-load', initTransactionDrawer);
