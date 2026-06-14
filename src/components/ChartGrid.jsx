import React, { useCallback, useEffect, useRef, useState } from 'react'
import ChartCard from './ChartCard'
import ReplayToolbar from './ReplayToolbar'
import { getPreset } from '../utils/layoutPresets'
import {
  DEFAULT_REPLAY_SPEED_SEC,
  formatReplayTime,
  nextReplaySpeed,
  timeFromWindowProgress,
  windowProgressFromTime
} from '../utils/replayWindow'

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
  syncReplay,
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
  const replayRegistry = useRef(new Map())
  const rangeSyncLock = useRef(false)
  const crosshairSyncLock = useRef(false)
  const dateRangeSyncLock = useRef(false)
  const linkedReplayRef = useRef(null)

  const [linkedReplay, setLinkedReplay] = useState(null)
  linkedReplayRef.current = linkedReplay

  const registerChart = useCallback((id, chart) => {
    if (chart) chartRegistry.current.set(id, chart)
    else chartRegistry.current.delete(id)
  }, [])

  const registerReplay = useCallback((id, api) => {
    if (api) replayRegistry.current.set(id, api)
    else replayRegistry.current.delete(id)
  }, [])

  const forEachReplay = useCallback((fn) => {
    replayRegistry.current.forEach((api) => fn(api))
  }, [])

  const exitLinkedReplay = useCallback(() => {
    forEachReplay((api) => api.exitReplay?.())
    setLinkedReplay(null)
  }, [forEachReplay])

  const applyLinkedTime = useCallback((time, { followHead = false } = {}) => {
    forEachReplay((api) => api.applyAtTime?.(time, { followHead }))
  }, [forEachReplay])

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

  const startLinkedReplay = useCallback((sourceId) => {
    const eligible = []
    replayRegistry.current.forEach((api, id) => {
      if (api.canBacktest?.()) eligible.push({ id, api })
    })
    if (!eligible.length) return

    eligible.forEach(({ api }) => api.enterReplay?.())

    setLinkedReplay({
      active: true,
      leaderId: sourceId,
      pickMode: true,
      playing: false,
      progress: 0,
      speedSec: DEFAULT_REPLAY_SPEED_SEC,
      startTime: null,
      endTime: null,
      currentLabel: ''
    })
  }, [])

  const handleLinkedPick = useCallback((time, chartId) => {
    const state = linkedReplayRef.current
    if (!state?.active || !state.pickMode || time == null) return

    forEachReplay((api) => api.confirmStartAt?.(time))

    const leader = replayRegistry.current.get(state.leaderId) || replayRegistry.current.get(chartId)
    const endTime = leader?.getEndTime?.() ?? time

    setLinkedReplay((s) => ({
      ...s,
      pickMode: false,
      startTime: time,
      endTime,
      progress: 0,
      playing: false,
      currentLabel: formatReplayTime(time)
    }))
  }, [forEachReplay])

  const handleLinkedPlayToggle = useCallback(() => {
    const state = linkedReplayRef.current
    if (!state?.active || state.pickMode) return

    if (state.playing) {
      setLinkedReplay((s) => ({ ...s, playing: false }))
      return
    }

    const leader = replayRegistry.current.get(state.leaderId)
    if (!leader) return

    const cur = leader.getCurrentIndex?.() ?? 0
    const end = leader.getEndIndex?.() ?? 0
    if (cur >= end) {
      setLinkedReplay((s) => ({ ...s, progress: 100, playing: false }))
      return
    }

    setLinkedReplay((s) => ({ ...s, playing: true }))
  }, [])

  const handleLinkedStepBack = useCallback(() => {
    const state = linkedReplayRef.current
    if (!state?.active || state.pickMode || state.startTime == null) return

    const leader = replayRegistry.current.get(state.leaderId)
    if (!leader) return

    const cur = leader.getCurrentIndex?.() ?? 0
    const start = leader.getStartIndex?.() ?? 1
    const idx = Math.max(start, cur - 1)
    const time = leader.getTimeAtIndex?.(idx)
    if (time == null) return

    applyLinkedTime(time)
    setLinkedReplay((s) => ({
      ...s,
      playing: false,
      progress: windowProgressFromTime(time, s.startTime, s.endTime),
      currentLabel: formatReplayTime(time)
    }))
  }, [applyLinkedTime])

  const handleLinkedSeek = useCallback((pct) => {
    const state = linkedReplayRef.current
    if (!state?.active || state.pickMode || state.startTime == null || state.endTime == null) return

    const time = timeFromWindowProgress(pct, state.startTime, state.endTime)
    applyLinkedTime(time)
    setLinkedReplay((s) => ({
      ...s,
      playing: false,
      progress: pct,
      currentLabel: formatReplayTime(time)
    }))
  }, [applyLinkedTime])

  const handleLinkedReselect = useCallback(() => {
    const state = linkedReplayRef.current
    if (!state?.active) return

    forEachReplay((api) => api.enterPickMode?.())
    setLinkedReplay((s) => ({
      ...s,
      pickMode: true,
      playing: false,
      progress: 0,
      startTime: null,
      endTime: null,
      currentLabel: ''
    }))
  }, [forEachReplay])

  const handleLinkedSpeedDown = useCallback(() => {
    setLinkedReplay((s) => {
      if (!s?.active) return s
      const speedSec = nextReplaySpeed(s.speedSec, -1)
      forEachReplay((api) => api.setSpeed?.(speedSec))
      return { ...s, speedSec }
    })
  }, [forEachReplay])

  const handleLinkedSpeedUp = useCallback(() => {
    setLinkedReplay((s) => {
      if (!s?.active) return s
      const speedSec = nextReplaySpeed(s.speedSec, 1)
      forEachReplay((api) => api.setSpeed?.(speedSec))
      return { ...s, speedSec }
    })
  }, [forEachReplay])

  useEffect(() => {
    if (!syncReplay && linkedReplay?.active) exitLinkedReplay()
  }, [syncReplay, linkedReplay?.active, exitLinkedReplay])

  useEffect(() => {
    if (!linkedReplay?.active || !linkedReplay.playing || linkedReplay.pickMode) return

    const tickMs = Math.max(50, linkedReplay.speedSec * 1000)
    const timer = setInterval(() => {
      const state = linkedReplayRef.current
      if (!state?.active || !state.playing || state.pickMode) return

      const leader = replayRegistry.current.get(state.leaderId)
      if (!leader) return

      const cur = leader.getCurrentIndex?.() ?? 0
      const end = leader.getEndIndex?.() ?? 0
      if (cur >= end) {
        setLinkedReplay((s) => ({ ...s, playing: false, progress: 100 }))
        return
      }

      const nextIdx = cur + 1
      const nextTime = leader.getTimeAtIndex?.(nextIdx)
      if (nextTime == null) {
        setLinkedReplay((s) => ({ ...s, playing: false, progress: 100 }))
        return
      }

      applyLinkedTime(nextTime, { followHead: true })
      setLinkedReplay((s) => ({
        ...s,
        progress: windowProgressFromTime(nextTime, s.startTime, s.endTime),
        currentLabel: formatReplayTime(nextTime)
      }))
    }, tickMs)

    return () => clearInterval(timer)
  }, [
    linkedReplay?.active,
    linkedReplay?.playing,
    linkedReplay?.pickMode,
    linkedReplay?.speedSec,
    applyLinkedTime
  ])

  const linkedReplayActive = syncReplay && !!linkedReplay?.active

  return (
    <div
      className={`chart-grid ${gridVariant ? `chart-grid--${gridVariant}` : ''} ${isFocused ? 'chart-grid--focused' : ''} ${linkedReplayActive ? 'chart-grid--linked-replay' : ''}`}
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
          syncReplay={syncReplay}
          linkedReplayActive={linkedReplayActive}
          linkedReplayPickMode={linkedReplayActive && !!linkedReplay?.pickMode}
          showReplayToolbar={!linkedReplayActive}
          onEnterLinkedReplay={startLinkedReplay}
          onLinkedReplayPick={handleLinkedPick}
          onLinkedReplayExit={exitLinkedReplay}
          registerReplay={registerReplay}
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

      {linkedReplayActive && (
        <div className="replay-linked-dock">
          <ReplayToolbar
            speedSec={linkedReplay.speedSec}
            isPlaying={linkedReplay.playing}
            pickMode={linkedReplay.pickMode}
            currentLabel={linkedReplay.currentLabel}
            progress={linkedReplay.progress}
            onSpeedDown={handleLinkedSpeedDown}
            onSpeedUp={handleLinkedSpeedUp}
            onStepBack={handleLinkedStepBack}
            onStepForward={handleLinkedPlayToggle}
            onReselect={handleLinkedReselect}
            onStop={exitLinkedReplay}
            onSeek={handleLinkedSeek}
            linked
          />
        </div>
      )}
    </div>
  )
}
