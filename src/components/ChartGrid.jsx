import React, { useCallback, useRef } from 'react'
import ChartCard from './ChartCard'
import { getPreset } from '../utils/layoutPresets'

export default function ChartGrid({
  layoutId = '2h',
  sharedSymbol,
  sharedTimeframe,
  setSharedSymbol,
  setSharedTimeframe,
  sharedDateRange,
  setSharedDateRange,
  syncSymbol,
  syncInterval,
  syncCrosshair,
  syncTime,
  syncDateRange,
  syncDrawings,
  sharedDrawings,
  setSharedDrawings,
  focusedChartId,
  setFocusedChartId,
  watchlistTickers,
  watchlistApply,
  symbolApplyTick
}) {
  const preset = getPreset(layoutId)
  const isFocused = focusedChartId != null
  const count = isFocused ? 1 : preset.count
  const chartIds = isFocused ? [focusedChartId] : Array.from({ length: count }, (_, i) => i)
  const cols = isFocused ? 1 : preset.cols
  const gridVariant = isFocused ? '' : preset.variant || ''

  const chartRegistry = useRef(new Map())
  const rangeSyncLock = useRef(false)
  const crosshairSyncLock = useRef(false)
  const dateRangeSyncLock = useRef(false)

  const registerChart = useCallback((id, chart) => {
    if (chart) chartRegistry.current.set(id, chart)
    else chartRegistry.current.delete(id)
  }, [])

  const broadcastCrosshair = useCallback((sourceId, payload) => {
    if (!syncCrosshair || !payload?.point || crosshairSyncLock.current) return
    crosshairSyncLock.current = true
    chartRegistry.current.forEach((chart, id) => {
      if (id === sourceId) return
      if (chart?.setCrosshairPosition) {
        chart.setCrosshairPosition({ x: payload.point.x, y: payload.point.y })
      }
    })
    crosshairSyncLock.current = false
  }, [syncCrosshair])

  const broadcastVisibleRange = useCallback((sourceId, range) => {
    if (!syncTime || !range || rangeSyncLock.current) return
    rangeSyncLock.current = true
    chartRegistry.current.forEach((chart, id) => {
      if (id === sourceId) return
      if (chart?.timeScale?.()?.setVisibleRange) {
        try { chart.timeScale().setVisibleRange(range) } catch (e) { /* ignore */ }
      }
    })
    rangeSyncLock.current = false
  }, [syncTime])

  const broadcastDateRange = useCallback((sourceId, range) => {
    if (!syncDateRange || !range?.from || !range?.to || dateRangeSyncLock.current) return
    dateRangeSyncLock.current = true
    setSharedDateRange(range)
    chartRegistry.current.forEach((chart, id) => {
      if (id === sourceId) return
      if (chart?.timeScale?.()?.setVisibleRange) {
        try { chart.timeScale().setVisibleRange(range) } catch (e) { /* ignore */ }
      }
    })
    dateRangeSyncLock.current = false
  }, [syncDateRange, setSharedDateRange])

  return (
    <div
      className={`chart-grid ${gridVariant ? `chart-grid--${gridVariant}` : ''} ${isFocused ? 'chart-grid--focused' : ''}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {chartIds.map((i) => (
        <ChartCard
          key={i}
          id={i}
          isSingle={isFocused || count === 1}
          isFocused={isFocused}
          onMaximize={() => setFocusedChartId(i)}
          onMinimize={() => setFocusedChartId(null)}
          sharedSymbol={sharedSymbol}
          sharedTimeframe={sharedTimeframe}
          setSharedSymbol={setSharedSymbol}
          setSharedTimeframe={setSharedTimeframe}
          sharedDateRange={sharedDateRange}
          syncSymbol={syncSymbol}
          syncInterval={syncInterval}
          syncCrosshair={syncCrosshair}
          syncTime={syncTime}
          syncDateRange={syncDateRange}
          syncDrawings={syncDrawings}
          sharedDrawings={sharedDrawings}
          setSharedDrawings={setSharedDrawings}
          registerChart={registerChart}
          onCrosshairMove={broadcastCrosshair}
          onVisibleRangeChange={broadcastVisibleRange}
          onDateRangeChange={broadcastDateRange}
          watchlistTickers={watchlistTickers}
          watchlistApply={watchlistApply}
          symbolApplyTick={symbolApplyTick}
        />
      ))}
    </div>
  )
}
