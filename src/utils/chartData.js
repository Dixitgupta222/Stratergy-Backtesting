/** Max candles rendered on chart — keeps lightweight-charts fast */
export const MAX_CHART_CANDLES = 3500

/** Bars of history shown before the replay start point */
export const REPLAY_CONTEXT_BARS = 200

/** Max bars on chart during replay (context + replayed candles) */
export const REPLAY_MAX_DISPLAY_BARS = 1200

/**
 * Slice for chart display. Full history stays in memory for backtest.
 * @param {Array} data - full OHLC array
 * @param {number|null} endIndex - exclusive end (replay position); default = all
 */
export function getChartDisplayData(data, endIndex = null) {
  if (!data?.length) return []
  const end = endIndex == null ? data.length : Math.max(1, Math.min(endIndex, data.length))
  const start = Math.max(0, end - MAX_CHART_CANDLES)
  return data.slice(start, end)
}

/**
 * Replay slice: context before pick point + candles revealed so far.
 * Avoids loading thousands of unrelated bars that break the viewport.
 */
export function getReplayChartData(data, replayStartIndex, currentIndex, {
  contextBars = REPLAY_CONTEXT_BARS,
  maxBars = REPLAY_MAX_DISPLAY_BARS
} = {}) {
  if (!data?.length) return []
  const end = Math.max(1, Math.min(currentIndex, data.length))
  const replayStart = Math.max(1, Math.min(replayStartIndex, end))
  const contextStart = Math.max(0, replayStart - 1 - contextBars)
  const cappedStart = Math.max(contextStart, end - maxBars)
  return data.slice(cappedStart, end)
}

export function formatDisplayNote(total, shown) {
  if (!total || total <= shown) return ''
  return `${shown.toLocaleString()} shown · ${total.toLocaleString()} loaded for backtest`
}
