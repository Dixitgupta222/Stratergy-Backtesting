import { tfToSeconds } from '../utils/chartHelpers'
import { formatChartDate } from './chartTimezone'

/** Minimum history window for backtesting */
export const BACKTEST_MONTHS = 4
const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000
export const BACKTEST_MS = BACKTEST_MONTHS * MS_PER_MONTH

/** First paint fetch — dense intervals load fewer days so the chart opens quickly */
export const INITIAL_FETCH_DAYS_BY_TF = {
  '1m': 10,
  '5m': 30
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getInitialFetchMs(timeframe) {
  const days = INITIAL_FETCH_DAYS_BY_TF[timeframe]
  return days ? days * MS_PER_DAY : BACKTEST_MS
}

export function shouldExtendHistoryInBackground(timeframe) {
  return timeframe in INITIAL_FETCH_DAYS_BY_TF
}

export function candlesNeededForMonths(timeframe, months = BACKTEST_MONTHS) {
  const totalSec = months * 30.44 * 24 * 60 * 60
  const intervalSec = tfToSeconds(timeframe)
  return Math.ceil(totalSec / intervalSec)
}

export function formatHistoryRange(data, displayCount = null) {
  if (!data?.length) return ''
  const base = `${formatChartDate(data[0].time)} → ${formatChartDate(data[data.length - 1].time)}`
  if (displayCount != null && data.length > displayCount) {
    return `${base} · ${displayCount.toLocaleString()}/${data.length.toLocaleString()} on chart`
  }
  return `${base} (${data.length.toLocaleString()} candles)`
}
