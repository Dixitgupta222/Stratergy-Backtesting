/** Forex backtest history windows — keep in sync with lib/dukascopyForex.js */
export const FOREX_BACKTEST_DAYS = 124
export const FOREX_1M_BACKTEST_DAYS = 90

const FOREX_INITIAL_DAYS = {
  '1m': 14,
  '5m': 30
}

const FOREX_MAX_DAYS = {
  '1m': FOREX_1M_BACKTEST_DAYS,
  '5m': FOREX_1M_BACKTEST_DAYS,
  '15m': FOREX_BACKTEST_DAYS,
  '1h': FOREX_BACKTEST_DAYS,
  '4h': FOREX_BACKTEST_DAYS
}

export function getForexInitialDays(timeframe) {
  return FOREX_INITIAL_DAYS[timeframe] ?? null
}

export function getForexMaxDays(timeframe) {
  return FOREX_MAX_DAYS[timeframe] ?? FOREX_BACKTEST_DAYS
}

export function shouldExtendForexHistory(timeframe) {
  const initial = getForexInitialDays(timeframe)
  const max = getForexMaxDays(timeframe)
  return initial != null && initial < max
}
