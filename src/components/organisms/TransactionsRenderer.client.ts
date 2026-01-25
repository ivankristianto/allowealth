/**
 * Transactions Renderer
 *
 * DOM rendering functions for the transactions page.
 * Uses Motion for animations and respects prefers-reduced-motion.
 */

import { animate } from 'motion';
import { formatCurrency, animationDuration } from '@/lib/tokens';
import type { TransactionOutput } from '@/lib/types/transaction';
import type { PaginationState, SummaryState } from '@/lib/stores/transactionsDataStore';

// Check if user prefers reduced motion
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animation durations
const ANIMATION_DURATION = prefersReducedMotion ? 0 : animationDuration.normal;
const STAGGER_DELAY = prefersReducedMotion ? 0 : 0.05;

/**
 * Category icon and color mapping
 */
const getCategoryMeta = (
  categoryName: string,
  type: 'income' | 'expense'
): { iconSvg: string; variant: string } => {
  const normalized = categoryName.toLowerCase();

  // Default icon SVGs (Lucide icons inlined)
  const icons = {
    banknote: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
    shoppingBasket: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="m4.5 15.5h15"/><path d="m5 11 4-7"/><path d="m9 11 1 9"/></svg>`,
    zap: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    film: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`,
    car: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    pill: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
    utensils: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    house: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    briefcase: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    wallet: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`,
    creditCard: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
    pencil: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
  };

  if (type === 'income') {
    return { iconSvg: icons.banknote, variant: 'success' };
  }

  if (
    normalized.includes('grocery') ||
    normalized.includes('market') ||
    normalized.includes('food')
  ) {
    return { iconSvg: icons.shoppingBasket, variant: 'warning' };
  }
  if (
    normalized.includes('utility') ||
    normalized.includes('electric') ||
    normalized.includes('water')
  ) {
    return { iconSvg: icons.zap, variant: 'info' };
  }
  if (normalized.includes('entertainment') || normalized.includes('movie')) {
    return { iconSvg: icons.film, variant: 'error' };
  }
  if (
    normalized.includes('transport') ||
    normalized.includes('uber') ||
    normalized.includes('taxi')
  ) {
    return { iconSvg: icons.car, variant: 'accent' };
  }
  if (normalized.includes('health') || normalized.includes('pharmacy')) {
    return { iconSvg: icons.pill, variant: 'primary' };
  }
  if (normalized.includes('dining') || normalized.includes('restaurant')) {
    return { iconSvg: icons.utensils, variant: 'warning' };
  }
  if (normalized.includes('housing') || normalized.includes('rent')) {
    return { iconSvg: icons.house, variant: 'primary' };
  }
  if (normalized.includes('freelance') || normalized.includes('contract')) {
    return { iconSvg: icons.briefcase, variant: 'info' };
  }

  return { iconSvg: icons.wallet, variant: type === 'expense' ? 'error' : 'success' };
};

/**
 * Get variant background classes
 */
function getVariantClasses(variant: string): string {
  const variants: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
    info: 'bg-info/10 text-info',
    neutral: 'bg-base-200 text-base-content',
  };
  return variants[variant] || variants.neutral;
}

/**
 * Format date
 */
function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Create a transaction card element matching TransactionCard.astro structure
 * with responsive mobile/desktop layouts
 */
function createTransactionRow(transaction: TransactionOutput): HTMLElement {
  const amount = parseFloat(transaction.amount) || 0;
  const isExpense = transaction.type === 'expense';
  const primaryText = transaction.description?.trim() || transaction.category.name;
  const categoryMeta = getCategoryMeta(transaction.category.name, transaction.type);
  const formattedDate = formatDate(transaction.transaction_date);

  // Prepare transaction data for edit action
  const transactionDataJson = JSON.stringify({
    id: transaction.id,
    type: transaction.type,
    title: transaction.description,
    amount: transaction.amount,
    currency: transaction.currency,
    category_id: transaction.category.id,
    payment_method_id: transaction.payment_method.id,
    transaction_date: new Date(transaction.transaction_date).toISOString().split('T')[0],
  });

  const article = document.createElement('article');
  article.className = `group p-3 sm:p-4 transition-all border-l-4 border-transparent ${
    isExpense
      ? 'hover:border-error/30 active:border-error/30'
      : 'hover:border-success/30 active:border-success/30'
  } hover:bg-base-200/40 active:bg-base-200/40`;
  article.setAttribute('data-transaction-card', '');
  article.setAttribute('data-transaction-id', transaction.id);
  article.setAttribute(
    'aria-label',
    `${transaction.type === 'income' ? 'Income' : 'Expense'}: ${primaryText}, ${amount} ${transaction.currency}`
  );

  // ===== MOBILE LAYOUT (shown below sm breakpoint) =====
  const mobileLayout = document.createElement('div');
  mobileLayout.className = 'sm:hidden';

  // Mobile: Top row with icon, title, category badge, and dropdown
  const mobileTopRow = document.createElement('div');
  mobileTopRow.className = 'flex items-start gap-3';

  const mobileIconBadge = document.createElement('div');
  mobileIconBadge.className = `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getVariantClasses(categoryMeta.variant)}`;
  mobileIconBadge.innerHTML = categoryMeta.iconSvg;
  mobileIconBadge.setAttribute('aria-hidden', 'true');

  const mobileTextContainer = document.createElement('div');
  mobileTextContainer.className = 'flex-1 min-w-0';

  const mobilePrimaryText = document.createElement('div');
  mobilePrimaryText.className = 'font-bold text-base tracking-tight leading-tight break-words';
  mobilePrimaryText.textContent = primaryText;

  const mobileCategoryWrapper = document.createElement('div');
  mobileCategoryWrapper.className = 'mt-1';

  const mobileCategoryBadge = document.createElement('span');
  mobileCategoryBadge.className =
    'font-bold tracking-widest uppercase text-[10px] bg-base-200 px-1.5 py-0.5 rounded text-base-content/60';
  mobileCategoryBadge.textContent = transaction.category.name;

  mobileCategoryWrapper.appendChild(mobileCategoryBadge);
  mobileTextContainer.appendChild(mobilePrimaryText);
  mobileTextContainer.appendChild(mobileCategoryWrapper);

  // Mobile dropdown menu
  const mobileDropdown = document.createElement('div');
  mobileDropdown.className = 'dropdown dropdown-end';

  const mobileDropdownBtn = document.createElement('button');
  mobileDropdownBtn.type = 'button';
  mobileDropdownBtn.tabIndex = 0;
  mobileDropdownBtn.className = 'btn btn-ghost btn-sm btn-square min-h-[44px] min-w-[44px]';
  mobileDropdownBtn.setAttribute('aria-label', 'Transaction actions');
  mobileDropdownBtn.setAttribute('aria-haspopup', 'menu');
  mobileDropdownBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`;

  const mobileDropdownMenu = document.createElement('ul');
  mobileDropdownMenu.tabIndex = 0;
  mobileDropdownMenu.className =
    'dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-40 border border-base-300';
  mobileDropdownMenu.setAttribute('role', 'menu');

  const mobileEditLi = document.createElement('li');
  mobileEditLi.setAttribute('role', 'none');
  const mobileEditBtn = document.createElement('button');
  mobileEditBtn.type = 'button';
  mobileEditBtn.setAttribute('role', 'menuitem');
  mobileEditBtn.className = 'flex items-center gap-2';
  mobileEditBtn.setAttribute('aria-label', `Edit transaction: ${primaryText}`);
  mobileEditBtn.setAttribute('data-edit-transaction', transaction.id);
  mobileEditBtn.setAttribute('data-transaction-data', transactionDataJson);
  mobileEditBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg> Edit`;
  mobileEditLi.appendChild(mobileEditBtn);

  const mobileDeleteLi = document.createElement('li');
  mobileDeleteLi.setAttribute('role', 'none');
  const mobileDeleteBtn = document.createElement('button');
  mobileDeleteBtn.type = 'button';
  mobileDeleteBtn.setAttribute('role', 'menuitem');
  mobileDeleteBtn.className = 'flex items-center gap-2 text-error';
  mobileDeleteBtn.setAttribute('aria-label', `Delete transaction: ${primaryText}`);
  mobileDeleteBtn.setAttribute('data-delete-transaction', transaction.id);
  mobileDeleteBtn.setAttribute('data-transaction-details', JSON.stringify(transaction));
  mobileDeleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg> Delete`;
  mobileDeleteLi.appendChild(mobileDeleteBtn);

  mobileDropdownMenu.appendChild(mobileEditLi);
  mobileDropdownMenu.appendChild(mobileDeleteLi);
  mobileDropdown.appendChild(mobileDropdownBtn);
  mobileDropdown.appendChild(mobileDropdownMenu);

  mobileTopRow.appendChild(mobileIconBadge);
  mobileTopRow.appendChild(mobileTextContainer);
  mobileTopRow.appendChild(mobileDropdown);

  // Mobile: Bottom row with date, payment method, and amount
  const mobileBottomRow = document.createElement('div');
  mobileBottomRow.className = 'mt-2.5 flex items-end justify-between pl-[52px]';

  const mobileMetaContainer = document.createElement('div');
  mobileMetaContainer.className = 'text-[10px] text-base-content/50 space-y-1';

  const mobileDateEl = document.createElement('time');
  mobileDateEl.setAttribute('datetime', new Date(transaction.transaction_date).toISOString());
  mobileDateEl.className = 'block font-medium uppercase tracking-widest';
  mobileDateEl.textContent = formattedDate;

  const mobilePaymentMethod = document.createElement('div');
  mobilePaymentMethod.className = 'flex items-center gap-1.5 uppercase tracking-widest';
  mobilePaymentMethod.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
  const mobilePaymentSpan = document.createElement('span');
  mobilePaymentSpan.textContent = transaction.payment_method.name;
  mobilePaymentMethod.appendChild(mobilePaymentSpan);

  mobileMetaContainer.appendChild(mobileDateEl);
  mobileMetaContainer.appendChild(mobilePaymentMethod);

  const mobileAmount = document.createElement('span');
  mobileAmount.className = `font-bold tracking-tight text-base ${isExpense ? 'text-error' : 'text-success'}`;
  mobileAmount.textContent = formatCurrency(Math.abs(amount), transaction.currency);

  mobileBottomRow.appendChild(mobileMetaContainer);
  mobileBottomRow.appendChild(mobileAmount);

  mobileLayout.appendChild(mobileTopRow);
  mobileLayout.appendChild(mobileBottomRow);

  // ===== DESKTOP LAYOUT (shown at sm and above) =====
  const desktopLayout = document.createElement('div');
  desktopLayout.className = 'hidden sm:flex items-center gap-4 lg:gap-5';

  // Desktop: Date
  const desktopDateDiv = document.createElement('div');
  desktopDateDiv.className = 'flex-shrink-0 w-20 lg:w-24 text-sm';
  const desktopDateInner = document.createElement('div');
  desktopDateInner.className = 'font-medium';
  desktopDateInner.textContent = formattedDate;
  desktopDateDiv.appendChild(desktopDateInner);

  // Desktop: Category & Description
  const desktopMainDiv = document.createElement('div');
  desktopMainDiv.className = 'flex-1 min-w-0 flex items-center gap-4';

  const desktopIconBadge = document.createElement('div');
  desktopIconBadge.className = `w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-2 ${getVariantClasses(categoryMeta.variant)}`;
  desktopIconBadge.innerHTML = categoryMeta.iconSvg;
  desktopIconBadge.setAttribute('aria-hidden', 'true');

  const desktopTextDiv = document.createElement('div');
  desktopTextDiv.className = 'min-w-0';

  const desktopPrimaryText = document.createElement('div');
  desktopPrimaryText.className = 'font-bold tracking-tight truncate text-base leading-none';
  desktopPrimaryText.textContent = primaryText;

  const desktopCategoryWrapper = document.createElement('div');
  desktopCategoryWrapper.className = 'mt-2 flex flex-wrap items-center gap-2 leading-none';

  const desktopCategoryBadge = document.createElement('span');
  desktopCategoryBadge.className =
    'text-[10px] font-bold tracking-widest uppercase text-base-content/60 bg-base-200 px-2 py-0.5 rounded';
  desktopCategoryBadge.textContent = transaction.category.name;

  desktopCategoryWrapper.appendChild(desktopCategoryBadge);
  desktopTextDiv.appendChild(desktopPrimaryText);
  desktopTextDiv.appendChild(desktopCategoryWrapper);
  desktopMainDiv.appendChild(desktopIconBadge);
  desktopMainDiv.appendChild(desktopTextDiv);

  // Desktop: Payment Method
  const desktopPaymentDiv = document.createElement('div');
  desktopPaymentDiv.className = 'flex-shrink-0';
  const desktopPaymentInner = document.createElement('div');
  desktopPaymentInner.className =
    'flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-base-content/60';
  desktopPaymentInner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
  const desktopPaymentSpan = document.createElement('span');
  desktopPaymentSpan.textContent = transaction.payment_method.name;
  desktopPaymentInner.appendChild(desktopPaymentSpan);
  desktopPaymentDiv.appendChild(desktopPaymentInner);

  // Desktop: Amount
  const desktopAmountDiv = document.createElement('div');
  desktopAmountDiv.className = 'flex-shrink-0 text-right';
  const desktopAmountText = document.createElement('span');
  desktopAmountText.className = `font-bold tracking-tight text-base ${isExpense ? 'text-error' : 'text-success'}`;
  desktopAmountText.textContent = formatCurrency(Math.abs(amount), transaction.currency);
  desktopAmountDiv.appendChild(desktopAmountText);

  // Desktop: Actions
  const desktopActionsDiv = document.createElement('div');
  desktopActionsDiv.className = 'flex-shrink-0 flex gap-1';

  const desktopEditBtn = document.createElement('button');
  desktopEditBtn.type = 'button';
  desktopEditBtn.className = 'btn btn-ghost btn-sm';
  desktopEditBtn.setAttribute('aria-label', `Edit transaction: ${primaryText}`);
  desktopEditBtn.setAttribute('data-edit-transaction', transaction.id);
  desktopEditBtn.setAttribute('data-transaction-data', transactionDataJson);
  desktopEditBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;

  const desktopDeleteBtn = document.createElement('button');
  desktopDeleteBtn.type = 'button';
  desktopDeleteBtn.className = 'btn btn-ghost btn-sm text-error';
  desktopDeleteBtn.setAttribute('aria-label', `Delete transaction: ${primaryText}`);
  desktopDeleteBtn.setAttribute('data-delete-transaction', transaction.id);
  desktopDeleteBtn.setAttribute('data-transaction-details', JSON.stringify(transaction));
  desktopDeleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;

  desktopActionsDiv.appendChild(desktopEditBtn);
  desktopActionsDiv.appendChild(desktopDeleteBtn);

  // Assemble desktop layout
  desktopLayout.appendChild(desktopDateDiv);
  desktopLayout.appendChild(desktopMainDiv);
  desktopLayout.appendChild(desktopPaymentDiv);
  desktopLayout.appendChild(desktopAmountDiv);
  desktopLayout.appendChild(desktopActionsDiv);

  // Assemble article with both layouts
  article.appendChild(mobileLayout);
  article.appendChild(desktopLayout);

  return article;
}

/**
 * Create empty state element
 */
function createEmptyState(): HTMLElement {
  const div = document.createElement('div');
  div.id = 'empty-state';
  div.className = 'py-24 text-center';
  div.innerHTML = `
    <div class="w-20 h-20 bg-base-200 mx-auto rounded-3xl flex items-center justify-center text-base-content/30 mb-6 shadow-inner">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>
    </div>
    <h4 class="text-lg font-bold text-base-content mb-2">No matching transactions</h4>
    <p class="text-base-content/60 font-medium max-w-xs mx-auto mb-6">
      Try adjusting your filters or search terms to find what you're looking for.
    </p>
    <a href="/transactions" class="btn btn-outline btn-sm gap-2" data-reset-filters>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
      Reset filters
    </a>
  `;
  return div;
}

/**
 * Render transaction list
 */
export function renderTransactionList(transactions: TransactionOutput[]): void {
  const listContainer = document.getElementById('transaction-list');
  if (!listContainer) {
    console.error('[TransactionsRenderer] #transaction-list container not found!');
    return;
  }

  // Clear existing content
  listContainer.innerHTML = '';

  if (transactions.length === 0) {
    listContainer.appendChild(createEmptyState());
    return;
  }

  // Create rows with error handling
  const rows: HTMLElement[] = [];
  for (let i = 0; i < transactions.length; i++) {
    try {
      const row = createTransactionRow(transactions[i]);
      rows.push(row);
    } catch (err) {
      console.error(`[TransactionsRenderer] Error creating row ${i}:`, err, transactions[i]);
    }
  }

  // Add rows to container
  rows.forEach((row) => listContainer.appendChild(row));

  // Animate rows in with stagger
  if (!prefersReducedMotion) {
    rows.forEach((row, index) => {
      animate(
        row,
        { opacity: [0, 1], y: [10, 0] },
        { duration: ANIMATION_DURATION, delay: index * STAGGER_DELAY }
      );
    });
  }

  // Announce to screen readers
  const liveRegion = document.getElementById('transactions-live-region');
  if (liveRegion) {
    liveRegion.textContent = `Showing ${transactions.length} transactions`;
  }
}

/**
 * Render summary cards
 */
export function renderSummaryCards(summary: SummaryState, currency: 'IDR' | 'USD'): void {
  const incomeEl = document.querySelector('[data-summary-income]');
  const expenseEl = document.querySelector('[data-summary-expense]');
  const netEl = document.querySelector('[data-summary-net]');
  const countEl = document.querySelector('[data-summary-count]');
  const periodEls = document.querySelectorAll('[data-summary-period]');

  if (incomeEl) {
    incomeEl.textContent = formatCurrency(summary.income, currency);
  }

  if (expenseEl) {
    expenseEl.textContent = formatCurrency(summary.expenses, currency);
  }

  if (netEl) {
    const netSavings = summary.income - summary.expenses;
    netEl.textContent = formatCurrency(netSavings, currency);

    // Update color class (text-success for positive, text-error for negative)
    netEl.classList.remove('text-primary', 'text-success', 'text-error');
    netEl.classList.add(netSavings >= 0 ? 'text-success' : 'text-error');
  }

  if (countEl) {
    countEl.textContent = `${summary.transactionCount} items`;
  }

  // Update period labels (on income and net savings cards)
  if (summary.periodLabel) {
    periodEls.forEach((el) => {
      el.textContent = summary.periodLabel!;
    });
  }
}

/**
 * Render pagination
 */
export function renderPagination(pagination: PaginationState): void {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  const { total, limit, page, totalPages } = pagination;

  // Hide if not enough items
  if (total <= limit) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  container.setAttribute('data-total', String(total));
  container.setAttribute('data-current-page', String(page));

  // Update info text
  const infoEl = container.querySelector('[data-pagination-info]');
  if (infoEl) {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    infoEl.textContent = `Showing ${start} to ${end} of ${total} transactions`;
  }

  // Update current page display
  const currentEl = container.querySelector('[data-pagination-current]');
  if (currentEl) {
    currentEl.textContent = `Page ${page} of ${totalPages}`;
  }

  // Update button states
  const prevBtn = container.querySelector('[data-pagination-prev]') as HTMLButtonElement;
  const nextBtn = container.querySelector('[data-pagination-next]') as HTMLButtonElement;

  if (prevBtn) {
    prevBtn.disabled = page <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = page >= totalPages;
  }
}

/**
 * Show loading state for summary cards
 */
export function showSummaryLoadingState(): void {
  const summaryContainer = document.getElementById('summary-cards-container');
  const summarySkeleton = document.getElementById('summary-cards-skeleton');

  if (summaryContainer) {
    summaryContainer.classList.add('hidden');
    summaryContainer.setAttribute('aria-hidden', 'true');
  }
  if (summarySkeleton) {
    summarySkeleton.classList.remove('hidden');
    summarySkeleton.setAttribute('aria-busy', 'true');
    summarySkeleton.setAttribute('aria-label', 'Loading summary data...');
  }
}

/**
 * Hide loading state for summary cards
 */
export function hideSummaryLoadingState(): void {
  const summaryContainer = document.getElementById('summary-cards-container');
  const summarySkeleton = document.getElementById('summary-cards-skeleton');

  if (summarySkeleton) {
    summarySkeleton.classList.add('hidden');
    summarySkeleton.removeAttribute('aria-busy');
    summarySkeleton.removeAttribute('aria-label');
  }
  if (summaryContainer) {
    summaryContainer.classList.remove('hidden');
    summaryContainer.removeAttribute('aria-hidden');
  }
}

/**
 * Show loading state
 */
export function showLoadingState(): void {
  const skeleton = document.getElementById('transaction-list-skeleton');
  const list = document.getElementById('transaction-list');

  if (skeleton) skeleton.classList.remove('hidden');
  if (list) list.classList.add('opacity-50', 'pointer-events-none');

  // Show summary cards loading state
  showSummaryLoadingState();

  // Announce to screen readers
  const liveRegion = document.getElementById('transactions-live-region');
  if (liveRegion) {
    liveRegion.textContent = 'Loading transactions...';
  }
}

/**
 * Hide loading state
 */
export function hideLoadingState(): void {
  const skeleton = document.getElementById('transaction-list-skeleton');
  const list = document.getElementById('transaction-list');

  if (skeleton) skeleton.classList.add('hidden');
  if (list) list.classList.remove('opacity-50', 'pointer-events-none');

  // Hide summary cards loading state
  hideSummaryLoadingState();
}

/**
 * Animate row removal
 */
export async function animateRowRemoval(row: HTMLElement): Promise<void> {
  if (prefersReducedMotion) {
    row.remove();
    return;
  }

  await animate(
    row,
    {
      opacity: [1, 0],
      height: [row.offsetHeight, 0],
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
    },
    { duration: ANIMATION_DURATION }
  ).finished;

  row.remove();
}
