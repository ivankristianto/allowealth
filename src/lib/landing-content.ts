/**
 * Landing Page Content Data
 * Centralized content for public landing pages
 */

// ============================================================================
// Types
// ============================================================================

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
}

export interface FooterLinkSection {
  title: string;
  links: FooterLink[];
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  icon: string; // Lucide icon name
}

export interface ShowcaseItem {
  id: string;
  icon: string; // Lucide icon name
  iconColor: string; // DaisyUI color class
  iconBg: string; // DaisyUI background class
  title: string;
  titleHighlight: string;
  highlightColor: string; // Text color class for highlight
  description: string;
  features: string[];
  featureIconColor: string;
  imageUrl: string;
  imageAlt: string;
  gradientClass: string; // Gradient overlay class
  reverse?: boolean; // Alternate layout direction
}

export interface FeatureGridItem {
  id: string;
  icon: string; // Lucide icon name
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  colSpan: string; // Tailwind grid column span
  variant: 'light' | 'dark'; // Card theme
  size?: 'normal' | 'large'; // Text size variant
}

// ============================================================================
// Pricing Data
// ============================================================================

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: 'Rp 0',
    description: 'The base ledger for individuals.',
    features: [
      'Manual Transaction Logging',
      '3 Asset Accounts',
      'Single User Access',
      'Basic Reports',
    ],
  },
  {
    name: 'Pro',
    price: 'Rp 99k',
    description: 'The complete family headquarters.',
    featured: true,
    features: [
      'Unlimited Assets',
      'AI Receipt Scanning',
      'Global Currency Sync',
      'Advanced 30-Year Forecasts',
      'Premium Dashboard Insights',
    ],
  },
  {
    name: 'Expert',
    price: 'Rp 249k',
    description: 'For high-net-worth households.',
    features: [
      'Up to 10 Members',
      'Custom Audit Logs',
      'Priority Support',
      'API Data Connectors',
      'Investment Portfolio Hub',
    ],
  },
];

// ============================================================================
// Footer Data
// ============================================================================

export const footerLinks: FooterLinkSection[] = [
  {
    title: 'Ecosystem',
    links: [
      { label: 'Wealth View', href: '#' },
      { label: 'AI Receipt Scan', href: '#' },
      { label: 'Goal Forecast', href: '#' },
      { label: 'Audit Logs', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Finance API', href: '#' },
      { label: 'Security Audit', href: '#' },
      { label: 'Tax Integration', href: '#' },
      { label: 'Help Center', href: '#' },
    ],
  },
  {
    title: 'Privacy',
    links: [
      { label: 'Data Protocol', href: '#' },
      { label: 'Trust Center', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'GDPR Sync', href: '#' },
    ],
  },
];

export const socialLinks: SocialLink[] = [
  { id: 'facebook', label: 'Facebook', href: '#', icon: 'Facebook' },
  { id: 'instagram', label: 'Instagram', href: '#', icon: 'Instagram' },
  { id: 'twitter', label: 'Twitter', href: '#', icon: 'Twitter' },
  { id: 'linkedin', label: 'LinkedIn', href: '#', icon: 'Linkedin' },
];

export const legalLinks: FooterLink[] = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Contact', href: '/contact' },
];

// ============================================================================
// Showcase Data
// ============================================================================

export const showcaseItems: ShowcaseItem[] = [
  {
    id: 'dashboard',
    icon: 'LayoutDashboard',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Global Wealth,',
    titleHighlight: 'Unified View.',
    highlightColor: 'text-primary',
    description:
      "Connect your BCA, Mandiri, Chase, and stock portfolios in one encrypted space. Our dashboard provides a real-time health score of your family's liquidity and asset distribution.",
    features: [
      'Multi-currency support (IDR/USD/EUR)',
      'Real-time portfolio rebalancing',
      'Liquidity reserve monitoring',
    ],
    featureIconColor: 'text-primary',
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Financial Dashboard',
    gradientClass: 'from-primary/20 to-transparent',
  },
  {
    id: 'ai-vision',
    icon: 'Sparkles',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10',
    title: 'Receipt Vision.',
    titleHighlight: 'Zero Data Entry.',
    highlightColor: 'text-accent',
    description:
      'Leverage Gemini 3 Pro to scan paper receipts instantly. Our AI identifies the merchant, extracts the amount, and categorizes the spend into your family budget before you leave the store.',
    features: [
      'Instant merchant identification',
      'Automatic tax and VAT extraction',
      'Categorization with 99% accuracy',
    ],
    featureIconColor: 'text-accent',
    imageUrl:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'AI Receipt Scanning',
    gradientClass: 'from-accent/20 to-transparent',
    reverse: true,
  },
  {
    id: 'forecasting',
    icon: 'TrendingUp',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Predictive',
    titleHighlight: 'Futures.',
    highlightColor: 'text-success',
    description:
      'Stop wondering "what if." Our predictive modeling tool allows you to simulate major life events—like a home purchase or retirement—against your current growth trajectory.',
    features: [
      '30-year wealth projections',
      'Inflation-adjusted modeling',
      'Goal-based savings simulation',
    ],
    featureIconColor: 'text-success',
    imageUrl:
      'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Financial Forecasting',
    gradientClass: 'from-success/20 to-transparent',
  },
];

// ============================================================================
// Features Grid Data
// ============================================================================

export const featureGridItems: FeatureGridItem[] = [
  {
    id: 'global-reach',
    icon: 'Globe',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    title: 'Global Reach',
    description:
      'Unified tracking across multiple countries and currencies with real-time FX sync.',
    colSpan: 'md:col-span-4',
    variant: 'light',
  },
  {
    id: 'collaboration',
    icon: 'Users',
    iconColor: 'text-white',
    iconBg: 'bg-white/10',
    title: 'Household Collaboration',
    description:
      'Assign specific budgets to family members, track shared expenses, and manage access with granular roles and permissions.',
    colSpan: 'md:col-span-8',
    variant: 'dark',
    size: 'large',
  },
  {
    id: 'encryption',
    icon: 'Shield',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
    title: 'Vault Encryption',
    description:
      'Your data is yours. AES-256 bank-grade encryption ensures only authorized family members can access sensitive ledger details.',
    colSpan: 'md:col-span-7',
    variant: 'light',
  },
  {
    id: 'intelligence',
    icon: 'Lightbulb',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/5',
    title: 'Deep Intelligence',
    description:
      'Monthly reports that analyze your velocity, highlighting areas where your family can optimize capital efficiency.',
    colSpan: 'md:col-span-5',
    variant: 'light',
  },
];

// ============================================================================
// Hero Content
// ============================================================================

export const heroContent = {
  badge: 'Powered by Gemini 3 Pro AI',
  title: 'Master the',
  titleHighlightPrefix: 'Family ',
  titleHighlight: 'Ledger.',
  description:
    'Enterprise-grade wealth management, refined for the modern household. Track global assets, forecast futures, and automate spend review with advanced AI.',
  ctaGuest: 'Start Your Free Ledger',
  ctaLoggedIn: 'Go to Dashboard',
  ctaSecondary: 'Interactive Demo',
};

// ============================================================================
// Brand Content
// ============================================================================

export const brandContent = {
  name: 'allowealth',
  tagline:
    "We're on a mission to bring institutional-grade financial intelligence to the dining room table.",
  copyright: `© ${new Date().getFullYear()} allowealth Global Dashboard. Proprietary AES-256 Vault technology protected.`,
};
