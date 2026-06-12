import { readCssVar } from './chartTheme'

const ZOOM_IN_FACTOR = 0.82
const ZOOM_OUT_FACTOR = 1.22
const PAN_STEP_RATIO = 0.18
const MIN_VISIBLE_BARS = 5
const DEFAULT_BAR_SPACING = 8
const DEFAULT_RIGHT_OFFSET = 12
const MIN_RESET_VISIBLE_BARS = 40
const MAX_RESET_VISIBLE_BARS = 180

export function getDefaultVisibleBars(chart) {
  if (!chart) return 100
  let width = 800
  try {
    width = chart.options?.()?.width ?? width
  } catch (e) {
    /* ignore */
  }
  const priceScaleWidth = 70
  const plotWidth = Math.max(200, width - priceScaleWidth)
  return Math.max(
    MIN_RESET_VISIBLE_BARS,
    Math.min(MAX_RESET_VISIBLE_BARS, Math.floor(plotWidth / DEFAULT_BAR_SPACING) - DEFAULT_RIGHT_OFFSET)
  )
}

/** Focus viewport on a logical bar index with readable candle width */
export function focusChartOnBar(chart, barIndex, visibleBars) {
  const ts = chart?.timeScale?.()
  if (!ts || barIndex == null || barIndex < 0) return
  const bars = visibleBars ?? getDefaultVisibleBars(chart)
  const from = Math.max(0, barIndex - bars + 1)
  ts.applyOptions({
    barSpacing: DEFAULT_BAR_SPACING,
    rightOffset: DEFAULT_RIGHT_OFFSET,
    borderColor: readCssVar('--border', '#30363d')
  })
  ts.setVisibleLogicalRange({ from, to: barIndex + 1 })
}

export function zoomChart(chart, direction) {
  const ts = chart?.timeScale?.()
  if (!ts) return
  const range = ts.getVisibleLogicalRange()
  if (!range) return

  const center = (range.from + range.to) / 2
  let half = (range.to - range.from) / 2
  half *= direction > 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR
  half = Math.max(MIN_VISIBLE_BARS / 2, half)

  ts.setVisibleLogicalRange({ from: center - half, to: center + half })
}

/** direction: -1 = older (left), +1 = newer (right) */
export function panChart(chart, direction) {
  const ts = chart?.timeScale?.()
  if (!ts) return
  const range = ts.getVisibleLogicalRange()
  if (!range) return

  const span = range.to - range.from
  const step = span * PAN_STEP_RATIO * direction
  ts.setVisibleLogicalRange({ from: range.from + step, to: range.to + step })
}

/**
 * TradingView-style reset: default bar spacing + show recent bars in viewport.
 * Live charts scroll to latest candle; replay focuses on the current replay head.
 */
export function resetChartView(chart, { scrollToLive = false, focusBarIndex = null } = {}) {
  if (!chart) return
  try {
    chart.priceScale('right').applyOptions({ autoScale: true })
    const ts = chart.timeScale()

    if (focusBarIndex != null) {
      focusChartOnBar(chart, focusBarIndex)
      return
    }

    ts.resetTimeScale()
    if (scrollToLive) {
      ts.scrollToRealTime()
    }
  } catch (e) {
    /* ignore */
  }
}

/**
 * Slide viewport during replay so the head stays on the right with history visible.
 * scrollToPosition() is right-offset only — never pass a bar index to it.
 */
export function followReplayHead(chart, headIndex) {
  if (!chart || headIndex == null || headIndex < 0) return
  const ts = chart.timeScale()
  const range = ts.getVisibleLogicalRange()
  if (!range) {
    focusChartOnBar(chart, headIndex)
    return
  }

  const margin = 8
  if (headIndex < range.from + 5) {
    focusChartOnBar(chart, headIndex)
    return
  }
  if (headIndex >= range.to - margin) {
    const span = range.to - range.from
    ts.setVisibleLogicalRange({
      from: Math.max(0, headIndex - span + margin + 1),
      to: headIndex + margin + 1
    })
  }
}
