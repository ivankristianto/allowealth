const FORECAST_LIMIT_FORMATTER = new Intl.NumberFormat('en-US');

export const MAX_FORECAST_MONTHLY_TOPUP = 1_000_000_000_000;
export const MAX_FORECAST_ANNUAL_RATE = 100;

function formatForecastLimit(value: number): string {
  return FORECAST_LIMIT_FORMATTER.format(value);
}

export function validateForecastAssumptions(
  monthlyTopup: number,
  annualRate: number
): string | null {
  if (
    !Number.isFinite(monthlyTopup) ||
    monthlyTopup < 0 ||
    monthlyTopup > MAX_FORECAST_MONTHLY_TOPUP
  ) {
    return `Monthly Top-Up must be between 0 and ${formatForecastLimit(MAX_FORECAST_MONTHLY_TOPUP)}.`;
  }

  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > MAX_FORECAST_ANNUAL_RATE) {
    return `Expected APY must be between 0 and ${MAX_FORECAST_ANNUAL_RATE}.`;
  }

  return null;
}
