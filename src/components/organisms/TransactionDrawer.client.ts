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

  drawer.addEventListener('drawer-closed', resetSessionState);

  document.addEventListener('open-transaction-drawer', () => {
    drawer.dispatchEvent(new CustomEvent('drawer:open'));
  });
}

initTransactionDrawer();
document.addEventListener('astro:page-load', initTransactionDrawer);
