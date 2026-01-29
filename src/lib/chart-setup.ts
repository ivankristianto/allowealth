/**
 * Chart.js Setup Module
 *
 * Registers only the chart types and plugins needed by the application.
 * This enables tree-shaking to remove unused chart types from the bundle.
 *
 * Bundle Impact:
 * - Before (chart.js/auto): ~207 kB (70.87 kB gzipped)
 * - After (explicit imports): ~60-80 kB (~25-30 kB gzipped)
 * - Reduction: ~120-140 kB (~40-45 kB gzipped)
 *
 * Current Usage by Component:
 * - SpendingChart: DoughnutController, ArcElement
 * - ResourceAllocationChart: DoughnutController, ArcElement
 * - WealthTrajectory: LineController, LineElement, PointElement
 * - FinancialVelocityChart: BarController, BarElement
 *
 * Scales (used by bar and line charts):
 * - CategoryScale: X-axis labels
 * - LinearScale: Y-axis numeric values
 *
 * Plugins (used by all charts):
 * - Tooltip: Interactive tooltips on hover
 * - Legend: Chart legend
 *
 * @module chart-setup
 */

import {
  Chart,
  // Controllers
  DoughnutController,
  LineController,
  BarController,
  // Elements
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  // Scales
  CategoryScale,
  LinearScale,
  // Plugins
  Tooltip,
  Legend,
  // Types
  type ChartConfiguration,
  type ChartData,
  type ChartOptions,
} from 'chart.js';

// Register only the components we need
// This allows webpack/rollup to tree-shake unused chart types
Chart.register(
  // Controllers
  DoughnutController,
  LineController,
  BarController,
  // Elements
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  // Scales
  CategoryScale,
  LinearScale,
  // Plugins
  Tooltip,
  Legend
);

// Export Chart instance
export { Chart };

// Export type definitions for TypeScript support
export type { ChartConfiguration, ChartData, ChartOptions };
