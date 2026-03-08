import type { ForecastChartWindow, ForecastTimelinePoint } from '@/lib/forecast';

export interface WealthTrajectoryChartSeries {
  labels: string[];
  plannedBalance: Array<number | null>;
  actualBalance: Array<number | null>;
  currentTrajectoryBalance: Array<number | null>;
}

export interface WealthTrajectoryChartPayload {
  timeline: ForecastTimelinePoint[];
  chartWindow: ForecastChartWindow;
}

export function buildWealthTrajectoryChartSeries(
  timeline: ForecastTimelinePoint[],
  chartWindow: ForecastChartWindow
): WealthTrajectoryChartSeries {
  const hasWindow = chartWindow.endIndex >= chartWindow.startIndex && chartWindow.endIndex >= 0;
  const visibleTimeline = hasWindow
    ? timeline.slice(chartWindow.startIndex, chartWindow.endIndex + 1)
    : timeline;

  return {
    labels: visibleTimeline.map((point) => point.dateLabel),
    plannedBalance: visibleTimeline.map((point) => point.plannedBalance),
    actualBalance: visibleTimeline.map((point) => point.actualBalance),
    currentTrajectoryBalance: visibleTimeline.map((point) => point.currentTrajectoryBalance),
  };
}
