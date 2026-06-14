import { tfToSeconds } from './chartHelpers'

/** Anchor of the last data bar for extrapolating into the right margin. */
export function resolveLastBarAnchor(chart, lastBarTime) {
  if (!chart || lastBarTime == null) return null
  const ts = chart.timeScale()
  const x = ts.timeToCoordinate(lastBarTime)
  if (x == null) return null
  const logical = ts.coordinateToLogical(x)
  if (logical == null) return null
  return { time: lastBarTime, logical }
}

/** Bar duration from visible consecutive candles, else timeframe fallback. */
export function resolveBarDurationSec(chart, fallbackTf) {
  const fallback = tfToSeconds(fallbackTf)
  const ts = chart?.timeScale?.()
  if (!ts) return fallback

  const range = ts.getVisibleLogicalRange()
  if (!range) return fallback

  const start = Math.max(Math.floor(range.from), 0)
  const end = Math.min(Math.ceil(range.to), start + 300)

  for (let l = start; l < end; l++) {
    const x1 = ts.logicalToCoordinate(l)
    const x2 = ts.logicalToCoordinate(l + 1)
    if (x1 == null || x2 == null) continue
    const t1 = ts.coordinateToTime(x1)
    const t2 = ts.coordinateToTime(x2)
    if (t1 != null && t2 != null && t2 > t1) return t2 - t1
  }

  return fallback
}

export function buildTimeScaleContext(chart, lastBarTime, timeframe) {
  if (!chart) return null
  const anchor = resolveLastBarAnchor(chart, lastBarTime)
  const barDurationSec = resolveBarDurationSec(chart, timeframe)
  if (!anchor || !barDurationSec) return null
  return { anchor, barDurationSec }
}

export function logicalToTime(logical, ctx) {
  if (logical == null || !ctx?.anchor || !ctx.barDurationSec) return null
  const { anchor, barDurationSec } = ctx
  return anchor.time + (logical - anchor.logical) * barDurationSec
}

export function timeToCoordinate(chart, time, ctx) {
  if (!chart || time == null) return null
  const ts = chart.timeScale()
  const direct = ts.timeToCoordinate(time)
  if (direct != null) return direct
  if (!ctx?.anchor || !ctx.barDurationSec) return null
  const { anchor, barDurationSec } = ctx
  const logical = anchor.logical + (time - anchor.time) / barDurationSec
  return ts.logicalToCoordinate(logical)
}

export function coordinateToTime(chart, x, ctx) {
  if (!chart || x == null) return null
  const ts = chart.timeScale()
  const direct = ts.coordinateToTime(x)
  if (direct != null) return direct
  if (!ctx?.anchor || !ctx.barDurationSec) return null
  const logical = ts.coordinateToLogical(x)
  if (logical == null) return null
  return logicalToTime(logical, ctx)
}
