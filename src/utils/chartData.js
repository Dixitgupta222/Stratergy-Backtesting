import { tfToSeconds, getCandleOpenTime } from './chartHelpers'

/** Legacy default bar cap (daily+ timeframes) */
export const MAX_CHART_CANDLES = 3500

/** Intraday history depth on chart — 15m+ use ~60d; dense TFs use shorter windows */
export const CHART_HISTORY_DAYS = 60

const CHART_HISTORY_DAYS_BY_TF = {
  '1m': 30,
  '5m': 60
}

/** Absolute bar caps per timeframe — keeps lightweight-charts responsive */
const DISPLAY_BAR_CAP = {
  '1m': 20_000,
  '5m': 12_000,
  '15m': 8_000,
  '1h': 2_000,
  '4h': 500
}

function getChartHistoryDays(timeframe) {
  return CHART_HISTORY_DAYS_BY_TF[timeframe] ?? CHART_HISTORY_DAYS
}

/** Bars to render for a timeframe (time-based window, capped for performance). */
export function getChartDisplayCandleLimit(timeframe) {
  const tfSec = tfToSeconds(timeframe)
  const days = getChartHistoryDays(timeframe)
  const targetBars = Math.ceil((days * 86_400) / tfSec)
  const hardCap = DISPLAY_BAR_CAP[timeframe] ?? MAX_CHART_CANDLES
  return Math.min(targetBars, hardCap)
}

/** Bars of history shown before the replay start point */
export const REPLAY_CONTEXT_BARS = 200

/** Max bars on chart during replay (context + replayed candles) */
export const REPLAY_MAX_DISPLAY_BARS = 1200

/**
 * Merge finer candles into one OHLC bar (in-progress higher-TF candle).
 * Open = first sub-candle open, close = last sub-candle close,
 * high/low = running max/min across all sub-candles revealed so far.
 */
export function aggregateCandles(candles, bucketOpen = null) {
  if (!candles?.length) return null
  const first = candles[0]
  const last = candles[candles.length - 1]
  let high = -Infinity
  let low = Infinity
  let volume = 0
  for (const c of candles) {
    high = Math.max(high, c.high)
    low = Math.min(low, c.low)
    volume += c.volume || 0
  }
  return {
    time: bucketOpen ?? first.time,
    open: first.open,
    high,
    low,
    close: last.close,
    volume
  }
}

/**
 * Finer candles the leader has revealed (since replay start) in the current HTF bucket.
 * Uses exclusive end index — same semantics as replay head (index 101 → bars 100..100).
 */
export function getFormingSliceFromLeader(
  ltfData,
  leaderRevealIndex,
  leaderStartIndex,
  bucketOpen,
  htfTimeframe
) {
  if (!ltfData?.length || leaderRevealIndex == null || leaderRevealIndex <= 0) return []

  const htfSec = tfToSeconds(htfTimeframe)
  const bucketEnd = bucketOpen + htfSec
  const fromIdx = Math.max(0, (leaderStartIndex ?? 1) - 1)
  const toIdxExclusive = Math.min(ltfData.length, Math.max(fromIdx, leaderRevealIndex))

  const out = []
  for (let i = fromIdx; i < toIdxExclusive; i++) {
    const c = ltfData[i]
    if (c.time >= bucketOpen && c.time < bucketEnd) out.push(c)
  }
  return out
}

/**
 * HTF bars from earlier periods only — excludes the native bar for the active forming bucket
 * (handles both period-open and period-close timestamps).
 */
export function htfBarsBeforeBucket(htfData, htfTimeframe, bucketOpen) {
  if (!htfData?.length || bucketOpen == null) return []
  return htfData.filter((c) => getCandleOpenTime(c.time, htfTimeframe) < bucketOpen)
}

/** Active HTF bucket from leader's last revealed finer candle. */
export function getLeaderFormingBucket(ltfData, leaderRevealIndex, leaderStartIndex, htfTimeframe) {
  const fromIdx = Math.max(0, (leaderStartIndex ?? 1) - 1)
  const toIdxExclusive = Math.min(
    ltfData?.length ?? 0,
    Math.max(fromIdx, leaderRevealIndex ?? 0)
  )
  if (!ltfData?.length || toIdxExclusive <= fromIdx) return null
  return getCandleOpenTime(ltfData[toIdxExclusive - 1].time, htfTimeframe)
}

/**
 * Linked replay on a higher-TF chart: completed HTF bars + live forming bar
 * synthesized from finer leader candles revealed so far in this period.
 */
export function getLinkedReplayChartData(
  htfData,
  htfTimeframe,
  ltfData,
  leaderRevealIndex,
  leaderStartIndex,
  targetTime,
  replayStartIndex,
  {
    contextBars = REPLAY_CONTEXT_BARS,
    maxBars = REPLAY_MAX_DISPLAY_BARS
  } = {}
) {
  if (!htfData?.length || targetTime == null) return []

  const bucketOpen = getLeaderFormingBucket(
    ltfData,
    leaderRevealIndex,
    leaderStartIndex,
    htfTimeframe
  ) ?? getCandleOpenTime(targetTime, htfTimeframe)

  const formingSlice = getFormingSliceFromLeader(
    ltfData,
    leaderRevealIndex,
    leaderStartIndex,
    bucketOpen,
    htfTimeframe
  )
  const completed = htfBarsBeforeBucket(htfData, htfTimeframe, bucketOpen)
  const forming = aggregateCandles(formingSlice, bucketOpen)

  const display = forming ? [...completed, forming] : completed
  if (!display.length) return []

  const end = display.length
  const replayStart = Math.max(1, Math.min(replayStartIndex, end))
  const contextStart = Math.max(0, replayStart - 1 - contextBars)
  const cappedStart = Math.max(contextStart, end - maxBars)
  return display.slice(cappedStart, end)
}

/** True when the last bar is the same forming bucket — use series.update() for live morph. */
export function isFormingBarLiveUpdate(prev, next) {
  if (!prev?.length || !next?.length) return false
  if (prev.length !== next.length) return false
  return prev[prev.length - 1].time === next[next.length - 1].time
}

/** True when follower should synthesize bars from a finer linked leader. */
export function shouldUseLinkedFormingCandle(followerTf, leaderTf) {
  if (!followerTf || !leaderTf) return false
  return tfToSeconds(followerTf) > tfToSeconds(leaderTf)
}

/**
 * Slice for chart display. Full history stays in memory for backtest.
 * @param {Array} data - full OHLC array
 * @param {number|null} endIndex - exclusive end (replay position); default = all
 */
export function getChartDisplayData(data, endIndex = null, timeframe = '15m') {
  if (!data?.length) return []
  const limit = getChartDisplayCandleLimit(timeframe)
  const end = endIndex == null ? data.length : Math.max(1, Math.min(endIndex, data.length))
  const start = Math.max(0, end - limit)
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
