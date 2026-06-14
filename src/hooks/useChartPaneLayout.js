import { useCallback, useEffect, useState } from 'react'
import { timeToCoordinate, coordinateToTime } from '../utils/chartTimeScale'

/**
 * Keeps overlay dimensions in sync with the lightweight-charts plot pane
 * (excludes price scale + time scale) and re-renders on pan/zoom/data changes.
 */
export function useChartPaneLayout(chartRef, syncKey = 0) {
  const [layout, setLayout] = useState({ width: 0, height: 0, tick: 0 })

  const refresh = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return
    const pane = chart.paneSize?.() ?? { width: 0, height: 0 }
    setLayout((prev) => ({
      width: pane.width || 0,
      height: pane.height || 0,
      tick: prev.tick + 1
    }))
  }, [chartRef])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    refresh()

    const ts = chart.timeScale()

    if (ts.subscribeVisibleTimeRangeChange) {
      ts.subscribeVisibleTimeRangeChange(refresh)
    }
    if (ts.subscribeVisibleLogicalRangeChange) {
      ts.subscribeVisibleLogicalRangeChange(refresh)
    }

    const host = chart.chartElement?.()
    let ro = null
    if (host && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(refresh)
      ro.observe(host)
    }

    window.addEventListener('resize', refresh)

    return () => {
      if (ts.unsubscribeVisibleTimeRangeChange) {
        ts.unsubscribeVisibleTimeRangeChange(refresh)
      }
      if (ts.unsubscribeVisibleLogicalRangeChange) {
        ts.unsubscribeVisibleLogicalRangeChange(refresh)
      }
      ro?.disconnect()
      window.removeEventListener('resize', refresh)
    }
  }, [chartRef, refresh, syncKey])

  return { ...layout, refresh }
}

export function chartToPixel(chart, series, time, price, timeScaleCtx = null) {
  if (!chart || !series || time == null || price == null) return null
  const x = timeToCoordinate(chart, time, timeScaleCtx)
  const y = series.priceToCoordinate(price)
  if (x == null || y == null) return null
  return { x, y }
}

export function pixelToChart(chart, series, x, y, timeScaleCtx = null) {
  if (!chart || !series || x == null || y == null) return null
  const time = coordinateToTime(chart, x, timeScaleCtx)
  const price = series.coordinateToPrice(y)
  if (time == null || price == null) return null
  return { time, price }
}
