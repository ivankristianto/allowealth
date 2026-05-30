# Product

## Register

product

## Users

Allowealth is a personal and family financial application. Its users span a single household with mixed technical skill:

- **The operator** (you / the primary user): runs the household finances day to day. Comfortable with density, tracks accounts, budgets, transactions, and forecasts across multiple currencies (IDR, USD). Wants speed and exactness, not hand-holding.
- **Non-technical family members**: a spouse, partner, or other household members who check balances, log expenses, or review budgets occasionally. They need a calm, legible, low-jargon experience. They are not power users and should never feel lost.
- **Self-hosters**: technical individuals and families who deploy their own instance (Docker, self-host docs). Config-savvy, privacy-motivated, running this as their own financial system of record.

Context of use: at home or on the go, often glancing at money under mild stress (Did the budget hold? Can we afford this?). The job to be done is _understand and steer household finances with confidence_ — track where money is, where it's going, and what's coming.

## Product Purpose

Expense tracking, budgeting, account management, and financial forecasting for a household. It exists to give a family one trustworthy, private place to see and steer their money, owned by them (self-hostable), not rented from a bank or an ad-funded aggregator.

Success looks like: a family member can answer "where do we stand?" in seconds, trusts every number on the screen, and never feels nudged, gamified, or sold to.

## Brand Personality

**Calm, trustworthy, precise.**

- **Voice/tone:** quiet confidence. Plain language, no jargon, no hype. States facts and exact numbers without drama. Reassuring under financial stress, never alarmist or celebratory.
- **Emotional goal:** lower anxiety around money. The interface should feel like a steady hand, banking-grade composure without banking-grade clutter.

## Anti-references

This must explicitly NOT look or feel like:

- **Gamified fintech** (Mint, Robinhood): no confetti, badges, streaks, dopamine nudges, mascots, or gambling-app energy. Money is not a game.
- **Enterprise banking dashboards** (legacy bank portals, SAP/Oracle): no heavy corporate chrome, dense gray clutter, or cold institutional UI.
- **Generic SaaS templates**: no cream-and-purple gradients, hero-metric card rows, identical icon grids, or Stripe-clone landing aesthetics.
- **Crypto / neon dark**: no neon-on-black, glowing gradients, or hype trading-app energy. This is serious, long-horizon money.

## Design Principles

1. **Calm under money pressure.** Every screen lowers anxiety. No drama, no urgency theater, never gamify financial behavior. The default emotional register is composure.
2. **Precision is trust.** Show exact numbers honestly. Never round in a way that hides the truth, never fake-fill with placeholder optimism. Accuracy is the brand; an honest negative beats a flattering guess.
3. **Serve the operator and the bystander at once.** Progressive density: power-user efficiency where the operator works (tables, keyboard, multi-currency), calm legibility everywhere a non-technical family member might land. Density is earned, not default.
4. **Quiet confidence over decoration.** The design earns trust by getting out of the way, not by showing off. Restraint is the aesthetic; ornament must justify itself.
5. **The household's data, with dignity.** Shared finances are sensitive. Clarity and respect over cleverness; private by default (self-hostable), honest about state (demo mode, empty states), never manipulative.

## Accessibility & Inclusion

- **Target: WCAG 2.1 AA**, already enforced in the existing token system (semantic colors documented with ≥4.5:1 contrast ratios in both light and dark modes).
- **Both themes are first-class.** Light mode uses 600–700 tokens for AA on white; dark mode shifts to 400–500 desaturated to avoid neon glare. Neither is a default-by-vibe; both are maintained.
- **Mixed-skill household:** plain language, no unexplained jargon, clear labels on icon-only controls, low cognitive load for occasional users.
- **Reduced motion:** honor `prefers-reduced-motion`; motion is purposeful and never required to understand state.
- **Color is never the only signal:** pair status color with text/icon (over-budget, currency, account type) for color-blind users.
