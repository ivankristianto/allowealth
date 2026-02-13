export const MOBILE_BUDGET_ACTION_ORDER = [
  'new-budget',
  'categories',
  'import',
  'export',
  'copy',
  'initialize-all',
  'ai-rebalancer',
] as const;

const AI_REBALANCER_ENABLED = false;

export const BUDGET_ACTIONS_MOBILE_SCROLL_CLASS = 'overflow-x-auto overflow-y-hidden';
export const BUDGET_ACTIONS_DESKTOP_CARD_CLASS = 'md:overflow-visible md:rounded-2xl';

export function shouldShowAiRebalancer(showAiRebalancerProp: boolean): boolean {
  return AI_REBALANCER_ENABLED && showAiRebalancerProp;
}
