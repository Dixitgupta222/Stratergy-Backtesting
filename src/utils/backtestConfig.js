import { tfToSeconds } from '../utils/chartHelpers'

/** Minimum history window for backtesting */
export const BACKTEST_MONTHS = 4
const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000
export const BACKTEST_MS = BACKTEST_MONTHS * MS_PER_MONTH

export function candlesNeededForMonths(timeframe, months = BACKTEST_MONTHS) {
  const totalSec = months * 30.44 * 24 * 60 * 60
  const intervalSec = tfToSeconds(timeframe)
  return Math.ceil(totalSec / intervalSec)
}

export function formatHistoryRange(data, displayCount = null) {
  if (!data?.length) return ''
  const first = new Date(data[0].time * 1000)
  const last = new Date(data[data.length - 1].time * 1000)
  const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const base = `${fmt(first)} → ${fmt(last)}`
  if (displayCount != null && data.length > displayCount) {
    return `${base} · ${displayCount.toLocaleString()}/${data.length.toLocaleString()} on chart`
  }
  return `${base} (${data.length.toLocaleString()} candles)`
}
