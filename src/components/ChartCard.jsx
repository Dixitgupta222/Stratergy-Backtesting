import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import { fetchMarketHistory } from '../services/marketData'
import {
  detectSymbolMarket,
  supportsLiveStream,
  supportsBacktest,
  scrollToLiveOnReset
} from '../utils/symbolType'
import { formatHistoryRange } from '../utils/backtestConfig'
import { getChartDisplayData, getReplayChartData } from '../utils/chartData'
import { sma, ema, rsi, macd, bollingerBands } from '../utils/indicators'
import { applyVisibleDateRange, SUB_PANE_HEIGHT } from '../utils/chartHelpers'
import {
  findEndIndexUntilTime,
  windowProgressFromIndex,
  indexFromWindowProgress,
  nextReplaySpeed,
  DEFAULT_REPLAY_SPEED_SEC
} from '../utils/replayWindow'
import { getChartOptions, CANDLE_OPTIONS } from '../utils/chartTheme'
import CandleTimer, { formatChartPrice, getCandleOpenTime } from './CandleTimer'
import Autocomplete from './Autocomplete'
import DrawingOverlay from './DrawingOverlay'
import DrawingToolsPanel from './DrawingToolsPanel'
import { createBinanceLiveConnection } from '../services/liveStream'
import SymbolInfoStrip from './SymbolInfoStrip'
import TimeframePills from './TimeframePills'
import ChartToolbar from './ChartToolbar'
import ChartSkeleton from './ChartSkeleton'
import ReplayToolbar from './ReplayToolbar'
import ChartNavToolbar from './ChartNavToolbar'
import { zoomChart, panChart, resetChartView, followReplayHead } from '../utils/chartNavigation'
import { useTheme } from '../context/ThemeContext'
import { Maximize2, Minimize2 } from 'lucide-react'

const CANDLE_OPTS = CANDLE_OPTIONS

function formatReplayTime(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function ChartCard({
  id,
  isSingle = false,
  isFocused = false,
  onMaximize,
  onMinimize,
  sharedSymbol,
  sharedTimeframe,
  setSharedSymbol,
  setSharedTimeframe,
  sharedDateRange,
  syncSymbol,
  syncInterval,
  syncCrosshair,
  syncTime,
  syncDateRange,
  syncDrawings,
  sharedDrawings,
  setSharedDrawings,
  registerChart,
  onCrosshairMove,
  onVisibleRangeChange,
  onDateRangeChange,
  watchlistTickers,
  watchlistApply,
  symbolApplyTick
}) {
  const { theme } = useTheme()
  const mainContainerRef = useRef()
  const chartHostRef = useRef()
  const overlayLayerRef = useRef()
  const rsiContainerRef = useRef()
  const macdContainerRef = useRef()
  const overlayWrapRef = useRef()
  const chartRef = useRef()
  const rsiChartRef = useRef()
  const macdChartRef = useRef()
  const candleSeriesRef = useRef()
  const overlaySeriesRef = useRef([])
  const replayRef = useRef({ index: 0, timer: null, speedSec: DEFAULT_REPLAY_SPEED_SEC, startIndex: 1, endIndex: 1 })
  const replayPickModeRef = useRef(false)
  const candleDataRef = useRef([])
  const lastCandleRef = useRef(null)
  const prevCloseRef = useRef(null)
  const liveConnRef = useRef(null)
  const isReplayingRef = useRef(false)
  const navChangeLockRef = useRef(false)

  const [symbol, setSymbol] = useState(sharedSymbol || 'BTCUSDT')
  const [timeframe, setTimeframe] = useState(sharedTimeframe || '1m')
  const symbolMarket = useMemo(() => detectSymbolMarket(symbol), [symbol])
  const [indicators, setIndicators] = useState([])
  const [replayMode, setReplayMode] = useState(false)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replayProgress, setReplayProgress] = useState(0)
  const [replayCurrentLabel, setReplayCurrentLabel] = useState('')
  const [replaySpeedSec, setReplaySpeedSec] = useState(DEFAULT_REPLAY_SPEED_SEC)
  const [replayPickMode, setReplayPickMode] = useState(false)
  const [error, setError] = useState(null)
  const [latestPrice, setLatestPrice] = useState(null)
  const [lastCandle, setLastCandle] = useState(null)
  const [prevCandle, setPrevCandle] = useState(null)
  const [liveStatus, setLiveStatus] = useState('idle')
  const [priceDirection, setPriceDirection] = useState('neutral')
  const [drawTool, setDrawTool] = useState('cursor')
  const [localDrawings, setLocalDrawings] = useState([])
  const [drawingPanelOpen, setDrawingPanelOpen] = useState(false)
  const [selectedDrawingId, setSelectedDrawingId] = useState(null)

  const drawings = syncDrawings ? (sharedDrawings ?? []) : localDrawings

  const setDrawings = useCallback((updater) => {
    const apply = (prev) => (typeof updater === 'function' ? updater(prev) : updater)
    if (syncDrawings && setSharedDrawings) {
      setSharedDrawings((prev) => apply(prev ?? []))
    } else {
      setLocalDrawings(apply)
    }
  }, [syncDrawings, setSharedDrawings])

  const clearDrawings = useCallback(() => {
    setDrawings([])
    setSelectedDrawingId(null)
  }, [setDrawings])
  const [loadKey, setLoadKey] = useState(0)
  const [dataVersion, setDataVersion] = useState(0)
  const [chartReady, setChartReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(null)
  const [historyLabel, setHistoryLabel] = useState('')
  const overlayRef = useRef()
  const lastUiTickRef = useRef(0)
  const onReplayChartClickRef = useRef(null)

  const ticker24h = watchlistTickers?.[symbol]

  const measureMainSize = useCallback(() => {
    const host = chartHostRef.current
    const container = mainContainerRef.current
    if (!host || !container) return null
    const width = host.clientWidth
    const height = Math.max(container.clientHeight, 120)
    if (width < 1 || height < 1) return null
    return { width, height }
  }, [])

  const updatePriceOverlayPosition = useCallback(() => {
    if (!overlayRef.current || !candleSeriesRef.current || !lastCandleRef.current || !chartRef.current) return
    requestAnimationFrame(() => {
      try {
        const price = lastCandleRef.current.close
        const y = candleSeriesRef.current.priceToCoordinate(price)
        if (y == null) {
          overlayRef.current.classList.remove('visible')
          return
        }
        const scaleWidth = chartRef.current.priceScale('right').width()
        overlayRef.current.style.top = `${y}px`
        overlayRef.current.style.width = `${Math.max(scaleWidth, 54)}px`
        overlayRef.current.classList.add('visible')
      } catch (e) { /* ignore */ }
    })
  }, [])

  const getVisibleChartData = useCallback((endIndex = null, replayStartIndex = null) => {
    const data = candleDataRef.current
    if (endIndex != null && replayStartIndex != null) {
      return getReplayChartData(data, replayStartIndex, endIndex)
    }
    if (endIndex != null) return getChartDisplayData(data, endIndex)
    return getChartDisplayData(data)
  }, [])

  const syncLastCandleFromDisplay = useCallback((display) => {
    if (!display?.length) return
    const last = display[display.length - 1]
    lastCandleRef.current = last
    setLatestPrice(last.close)
    setLastCandle({ ...last })
    setPrevCandle(display.length > 1 ? display[display.length - 2] : null)
    setPriceDirection(last.close >= last.open ? 'up' : 'down')
    updatePriceOverlayPosition()
  }, [updatePriceOverlayPosition])

  const pushLiveCandle = useCallback((candle, { scroll = false, fromKline = false } = {}) => {
    if (!candleSeriesRef.current || isReplayingRef.current) return
    const prev = lastCandleRef.current

    // Kline stream is authoritative for OHLC; trades only update the live close
    let next = candle
    if (!fromKline && prev && prev.time === candle.time) {
      next = {
        time: prev.time,
        open: prev.open,
        high: Math.max(prev.high, candle.close),
        low: Math.min(prev.low, candle.close),
        close: candle.close
      }
    }

    lastCandleRef.current = next
    candleSeriesRef.current.update(next)

    if (prev && prev.time !== next.time) {
      prevCloseRef.current = prev.close
      setPrevCandle(prev)
      if (fromKline && !isReplayingRef.current) {
        const display = getVisibleChartData(null)
        if (display.length) candleSeriesRef.current.setData(display)
      }
      if (scroll && chartRef.current) {
        try { chartRef.current.timeScale().scrollToRealTime() } catch (e) { /* ignore */ }
      }
    }

    const dir = next.close >= next.open ? 'up' : 'down'
    const now = Date.now()
    const shouldUpdateUi = fromKline || now - lastUiTickRef.current > 150
    if (shouldUpdateUi) {
      lastUiTickRef.current = now
      setPriceDirection(dir)
      setLatestPrice(next.close)
      setLastCandle({ ...next })
      updatePriceOverlayPosition()
    }

    if (candleSeriesRef.current) {
      candleSeriesRef.current.applyOptions({
        priceLineColor: dir === 'up' ? '#089981' : '#f23645'
      })
    }
  }, [updatePriceOverlayPosition, getVisibleChartData])

  const clearOverlaySeries = useCallback(() => {
    if (!chartRef.current) return
    overlaySeriesRef.current.forEach((s) => {
      try { chartRef.current.removeSeries(s) } catch (e) { /* ignore */ }
    })
    overlaySeriesRef.current = []
  }, [])

  const syncSubCharts = useCallback((range) => {
    if (!range) return
    ;[rsiChartRef, macdChartRef].forEach((ref) => {
      if (ref.current) {
        try { ref.current.timeScale().setVisibleRange(range) } catch (e) { /* ignore */ }
      }
    })
  }, [])

  const applyIndicators = useCallback((data) => {
    if (!chartRef.current || !data.length) return
    clearOverlaySeries()

    const closes = data.map((d) => ({ time: d.time, value: d.close }))

    if (indicators.includes('SMA')) {
      const s = chartRef.current.addLineSeries({ color: '#fb923c', lineWidth: 1, title: 'SMA' })
      s.setData(sma(closes, 20))
      overlaySeriesRef.current.push(s)
    }
    if (indicators.includes('EMA')) {
      const s = chartRef.current.addLineSeries({ color: '#e879f9', lineWidth: 1, title: 'EMA' })
      s.setData(ema(closes, 20))
      overlaySeriesRef.current.push(s)
    }
    if (indicators.includes('BB')) {
      const bands = bollingerBands(closes, 20, 2)
      const upper = chartRef.current.addLineSeries({ color: '#64748b', lineWidth: 1, lineStyle: 2, title: 'BB Upper' })
      const middle = chartRef.current.addLineSeries({ color: '#94a3b8', lineWidth: 1, title: 'BB Mid' })
      const lower = chartRef.current.addLineSeries({ color: '#64748b', lineWidth: 1, lineStyle: 2, title: 'BB Lower' })
      upper.setData(bands.map((b) => ({ time: b.time, value: b.upper })))
      middle.setData(bands.map((b) => ({ time: b.time, value: b.middle })))
      lower.setData(bands.map((b) => ({ time: b.time, value: b.lower })))
      overlaySeriesRef.current.push(upper, middle, lower)
    }

    if (indicators.includes('RSI') && rsiContainerRef.current) {
      if (rsiChartRef.current) rsiChartRef.current.remove()
      rsiChartRef.current = createChart(rsiContainerRef.current, {
        ...getChartOptions(),
        width: rsiContainerRef.current.clientWidth,
        height: SUB_PANE_HEIGHT,
        rightPriceScale: { borderColor: '#1f2a3a', scaleMargins: { top: 0.1, bottom: 0.1 } }
      })
      const rsiSeries = rsiChartRef.current.addLineSeries({ color: '#38bdf8', lineWidth: 1.5, title: 'RSI' })
      rsiSeries.setData(rsi(closes, 14))
      rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '70' })
      rsiSeries.createPriceLine({ price: 30, color: '#22c55e', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '30' })
      const mainRange = chartRef.current.timeScale().getVisibleRange()
      if (mainRange) rsiChartRef.current.timeScale().setVisibleRange(mainRange)
    } else if (rsiChartRef.current) {
      rsiChartRef.current.remove()
      rsiChartRef.current = null
    }

    if (indicators.includes('MACD') && macdContainerRef.current) {
      if (macdChartRef.current) macdChartRef.current.remove()
      macdChartRef.current = createChart(macdContainerRef.current, {
        ...getChartOptions(),
        width: macdContainerRef.current.clientWidth,
        height: SUB_PANE_HEIGHT
      })
      const { macdLine, signalLine } = macd(closes)
      const histData = macdLine.map((m, i) => {
        const sig = signalLine.find((s) => s.time === m.time)
        const val = sig ? m.value - sig.value : m.value
        return { time: m.time, value: val, color: val >= 0 ? '#22c55e' : '#ef4444' }
      })
      const hist = macdChartRef.current.addHistogramSeries({ title: 'MACD Hist' })
      hist.setData(histData)
      const macdS = macdChartRef.current.addLineSeries({ color: '#38bdf8', lineWidth: 1.5, title: 'MACD' })
      macdS.setData(macdLine)
      const sigS = macdChartRef.current.addLineSeries({ color: '#f97316', lineWidth: 1.5, title: 'Signal' })
      sigS.setData(signalLine)
      const mainRange = chartRef.current.timeScale().getVisibleRange()
      if (mainRange) macdChartRef.current.timeScale().setVisibleRange(mainRange)
    } else if (macdChartRef.current) {
      macdChartRef.current.remove()
      macdChartRef.current = null
    }
  }, [indicators, clearOverlaySeries])

  const refreshChartDisplay = useCallback((endIndex = null, { followHead = false } = {}) => {
    const data = candleDataRef.current
    if (!candleSeriesRef.current || !data.length) return []
    const replayStart = endIndex != null ? replayRef.current.startIndex : null
    const display = getVisibleChartData(endIndex, replayStart)
    if (!display.length) return []
    candleSeriesRef.current.setData(display)
    syncLastCandleFromDisplay(display)
    if (followHead && chartRef.current) {
      followReplayHead(chartRef.current, display.length - 1)
    }
    return display
  }, [getVisibleChartData, syncLastCandleFromDisplay])

  // Initialize main chart — chartHostRef must be empty (no React children inside)
  useEffect(() => {
    if (!chartHostRef.current || !mainContainerRef.current) return
    const initialSize = measureMainSize() ?? { width: chartHostRef.current.clientWidth, height: 280 }
    chartRef.current = createChart(chartHostRef.current, {
      ...getChartOptions(),
      width: initialSize.width,
      height: initialSize.height
    })
    candleSeriesRef.current = chartRef.current.addCandlestickSeries(CANDLE_OPTS)
    if (registerChart) registerChart(id, chartRef.current)
    setChartReady(true)

    const handleResize = () => {
      const size = measureMainSize()
      if (!size || !chartRef.current) return
      chartRef.current.applyOptions({ width: size.width, height: size.height })
      updatePriceOverlayPosition()
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth })
      }
      if (macdContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    const ro = new ResizeObserver(handleResize)
    ro.observe(mainContainerRef.current)

    let unsubCrosshair = null
    let unsubRange = null
    let unsubClick = null

    if (chartRef.current.subscribeClick) {
      unsubClick = chartRef.current.subscribeClick((param) => {
        if (param.time && onReplayChartClickRef.current) {
          onReplayChartClickRef.current(param.time)
        }
      })
    }

    if (chartRef.current.subscribeCrosshairMove && onCrosshairMove) {
      unsubCrosshair = chartRef.current.subscribeCrosshairMove((param) => {
        if (syncCrosshair) onCrosshairMove(id, param)
      })
    }

    const onRange = (range) => {
      syncSubCharts(range)
      updatePriceOverlayPosition()
      if (isReplayingRef.current || navChangeLockRef.current) return
      if (syncTime && onVisibleRangeChange) onVisibleRangeChange(id, range)
      if (syncDateRange && range && onDateRangeChange) {
        onDateRangeChange(id, { from: range.from, to: range.to })
      }
    }

    if (chartRef.current.timeScale().subscribeVisibleTimeRangeChange) {
      unsubRange = chartRef.current.timeScale().subscribeVisibleTimeRangeChange(onRange)
    }

    let unsubPriceRange = null
    if (chartRef.current.priceScale('right').subscribeVisibleLogicalRangeChange) {
      unsubPriceRange = chartRef.current.priceScale('right').subscribeVisibleLogicalRangeChange(updatePriceOverlayPosition)
    }

    window.addEventListener('resize', updatePriceOverlayPosition)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('resize', updatePriceOverlayPosition)
      setChartReady(false)
      if (unsubClick) unsubClick()
      if (unsubCrosshair) unsubCrosshair()
      if (unsubRange) unsubRange()
      if (unsubPriceRange) unsubPriceRange()
      if (registerChart) registerChart(id, null)
      if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null }
      if (macdChartRef.current) { macdChartRef.current.remove(); macdChartRef.current = null }
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
      candleSeriesRef.current = null
    }
  }, [measureMainSize, updatePriceOverlayPosition, theme])

  // Re-apply chart colors when theme changes
  useEffect(() => {
    if (!chartRef.current) return
    const opts = getChartOptions()
    chartRef.current.applyOptions(opts)
  }, [theme])

  useEffect(() => {
    updatePriceOverlayPosition()
  }, [latestPrice, lastCandle, updatePriceOverlayPosition])

  useEffect(() => {
    if (isLoading || !chartReady) return
    requestAnimationFrame(() => {
      const size = measureMainSize()
      if (size && chartRef.current) {
        chartRef.current.applyOptions({ width: size.width, height: size.height })
        updatePriceOverlayPosition()
      }
    })
  }, [isLoading, chartReady, measureMainSize, updatePriceOverlayPosition])

  // Live stream starts after initial data is loaded
  useEffect(() => {
    if (liveConnRef.current) {
      liveConnRef.current.close()
      liveConnRef.current = null
    }

    if (!supportsLiveStream(symbolMarket) || replayMode || !chartReady || !lastCandleRef.current) {
      if (!supportsLiveStream(symbolMarket) || replayMode) setLiveStatus('idle')
      return
    }

    liveConnRef.current = createBinanceLiveConnection(symbol, timeframe, {
      onStatus: setLiveStatus,
      onKline: (candle) => {
        pushLiveCandle(candle, { scroll: candle.isClosed, fromKline: true })
        if (candleDataRef.current.length) {
          const idx = candleDataRef.current.findIndex((d) => d.time === candle.time)
          if (idx >= 0) candleDataRef.current[idx] = { ...candleDataRef.current[idx], ...candle }
          else candleDataRef.current.push(candle)
        }
      },
      onTrade: ({ price, time }) => {
        const cur = lastCandleRef.current
        if (!cur) return
        const openTime = getCandleOpenTime(time, timeframe)
        if (openTime !== cur.time) return
        pushLiveCandle({ time: cur.time, open: cur.open, high: cur.high, low: cur.low, close: price })
      }
    })

    return () => {
      if (liveConnRef.current) {
        liveConnRef.current.close()
        liveConnRef.current = null
      }
    }
  }, [symbolMarket, symbol, timeframe, replayMode, chartReady, dataVersion, pushLiveCandle])

  // Load data once chart is ready
  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current) return

    const controller = new AbortController()
    let cancelled = false

    setError(null)
    setIsLoading(true)
    setLoadProgress(null)

    const load = async () => {
      try {
        const data = await fetchMarketHistory(
          symbol,
          timeframe,
          (p) => {
            if (!cancelled) setLoadProgress(p)
          },
          symbolMarket,
          { signal: controller.signal }
        )
        if (cancelled || !candleSeriesRef.current) return
        candleDataRef.current = data
        const display = getChartDisplayData(data)
        candleSeriesRef.current.setData(display)
        setHistoryLabel(formatHistoryRange(data, display.length))
        if (data.length) {
          const last = data[data.length - 1]
          const prev = data.length > 1 ? data[data.length - 2] : null
          lastCandleRef.current = last
          prevCloseRef.current = prev?.close ?? last.open
          setLatestPrice(last.close)
          setLastCandle({ ...last })
          setPrevCandle(prev)
          setPriceDirection(last.close >= last.open ? 'up' : 'down')
        }
        if (chartRef.current) {
          resetChartView(chartRef.current, { scrollToLive: scrollToLiveOnReset(symbolMarket) })
        }
        requestAnimationFrame(() => updatePriceOverlayPosition())
        setDataVersion((v) => v + 1)
      } catch (err) {
        if (cancelled || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return
        console.error(err)
        setError(err.message || 'Failed to load data')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setLoadProgress(null)
        }
      }
    }
    load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [symbol, timeframe, symbolMarket, chartReady, loadKey, updatePriceOverlayPosition])

  // Re-apply indicators on visible slice only (not full 4mo dataset)
  useEffect(() => {
    if (!candleDataRef.current.length || !chartRef.current || !indicators.length) return
    const replayEnd = replayMode ? Math.max(1, replayRef.current.index) : null
    const replayStart = replayMode ? replayRef.current.startIndex : null
    const display = getVisibleChartData(replayEnd, replayStart)
    if (display.length) applyIndicators(display)
  }, [indicators, applyIndicators, dataVersion, replayMode, getVisibleChartData])

  // Linked symbol sync
  useEffect(() => {
    if (syncSymbol && sharedSymbol) {
      const next = String(sharedSymbol).trim().toUpperCase()
      if (next !== symbol) setSymbol(next)
    }
  }, [sharedSymbol, syncSymbol])

  // TopBar symbol search applies to all charts
  useEffect(() => {
    if (!symbolApplyTick || !sharedSymbol) return
    const next = String(sharedSymbol).trim().toUpperCase()
    if (next !== symbol) setSymbol(next)
  }, [symbolApplyTick])

  useEffect(() => {
    if (syncInterval && sharedTimeframe && sharedTimeframe !== timeframe) setTimeframe(sharedTimeframe)
  }, [sharedTimeframe, syncInterval])

  // Watchlist click → apply to target chart when symbols are unlinked
  useEffect(() => {
    if (!watchlistApply || syncSymbol) return
    if (watchlistApply.chartId !== id) return
    setSymbol(watchlistApply.symbol)
  }, [watchlistApply, syncSymbol, id])

  // Propagate local changes up when sync is on
  useEffect(() => {
    if (syncSymbol && setSharedSymbol && symbol !== sharedSymbol) setSharedSymbol(symbol)
  }, [symbol, syncSymbol, setSharedSymbol, sharedSymbol])

  useEffect(() => {
    if (syncInterval && setSharedTimeframe && timeframe !== sharedTimeframe) setSharedTimeframe(timeframe)
  }, [timeframe, syncInterval, setSharedTimeframe, sharedTimeframe])

  // Apply shared date range from global controls (Apply button)
  useEffect(() => {
    if (!sharedDateRange?.from || !sharedDateRange?.to) return
    applyVisibleDateRange(chartRef.current, sharedDateRange)
    syncSubCharts(sharedDateRange)
  }, [sharedDateRange, syncSubCharts])

  const toggleIndicator = (name) => {
    setIndicators((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]))
  }

  const applyReplayFrame = useCallback((pct, { followHead = false } = {}) => {
    const data = candleDataRef.current
    if (!data.length) return
    const { startIndex, endIndex } = replayRef.current
    const idx = indexFromWindowProgress(pct, startIndex, endIndex)
    replayRef.current.index = idx
    const display = refreshChartDisplay(idx, { followHead })
    if (display.length) {
      setReplayCurrentLabel(formatReplayTime(display[display.length - 1].time))
    }
    setReplayProgress(windowProgressFromIndex(idx, startIndex, endIndex))
    return display
  }, [refreshChartDisplay])

  const resetChartViewport = useCallback(() => {
    if (!chartRef.current) return
    const inReplay = replayMode && !replayPickMode
    const replayIdx = inReplay ? replayRef.current.index : null
    const display = getVisibleChartData(replayIdx, inReplay ? replayRef.current.startIndex : null)
    resetChartView(chartRef.current, {
      scrollToLive: !replayMode && scrollToLiveOnReset(symbolMarket),
      focusBarIndex: inReplay && display.length ? display.length - 1 : null
    })
  }, [replayMode, replayPickMode, symbolMarket, getVisibleChartData])

  const pauseReplayLocal = useCallback(() => {
    setReplayPlaying(false)
    if (replayRef.current.timer) {
      clearInterval(replayRef.current.timer)
      replayRef.current.timer = null
    }
  }, [])

  const playReplayLocal = useCallback(() => {
    const data = candleDataRef.current
    if (!data.length || replayPickModeRef.current) return
    const { startIndex, endIndex } = replayRef.current
    if (startIndex >= endIndex) return
    setReplayPlaying(true)
    if (replayRef.current.timer) clearInterval(replayRef.current.timer)
    const tickMs = Math.max(50, replayRef.current.speedSec * 1000)
    replayRef.current.timer = setInterval(() => {
      const { startIndex: start, endIndex: end } = replayRef.current
      const nextIdx = replayRef.current.index + 1
      if (nextIdx > end) {
        applyReplayFrame(100)
        pauseReplayLocal()
        return
      }
      applyReplayFrame(windowProgressFromIndex(nextIdx, start, end), { followHead: true })
    }, tickMs)
  }, [applyReplayFrame, pauseReplayLocal])

  const exitReplayLocal = useCallback(() => {
    pauseReplayLocal()
    isReplayingRef.current = false
    replayPickModeRef.current = false
    setReplayMode(false)
    setReplayPickMode(false)
    setReplayProgress(0)
    setReplayCurrentLabel('')
    replayRef.current.index = 0
    replayRef.current.startIndex = 1
    replayRef.current.endIndex = 1
    refreshChartDisplay()
    if (chartRef.current) {
      resetChartView(chartRef.current, { scrollToLive: scrollToLiveOnReset(symbolMarket) })
    }
    setDataVersion((v) => v + 1)
  }, [pauseReplayLocal, refreshChartDisplay, symbolMarket])

  const confirmReplayStartAt = useCallback((time) => {
    const data = candleDataRef.current
    if (!data.length) return
    const startIndex = findEndIndexUntilTime(data, time)
    const endIndex = data.length
    if (startIndex >= endIndex) return
    replayRef.current.startIndex = startIndex
    replayRef.current.endIndex = endIndex
    replayRef.current.index = startIndex
    replayPickModeRef.current = false
    setReplayPickMode(false)
    setReplayPlaying(false)
    const display = applyReplayFrame(0)
    if (display?.length && chartRef.current) {
      resetChartView(chartRef.current, { focusBarIndex: display.length - 1 })
    }
  }, [applyReplayFrame])

  const enterReplayMode = useCallback(() => {
    if (!candleDataRef.current.length || !supportsBacktest(symbolMarket)) return
    if (!candleSeriesRef.current || !chartRef.current) return
    if (liveConnRef.current) { liveConnRef.current.close(); liveConnRef.current = null }
    const data = candleDataRef.current
    isReplayingRef.current = true
    replayRef.current.speedSec = replaySpeedSec
    replayRef.current.endIndex = data.length
    replayRef.current.startIndex = 1
    replayRef.current.index = 1
    setReplayMode(true)
    setReplayPlaying(false)
    setReplayProgress(0)
    setReplayCurrentLabel('')
    replayPickModeRef.current = true
    setReplayPickMode(true)
    refreshChartDisplay()
  }, [symbolMarket, replaySpeedSec, refreshChartDisplay])

  const handleReplayReselect = useCallback(() => {
    pauseReplayLocal()
    replayPickModeRef.current = true
    setReplayPickMode(true)
    refreshChartDisplay()
  }, [pauseReplayLocal, refreshChartDisplay])

  const exitReplayMode = useCallback(() => {
    exitReplayLocal()
  }, [exitReplayLocal])

  const toggleReplayPlay = useCallback(() => {
    if (replayPlaying) pauseReplayLocal()
    else playReplayLocal()
  }, [replayPlaying, pauseReplayLocal, playReplayLocal])

  const stepReplayBack = useCallback(() => {
    if (replayPickModeRef.current) return
    pauseReplayLocal()
    const { startIndex, endIndex } = replayRef.current
    const idx = Math.max(startIndex, replayRef.current.index - 1)
    applyReplayFrame(windowProgressFromIndex(idx, startIndex, endIndex))
  }, [applyReplayFrame, pauseReplayLocal])

  const restartReplayTimer = useCallback(() => {
    if (!replayPlaying) return
    pauseReplayLocal()
    playReplayLocal()
  }, [replayPlaying, pauseReplayLocal, playReplayLocal])

  const handleSpeedDown = useCallback(() => {
    const next = nextReplaySpeed(replaySpeedSec, -1)
    setReplaySpeedSec(next)
    replayRef.current.speedSec = next
    restartReplayTimer()
  }, [replaySpeedSec, restartReplayTimer])

  const handleSpeedUp = useCallback(() => {
    const next = nextReplaySpeed(replaySpeedSec, 1)
    setReplaySpeedSec(next)
    replayRef.current.speedSec = next
    restartReplayTimer()
  }, [replaySpeedSec, restartReplayTimer])

  const handleReplaySeek = useCallback((pct) => {
    if (replayPickModeRef.current) return
    applyReplayFrame(pct)
    if (replayPlaying) pauseReplayLocal()
  }, [applyReplayFrame, replayPlaying, pauseReplayLocal])

  const runNavAction = useCallback((fn) => {
    navChangeLockRef.current = true
    fn()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navChangeLockRef.current = false
      })
    })
  }, [])

  const handleChartZoomIn = useCallback(() => {
    runNavAction(() => zoomChart(chartRef.current, 1))
  }, [runNavAction])

  const handleChartZoomOut = useCallback(() => {
    runNavAction(() => zoomChart(chartRef.current, -1))
  }, [runNavAction])

  const handleChartPanLeft = useCallback(() => {
    runNavAction(() => panChart(chartRef.current, -1))
  }, [runNavAction])

  const handleChartPanRight = useCallback(() => {
    runNavAction(() => panChart(chartRef.current, 1))
  }, [runNavAction])

  const handleChartReset = useCallback(() => {
    runNavAction(() => resetChartViewport())
  }, [runNavAction, resetChartViewport])

  useEffect(() => {
    replayPickModeRef.current = replayPickMode
  }, [replayPickMode])

  useEffect(() => {
    onReplayChartClickRef.current = (time) => {
      if (!replayPickModeRef.current) return
      confirmReplayStartAt(time)
    }
  }, [confirmReplayStartAt])

  // Exit replay when symbol/timeframe/asset changes
  useEffect(() => {
    if (replayMode) exitReplayLocal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, symbolMarket])

  const handleSymbolChange = (val) => {
    const next = String(val).trim().toUpperCase()
    setSymbol(next)
    if (syncSymbol && setSharedSymbol) setSharedSymbol(next)
  }

  const handleTimeframeChange = (val) => {
    setTimeframe(val)
    if (syncInterval && setSharedTimeframe) setSharedTimeframe(val)
  }

  return (
    <div className={`chart-card ${isSingle ? 'single' : ''} ${isFocused ? 'focused' : ''}`} ref={overlayWrapRef}>
      <div className="chart-card-top">
        <SymbolInfoStrip
          symbol={symbol}
          lastCandle={lastCandle}
          prevCandle={prevCandle}
          liveStatus={liveStatus}
          ticker24h={ticker24h}
        />
        <div className="chart-card-actions">
          {!syncSymbol && (
            <div className="chart-symbol-input compact">
              <label className="field-label">Symbol</label>
              <Autocomplete value={symbol} onChange={handleSymbolChange} />
            </div>
          )}
          {isFocused ? (
            <button type="button" className="icon-btn" onClick={onMinimize} title="Exit fullscreen">
              <Minimize2 size={16} />
            </button>
          ) : (
            <button type="button" className="icon-btn" onClick={onMaximize} title="Maximize chart">
              <Maximize2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="chart-card-toolbar-row">
        {!syncInterval ? (
          <TimeframePills
            value={timeframe}
            onChange={handleTimeframeChange}
            size="sm"
          />
        ) : (
          <span className="chart-sync-badge">Interval: {timeframe} (linked)</span>
        )}
        {historyLabel && !isLoading && (
          <span className="history-range-badge" title="Loaded backtest history">{historyLabel}</span>
        )}
        <ChartToolbar
          indicators={indicators}
          onToggleIndicator={toggleIndicator}
          replayMode={replayMode}
          onEnterBacktest={enterReplayMode}
          canBacktest={supportsBacktest(symbolMarket) && !isLoading && !!historyLabel}
        />
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button type="button" onClick={() => { setError(null); setLoadKey((v) => v + 1) }}>Retry</button>
        </div>
      )}

      <div className="chart-stack">
        <div className={`chart-main-wrap ${replayMode ? 'replay-active' : ''} ${replayPickMode ? 'replay-pick-mode' : ''}`} ref={mainContainerRef}>
          {isLoading && (
            <ChartSkeleton
              progress={loadProgress}
              symbol={symbol}
              timeframe={timeframe}
            />
          )}
          <div ref={chartHostRef} className={`chart-host ${isLoading ? 'hidden' : ''}`} />
          <div ref={overlayLayerRef} className="chart-overlay-layer">
            {chartReady && !isLoading && (
              <DrawingToolsPanel
                open={drawingPanelOpen}
                onToggle={() => setDrawingPanelOpen((o) => !o)}
                activeTool={drawTool}
                onSelectTool={setDrawTool}
                onClear={clearDrawings}
                drawingCount={drawings.length}
                linked={syncDrawings}
              />
            )}
            <DrawingOverlay
              chartRef={chartRef}
              seriesRef={candleSeriesRef}
              containerRef={overlayLayerRef}
              activeTool={drawTool}
              setActiveTool={setDrawTool}
              drawings={drawings}
              setDrawings={setDrawings}
              selectedId={selectedDrawingId}
              setSelectedId={setSelectedDrawingId}
            />
            <div
              ref={overlayRef}
              className={`price-scale-label visible ${priceDirection}`}
              aria-hidden
            >
              <div className="ps-price">{formatChartPrice(lastCandle?.close ?? latestPrice)}</div>
              <CandleTimer timeframe={timeframe} variant="scale" market={symbolMarket} />
            </div>
            {chartReady && !isLoading && (
              <ChartNavToolbar
                onZoomOut={handleChartZoomOut}
                onZoomIn={handleChartZoomIn}
                onPanLeft={handleChartPanLeft}
                onPanRight={handleChartPanRight}
                onReset={handleChartReset}
              />
            )}
            {replayMode && (
              <ReplayToolbar
                speedSec={replaySpeedSec}
                isPlaying={replayPlaying}
                pickMode={replayPickMode}
                currentLabel={replayCurrentLabel}
                progress={replayProgress}
                onSpeedDown={handleSpeedDown}
                onSpeedUp={handleSpeedUp}
                onStepBack={stepReplayBack}
                onStepForward={toggleReplayPlay}
                onReselect={handleReplayReselect}
                onStop={exitReplayMode}
                onSeek={handleReplaySeek}
              />
            )}
          </div>
        </div>
        {indicators.includes('RSI') && (
          <div className="chart-sub-pane">
            <div className="sub-pane-label">RSI (14)</div>
            <div ref={rsiContainerRef} style={{ height: SUB_PANE_HEIGHT }} />
          </div>
        )}
        {indicators.includes('MACD') && (
          <div className="chart-sub-pane">
            <div className="sub-pane-label">MACD (12, 26, 9)</div>
            <div ref={macdContainerRef} style={{ height: SUB_PANE_HEIGHT }} />
          </div>
        )}
      </div>

    </div>
  )
}
