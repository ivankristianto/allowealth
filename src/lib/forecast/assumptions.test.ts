import { describe, expect, it } from 'bun:test';

describe('forecast assumptions validation', () => {
  it('rejects monthly top-up values above the shared maximum', async () => {
    const { MAX_FORECAST_MONTHLY_TOPUP, validateForecastAssumptions } =
      await import('./assumptions');

    expect(validateForecastAssumptions(MAX_FORECAST_MONTHLY_TOPUP + 1, 7)).toBe(
      'Monthly Top-Up must be between 0 and 1,000,000,000,000.'
    );
  });

  it('accepts values at the shared upper bounds', async () => {
    const { MAX_FORECAST_MONTHLY_TOPUP, MAX_FORECAST_ANNUAL_RATE, validateForecastAssumptions } =
      await import('./assumptions');

    expect(validateForecastAssumptions(MAX_FORECAST_MONTHLY_TOPUP, MAX_FORECAST_ANNUAL_RATE)).toBe(
      null
    );
  });
});
