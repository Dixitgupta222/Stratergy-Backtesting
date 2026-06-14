import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FIB_RETRACEMENT_LEVELS,
  FIB_EXTENSION_LEVELS,
  getDrawingTool
} from '../utils/drawingTools'
import {
  uid,
  extendSegment,
  parallelOffset,
  hitTestDrawing,
  hitTestHandle,
  applyDrawingDrag,
  getDrawingHandles,
  positionMetrics,
  HANDLE_RADIUS,
  cloneDrawing
} from '../utils/drawingGeometry'
import { useChartPaneLayout, chartToPixel, pixelToChart } from '../hooks/useChartPaneLayout'
import {
  buildTimeScaleContext,
  logicalToTime,
  timeToCoordinate,
  coordinateToTime
} from '../utils/chartTimeScale'

const STROKE = 1.5
const DEFAULT_BARS = 20

function defaultEndTime(chart, entryTime, timeScaleCtx) {
  if (!chart) return entryTime + 3600
  const coord = timeToCoordinate(chart, entryTime, timeScaleCtx)
  if (coord == null) return entryTime + 3600
  const next = coordinateToTime(chart, coord + DEFAULT_BARS * 8, timeScaleCtx)
  return next ?? entryTime + 3600
}

function buildPositionFromDrag(tool, entry, current, chart, timeScaleCtx) {
  const isLong = tool.position === 'long'
  const entryPrice = entry.price
  const dragPrice = current.price
  const diff = dragPrice - entryPrice
  const magnitude = Math.abs(diff) || entryPrice * 0.01

  let tpPrice
  let slPrice
  if (isLong) {
    if (diff >= 0) {
      tpPrice = entryPrice + magnitude
      slPrice = entryPrice - magnitude * 0.5
    } else {
      slPrice = entryPrice - magnitude
      tpPrice = entryPrice + magnitude * 0.5
    }
  } else if (diff <= 0) {
    tpPrice = entryPrice - magnitude
    slPrice = entryPrice + magnitude * 0.5
  } else {
    slPrice = entryPrice + magnitude
    tpPrice = entryPrice - magnitude * 0.5
  }

  const endTime = Math.max(
    entry.time,
    current.time,
    chart ? defaultEndTime(chart, entry.time, timeScaleCtx) : entry.time + 3600
  )

  return {
    id: uid(),
    type: isLong ? 'long_position' : 'short_position',
    entryTime: entry.time,
    entryPrice,
    endTime,
    tpPrice,
    slPrice
  }
}

export default function DrawingOverlay({
  chartRef,
  seriesRef,
  containerRef,
  eventRootRef,
  activeTool,
  setActiveTool,
  drawings,
  setDrawings,
  selectedId,
  setSelectedId,
  dataVersion = 0,
  viewSync = 0,
  lastBarTime = null,
  timeframe = '1m'
}) {
  const [pending, setPending] = useState([])
  const [hover, setHover] = useState(null)
  const [createDrag, setCreateDrag] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const paneRef = useRef(null)
  const dragRef = useRef(null)
  const createDragRef = useRef(null)
  const pendingRef = useRef([])
  const stateRef = useRef({})
  const activeToolRef = useRef(activeTool)
  const addPointFromChartRef = useRef(null)
  const finishDrawingRef = useRef(null)
  const resetToCursorRef = useRef(null)

  activeToolRef.current = activeTool

  const { width, height, tick } = useChartPaneLayout(chartRef, dataVersion)

  const timeScaleCtx = useMemo(
    () => buildTimeScaleContext(chartRef.current, lastBarTime, timeframe),
    [chartRef, lastBarTime, timeframe, tick, viewSync]
  )

  const toPixel = useCallback((time, price) => {
    return chartToPixel(chartRef.current, seriesRef.current, time, price, timeScaleCtx)
  }, [chartRef, seriesRef, timeScaleCtx, tick, viewSync])

  const fromPixel = useCallback((x, y) => {
    return pixelToChart(chartRef.current, seriesRef.current, x, y, timeScaleCtx)
  }, [chartRef, seriesRef, timeScaleCtx, tick, viewSync])

  const hitCtx = { toPixel, width, height, seriesRef }

  stateRef.current = {
    activeTool,
    drawings,
    selectedId,
    width,
    height,
    chartRef,
    seriesRef,
    timeScaleCtx,
    setDrawings,
    setSelectedId,
    setCreateDrag,
    setIsDragging,
    finishDrawing: null
  }

  const cancelInProgressDraw = useCallback(() => {
    pendingRef.current = []
    setPending([])
    setHover(null)
    setCreateDrag(null)
    createDragRef.current = null
  }, [])

  const resetToCursor = useCallback(() => {
    cancelInProgressDraw()
    activeToolRef.current = 'cursor'
    setActiveTool('cursor')
  }, [cancelInProgressDraw, setActiveTool])

  resetToCursorRef.current = resetToCursor

  const finishDrawing = useCallback((drawing) => {
    setDrawings((prev) => [...prev, drawing])
    cancelInProgressDraw()
    activeToolRef.current = 'cursor'
    setActiveTool('cursor')
    setSelectedId(drawing.id)
  }, [setDrawings, setActiveTool, setSelectedId, cancelInProgressDraw])

  finishDrawingRef.current = finishDrawing

  stateRef.current.finishDrawing = finishDrawing

  useEffect(() => { pendingRef.current = pending }, [pending])
  useEffect(() => { createDragRef.current = createDrag }, [createDrag])

  // Abandon partial drawings when switching tools
  useEffect(() => {
    pendingRef.current = []
    setPending([])
    setHover(null)
    setCreateDrag(null)
    createDragRef.current = null
  }, [activeTool])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setDrawings((prev) => prev.filter((d) => d.id !== selectedId))
        setSelectedId(null)
      }
      if (e.key === 'Escape') {
        cancelInProgressDraw()
        dragRef.current = null
        setIsDragging(false)
        resetToCursor()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, setDrawings, setSelectedId, cancelInProgressDraw, resetToCursor])

  const addPointFromChart = useCallback((param) => {
    const c = chartRef.current
    const s = seriesRef.current
    if (!c || !s || !param?.point) return null
    const price = s.coordinateToPrice(param.point.y)
    if (price == null) return null

    let time = param.time
    if (time == null && param.logical != null) {
      time = logicalToTime(param.logical, timeScaleCtx)
    }
    if (time == null && param.point.x != null) {
      time = coordinateToTime(c, param.point.x, timeScaleCtx)
    }
    if (time == null) return null
    return { time, price }
  }, [chartRef, seriesRef, timeScaleCtx])

  addPointFromChartRef.current = addPointFromChart

  // One stable chart-click handler — reads active tool from ref (no stale subscription)
  useEffect(() => {
    const c = chartRef.current
    if (!c?.subscribeClick) return

    const handler = (param) => {
      const toolId = activeToolRef.current
      const tool = getDrawingTool(toolId)
      if (!tool || toolId === 'cursor' || toolId === 'eraser' || tool.dragCreate) return

      const pt = addPointFromChartRef.current?.(param)
      if (!pt) return

      if (tool.text) {
        const text = window.prompt('Label text:', '')
        if (text?.trim()) {
          finishDrawingRef.current?.({
            id: uid(),
            type: 'text',
            time: pt.time,
            price: pt.price,
            text: text.trim()
          })
        } else {
          resetToCursorRef.current?.()
        }
        return
      }

      if (tool.clicks === 1) {
        if (tool.vertical) finishDrawingRef.current?.({ id: uid(), type: 'vline', time: pt.time, price: pt.price })
        else if (tool.cross) finishDrawingRef.current?.({ id: uid(), type: 'cross', time: pt.time, price: pt.price })
        else if (tool.horizontalRay) finishDrawingRef.current?.({ id: uid(), type: 'hray', time: pt.time, price: pt.price })
        else finishDrawingRef.current?.({ id: uid(), type: 'hline', price: pt.price })
        return
      }

      const next = [...pendingRef.current, pt]
      if (next.length < tool.clicks) {
        pendingRef.current = next
        setPending(next)
        return
      }

      pendingRef.current = []
      setPending([])
      const drawing = { id: uid(), type: toolId, p1: next[0], p2: next[1] }
      if (tool.clicks === 3) drawing.p3 = next[2]
      finishDrawingRef.current?.(drawing)
    }

    const unsub = c.subscribeClick(handler)
    return () => unsub && unsub()
  }, [chartRef, dataVersion])

  useEffect(() => {
    const c = chartRef.current
    if (!c?.subscribeCrosshairMove) return
    const tool = getDrawingTool(activeTool)
    if (!tool || !pending.length || tool.dragCreate) return

    const handler = (param) => {
      setHover(addPointFromChartRef.current?.(param) ?? null)
    }

    const unsub = c.subscribeCrosshairMove(handler)
    return () => unsub && unsub()
  }, [activeTool, pending.length, chartRef])

  const getPaneCoords = useCallback((e) => {
    const pane = paneRef.current
    const s = stateRef.current
    if (!pane || !s.width || !s.height) return null
    const rect = pane.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    if (px < 0 || py < 0 || px > s.width || py > s.height) return null
    return { px, py }
  }, [])

  const buildHitCtx = useCallback(() => {
    const s = stateRef.current
    return {
      toPixel: (t, p) => chartToPixel(s.chartRef.current, s.seriesRef.current, t, p, s.timeScaleCtx),
      width: s.width,
      height: s.height,
      seriesRef: s.seriesRef
    }
  }, [])

  // Pointer down on chart area (capture on main wrap — clicks pass through overlay)
  useEffect(() => {
    const root = eventRootRef?.current
    if (!root || !width || !height) return

    const onPointerDown = (e) => {
      if (e.button !== 0) return
      if (e.target.closest('.tv-drawing-toolbar, .chart-nav-toolbar, .replay-linked-dock, .replay-floating-toolbar')) return

      const coords = getPaneCoords(e)
      if (!coords) return

      const s = stateRef.current
      const ctx = buildHitCtx()
      const toolId = activeToolRef.current
      const tool = getDrawingTool(toolId)
      const { px, py } = coords

      if (tool?.dragCreate) {
        const pt = pixelToChart(s.chartRef.current, s.seriesRef.current, px, py, s.timeScaleCtx)
        if (!pt) return
        const payload = { tool, entry: pt, current: pt }
        createDragRef.current = payload
        s.setCreateDrag(payload)
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (toolId !== 'cursor' && toolId !== 'eraser') return

      for (let i = s.drawings.length - 1; i >= 0; i--) {
        const d = s.drawings[i]
        const handle = hitTestHandle(d, px, py, ctx)
        if (handle) {
          if (toolId === 'eraser') {
            s.setDrawings((prev) => prev.filter((x) => x.id !== d.id))
            s.setSelectedId(null)
          } else {
            const pt = pixelToChart(s.chartRef.current, s.seriesRef.current, px, py, s.timeScaleCtx)
            if (!pt) return
            dragRef.current = {
              mode: 'point',
              handleKey: handle.key,
              drawingId: d.id,
              startPt: pt,
              snapshot: cloneDrawing(d)
            }
            s.setSelectedId(d.id)
            s.setIsDragging(true)
          }
          e.preventDefault()
          e.stopPropagation()
          return
        }

        if (hitTestDrawing(d, px, py, ctx)) {
          if (toolId === 'eraser') {
            s.setDrawings((prev) => prev.filter((x) => x.id !== d.id))
            s.setSelectedId(null)
          } else {
            const pt = pixelToChart(s.chartRef.current, s.seriesRef.current, px, py, s.timeScaleCtx)
            if (!pt) return
            dragRef.current = {
              mode: 'move',
              handleKey: null,
              drawingId: d.id,
              startPt: pt,
              snapshot: cloneDrawing(d)
            }
            s.setSelectedId(d.id)
            s.setIsDragging(true)
          }
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }

      if (toolId === 'cursor') {
        s.setSelectedId(null)
      }
    }

    root.addEventListener('mousedown', onPointerDown, true)
    return () => root.removeEventListener('mousedown', onPointerDown, true)
  }, [eventRootRef, width, height, tick, getPaneCoords, buildHitCtx])

  // Global move/up — always attached, uses refs (no stale isDragging gap)
  useEffect(() => {
    const onMove = (e) => {
      const cd = createDragRef.current
      if (cd) {
        const coords = getPaneCoords(e)
        if (!coords) return
        const s = stateRef.current
        const pt = pixelToChart(s.chartRef.current, s.seriesRef.current, coords.px, coords.py, s.timeScaleCtx)
        if (pt) {
          const next = { ...cd, current: pt }
          createDragRef.current = next
          s.setCreateDrag(next)
        }
        return
      }

      const drag = dragRef.current
      if (!drag) return

      const coords = getPaneCoords(e)
      if (!coords) return
      const s = stateRef.current
      const pt = pixelToChart(s.chartRef.current, s.seriesRef.current, coords.px, coords.py, s.timeScaleCtx)
      if (!pt) return

      const updated = applyDrawingDrag(drag.snapshot, drag.mode, drag.handleKey, drag.startPt, pt)
      s.setDrawings((prev) => prev.map((d) => (d.id === drag.drawingId ? updated : d)))
    }

    const onUp = () => {
      const cd = createDragRef.current
      if (cd?.entry && cd?.current) {
        const s = stateRef.current
        const draft = buildPositionFromDrag(cd.tool, cd.entry, cd.current, s.chartRef.current, s.timeScaleCtx)
        s.finishDrawing?.(draft)
        createDragRef.current = null
        s.setCreateDrag(null)
        return
      }

      if (dragRef.current) {
        dragRef.current = null
        stateRef.current.setIsDragging(false)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [getPaneCoords])

  useEffect(() => {
    const layer = containerRef.current
    if (!layer) return
    layer.classList.toggle('dragging-drawings', isDragging || !!createDrag)
    return () => layer.classList.remove('dragging-drawings')
  }, [isDragging, createDrag, containerRef])

  const renderHandles = (d) => {
    if (d.id !== selectedId) return null
    return getDrawingHandles(d, hitCtx).map((h) => (
      <circle
        key={`${d.id}-${h.key}`}
        cx={h.x}
        cy={h.y}
        r={HANDLE_RADIUS}
        className="drawing-handle"
        fill="#ffffff"
        stroke="#2962ff"
        strokeWidth={2}
      />
    ))
  }

  const renderLine = (d, color, extend = 'segment', selected = false) => {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    const seg = extendSegment(a, b, width, height, extend)
    if (!seg) return null
    return (
      <line
        x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
        stroke={color}
        strokeWidth={selected ? STROKE + 1 : STROKE}
        strokeDasharray={selected ? '6 3' : undefined}
      />
    )
  }

  const renderHLine = (d, selected) => {
    const y = seriesRef.current?.priceToCoordinate(d.price)
    if (y == null) return null
    return (
      <g>
        <line x1={0} y1={y} x2={width} y2={y} stroke="#f59e0b" strokeWidth={selected ? 2 : STROKE} strokeDasharray="6 4" />
        <text x={4} y={y - 4} fill="#f59e0b" fontSize="10">{Number(d.price).toFixed(4)}</text>
      </g>
    )
  }

  const renderHRay = (d, selected) => {
    const y = seriesRef.current?.priceToCoordinate(d.price)
    const x = toPixel(d.time, d.price)?.x
    if (y == null || x == null) return null
    return (
      <g>
        <line x1={x} y1={y} x2={width} y2={y} stroke="#f59e0b" strokeWidth={selected ? 2 : STROKE} />
        <text x={x + 4} y={y - 4} fill="#f59e0b" fontSize="10">{Number(d.price).toFixed(4)}</text>
      </g>
    )
  }

  const renderVLine = (d, selected) => {
    const x = toPixel(d.time, d.price)?.x
    if (x == null) return null
    return (
      <line x1={x} y1={0} x2={x} y2={height} stroke="#8b5cf6" strokeWidth={selected ? 2 : STROKE} strokeDasharray="4 4" />
    )
  }

  const renderCross = (d, selected) => {
    const pt = toPixel(d.time, d.price)
    if (!pt) return null
    const sw = selected ? 2 : STROKE
    return (
      <g>
        <line x1={0} y1={pt.y} x2={width} y2={pt.y} stroke="#94a3b8" strokeWidth={sw} strokeDasharray="4 4" />
        <line x1={pt.x} y1={0} x2={pt.x} y2={height} stroke="#94a3b8" strokeWidth={sw} strokeDasharray="4 4" />
      </g>
    )
  }

  const renderRect = (d, selected) => {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    return (
      <rect
        x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
        width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)}
        fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth={selected ? 2 : STROKE}
      />
    )
  }

  const renderFib = (d, levels, selected) => {
    const high = Math.max(d.p1.price, d.p2.price)
    const low = Math.min(d.p1.price, d.p2.price)
    const range = high - low
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    const left = Math.min(a.x, b.x)
    const right = Math.max(a.x, b.x)
    return (
      <g>
        <line x1={left} y1={a.y} x2={right} y2={b.y} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
        {levels.map((level) => {
          const price = high - range * level
          const y = seriesRef.current?.priceToCoordinate(price)
          if (y == null) return null
          return (
            <g key={level}>
              <line x1={left} y1={y} x2={right} y2={y} stroke="#a78bfa" strokeWidth={selected ? 2 : 1} strokeDasharray="4 3" />
              <text x={right + 4} y={y + 3} fill="#a78bfa" fontSize="10">{(level * 100).toFixed(1)}%</text>
            </g>
          )
        })}
      </g>
    )
  }

  const renderChannel = (d, selected) => {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    const c = toPixel(d.p3.time, d.p3.price)
    if (!a || !b || !c) return null
    const off = parallelOffset(a, b, c)
    const sw = selected ? 2 : STROKE
    return (
      <g>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#06b6d4" strokeWidth={sw} />
        <line x1={off.q1.x} y1={off.q1.y} x2={off.q2.x} y2={off.q2.y} stroke="#06b6d4" strokeWidth={sw} />
      </g>
    )
  }

  const renderText = (d, selected) => {
    const pt = toPixel(d.time, d.price)
    if (!pt) return null
    return (
      <g>
        <rect x={pt.x - 2} y={pt.y - 14} width={(d.text?.length ?? 1) * 7 + 8} height={18} rx={3}
          fill="rgba(15,23,42,0.85)" stroke={selected ? '#38bdf8' : '#475569'} />
        <text x={pt.x + 2} y={pt.y} fill="#e2e8f0" fontSize="11">{d.text}</text>
      </g>
    )
  }

  const renderMeasure = (d, selected) => {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    const priceDiff = d.p2.price - d.p1.price
    const pct = d.p1.price ? ((priceDiff / d.p1.price) * 100).toFixed(2) : '0'
    const midX = (a.x + b.x) / 2
    const midY = (a.y + b.y) / 2
    return (
      <g>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#38bdf8" strokeWidth={selected ? 2 : STROKE} />
        <circle cx={a.x} cy={a.y} r={4} fill="#38bdf8" />
        <circle cx={b.x} cy={b.y} r={4} fill="#38bdf8" />
        <text x={midX} y={midY - 8} fill="#38bdf8" fontSize="10" textAnchor="middle">
          {`${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pct}%)`}
        </text>
      </g>
    )
  }

  const renderPosition = (d, selected) => {
    const isLong = d.type === 'long_position'
    const entry = toPixel(d.entryTime, d.entryPrice)
    const endX = toPixel(d.endTime, d.entryPrice)?.x
    const tpY = seriesRef.current?.priceToCoordinate(d.tpPrice)
    const slY = seriesRef.current?.priceToCoordinate(d.slPrice)
    if (!entry || endX == null || tpY == null || slY == null) return null

    const left = Math.min(entry.x, endX)
    const right = Math.max(entry.x, endX)
    const entryY = entry.y
    const { rr, rewardPct, riskPct } = positionMetrics(d)
    const sw = selected ? 2 : 1.5

    return (
      <g className="position-drawing">
        <rect x={left} y={Math.min(entryY, tpY)} width={right - left} height={Math.abs(entryY - tpY) || 1} fill="rgba(8,153,129,0.25)" />
        <rect x={left} y={Math.min(entryY, slY)} width={right - left} height={Math.abs(entryY - slY) || 1} fill="rgba(242,54,69,0.25)" />
        <line x1={left} y1={tpY} x2={right} y2={tpY} stroke="#089981" strokeWidth={sw} />
        <line x1={left} y1={slY} x2={right} y2={slY} stroke="#f23645" strokeWidth={sw} />
        <line x1={left} y1={entryY} x2={right} y2={entryY} stroke="#d1d4dc" strokeWidth={sw + 0.5} />
        <line x1={right} y1={Math.min(tpY, slY, entryY) - 6} x2={right} y2={Math.max(tpY, slY, entryY) + 6} stroke="#787b86" strokeWidth={2} />
        <text x={left + 6} y={tpY - 4} fill="#089981" fontSize="10" fontWeight="600">Target {rewardPct.toFixed(2)}%</text>
        <text x={left + 6} y={entryY - 4} fill="#d1d4dc" fontSize="10" fontWeight="600">{isLong ? 'Long' : 'Short'} R:R {rr.toFixed(2)}</text>
        <text x={left + 6} y={slY + 12} fill="#f23645" fontSize="10" fontWeight="600">Stop {riskPct.toFixed(2)}%</text>
      </g>
    )
  }

  const renderBody = (d) => {
    const selected = d.id === selectedId
    switch (d.type) {
      case 'trendline': return renderLine(d, '#2962ff', 'segment', selected)
      case 'ray': return renderLine(d, '#2962ff', 'forward', selected)
      case 'extended': return renderLine(d, '#2962ff', 'both', selected)
      case 'hline': return renderHLine(d, selected)
      case 'hray': return renderHRay(d, selected)
      case 'vline': return renderVLine(d, selected)
      case 'cross': return renderCross(d, selected)
      case 'rectangle': return renderRect(d, selected)
      case 'fibonacci': return renderFib(d, FIB_RETRACEMENT_LEVELS, selected)
      case 'fib_extension': return renderFib(d, FIB_EXTENSION_LEVELS, selected)
      case 'parallel_channel': return renderChannel(d, selected)
      case 'text': return renderText(d, selected)
      case 'measure': return renderMeasure(d, selected)
      case 'long_position':
      case 'short_position': return renderPosition(d, selected)
      default: return null
    }
  }

  const renderDrawing = (d) => {
    const body = renderBody(d)
    if (!body) return null
    return (
      <g key={d.id} className={d.id === selectedId ? 'drawing-selected' : ''}>
        {body}
        {renderHandles(d)}
      </g>
    )
  }

  const renderPreview = () => {
    if (createDrag) {
      const draft = buildPositionFromDrag(createDrag.tool, createDrag.entry, createDrag.current, chartRef.current, timeScaleCtx)
      return <g opacity={0.85}>{renderBody({ ...draft, id: 'preview' })}</g>
    }

    if (!pending.length || !hover) return null
    const tool = getDrawingTool(activeTool)
    if (!tool || tool.dragCreate || tool.clicks < 2) return null

    const preview = { id: 'preview', type: activeTool, p1: pending[0], p2: hover }
    if (pending.length === 2 && tool.clicks === 3) preview.p3 = hover

    return (
      <g opacity={0.75}>
        {renderBody(preview)}
        {pending.map((p, i) => {
          const px = toPixel(p.time, p.price)
          return px ? <circle key={i} cx={px.x} cy={px.y} r={4} fill="#2962ff" /> : null
        })}
      </g>
    )
  }

  const tool = getDrawingTool(activeTool)

  if (!width || !height) return null

  return (
    <div
      ref={paneRef}
      className={`drawing-pane-layer ${createDrag || isDragging ? 'interactive' : ''} ${tool?.dragCreate ? 'crosshair' : ''}`}
      style={{ width, height }}
    >
      <svg className="drawing-overlay" width={width} height={height}>
        {drawings.map(renderDrawing)}
        {renderPreview()}
      </svg>
    </div>
  )
}
