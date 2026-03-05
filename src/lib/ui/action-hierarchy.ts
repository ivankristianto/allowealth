export type ActionViewport = 'mobile' | 'desktop';

export interface HierarchyAction {
  id: string;
  label: string;
}

/**
 * Design contract: maximum visible secondary actions per viewport.
 * Astro consumers hardcode slot content at build time using these caps as guidance.
 * The partition function below is used by tests to verify the contract.
 */
const CAP_BY_VIEWPORT: Record<ActionViewport, number> = {
  mobile: 2,
  desktop: 3,
};

export function partitionActionsForViewport(actions: HierarchyAction[], viewport: ActionViewport) {
  const cap = CAP_BY_VIEWPORT[viewport];
  return {
    visible: actions.slice(0, cap),
    overflow: actions.slice(cap),
  };
}
