export const MOBILE_BUDGET_ACTION_ORDER = [
  'new-budget',
  'categories',
  'import',
  'export',
  'initialize-all',
  'ai-rebalancer',
] as const;

const AI_REBALANCER_ENABLED = false;

export const BUDGET_ACTIONS_MOBILE_SCROLL_CLASS = 'overflow-x-auto overflow-y-hidden';

export function shouldShowAiRebalancer(showAiRebalancerProp: boolean): boolean {
  return AI_REBALANCER_ENABLED && showAiRebalancerProp;
}
