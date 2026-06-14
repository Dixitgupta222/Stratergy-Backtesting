export { timestampToDateInput, dateInputToTimestamp } from './chartTimezone'

export function applyVisibleDateRange(chart, range) {
  if (!chart || !range?.from || !range?.to) return
  try {
    chart.timeScale().setVisibleRange({ from: range.from, to: range.to })
  } catch (e) {
    // range may be out of data bounds
  }
}

export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M']

export function tfToSeconds(tf) {
  if (!tf) return 60
  const num = parseInt(tf.slice(0, -1), 10)
  const unit = tf.slice(-1)
  if (unit === 'm') return num * 60
  if (unit === 'h') return num * 3600
  if (unit === 'd') return num * 86400
  if (unit === 'w') return num * 86400 * 7
  if (unit === 'M') return num * 86400 * 30
  return 60
}

export const SUB_PANE_HEIGHT = 90
