import React, { useCallback, useEffect, useState } from 'react'
import {
  FIB_RETRACEMENT_LEVELS,
  FIB_EXTENSION_LEVELS,
  getDrawingTool
} from '../utils/drawingTools'
import { uid, extendSegment, parallelOffset, hitTestDrawing } from '../utils/drawingGeometry'

const STROKE = 1.5

export default function DrawingOverlay({
  chartRef,
  seriesRef,
  containerRef,
  activeTool,
  setActiveTool,
  drawings,
  setDrawings,
  selectedId,
  setSelectedId
}) {
  const [, tick] = useState(0)
  const [pending, setPending] = useState([])
  const [hover, setHover] = useState(null)

  const refresh = useCallback(() => tick((n) => n + 1), [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const ts = chart.timeScale()
    const unsub = ts.subscribeVisibleTimeRangeChange(refresh)
    return () => unsub && unsub()
  }, [chartRef, refresh])

  useEffect(() => {
    window.addEventListener('resize', refresh)
    return () => window.removeEventListener('resize', refresh)
  }, [refresh])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setDrawings((prev) => prev.filter((d) => d.id !== selectedId))
        setSelectedId(null)
      }
      if (e.key === 'Escape') {
        setPending([])
        setActiveTool('cursor')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, setDrawings, setSelectedId, setActiveTool])

  const toPixel = useCallback((time, price) => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series || time == null || price == null) return null
    const x = chart.timeScale().timeToCoordinate(time)
    const y = series.priceToCoordinate(price)
    if (x == null || y == null) return null
    return { x, y }
  }, [chartRef, seriesRef])

  const fromPixel = useCallback((x, y) => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return null
    const time = chart.timeScale().coordinateToTime(x)
    const price = series.coordinateToPrice(y)
    if (time == null || price == null) return null
    return { time, price }
  }, [chartRef, seriesRef])

  const width = containerRef.current?.clientWidth || 0
  const height = containerRef.current?.clientHeight || 0

  const hitCtx = { toPixel, width, height, seriesRef }

  const finishDrawing = (drawing) => {
    setDrawings((prev) => [...prev, drawing])
    setPending([])
    setActiveTool('cursor')
  }

  const handlePointer = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pt = fromPixel(x, y)
    if (!pt) return

    const tool = getDrawingTool(activeTool)
    if (!tool) return

    if (tool.text) {
      const text = window.prompt('Label text:', '')
      if (text?.trim()) {
        finishDrawing({ id: uid(), type: 'text', time: pt.time, price: pt.price, text: text.trim() })
      }
      return
    }

    if (tool.clicks === 1) {
      if (tool.vertical) {
        finishDrawing({ id: uid(), type: 'vline', time: pt.time, price: pt.price })
      } else if (tool.cross) {
        finishDrawing({ id: uid(), type: 'cross', time: pt.time, price: pt.price })
      } else if (tool.horizontalRay) {
        finishDrawing({ id: uid(), type: 'hray', time: pt.time, price: pt.price })
      } else {
        finishDrawing({ id: uid(), type: 'hline', price: pt.price })
      }
      return
    }

    const next = [...pending, pt]
    if (next.length < tool.clicks) {
      setPending(next)
      return
    }

    const drawing = { id: uid(), type: activeTool, p1: next[0], p2: next[1] }
    if (tool.clicks === 3) drawing.p3 = next[2]
    finishDrawing(drawing)
  }

  const handleMove = (e) => {
    if (!containerRef.current || !pending.length) {
      setHover(null)
      return
    }
    const rect = containerRef.current.getBoundingClientRect()
    const pt = fromPixel(e.clientX - rect.left, e.clientY - rect.top)
    setHover(pt)
  }

  const isDrawing = Boolean(
    pending.length ||
    (activeTool && activeTool !== 'cursor' && activeTool !== 'eraser')
  )
  // Pass-through overlay: handle cursor/eraser via chart clicks so pan/zoom still works
  useEffect(() => {
    const chart = chartRef.current
    if (!chart?.subscribeClick) return
    if (activeTool !== 'cursor' && activeTool !== 'eraser') return
    if (drawings.length === 0) return

    const handler = (param) => {
      if (!param.point) return
      const { x, y } = param.point
      const ctx = { toPixel, width, height, seriesRef }
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(drawings[i], x, y, ctx)) {
          if (activeTool === 'eraser') {
            setDrawings((prev) => prev.filter((d) => d.id !== drawings[i].id))
          } else {
            setSelectedId(drawings[i].id)
          }
          return
        }
      }
      if (activeTool === 'cursor') setSelectedId(null)
    }

    const unsub = chart.subscribeClick(handler)
    return () => unsub && unsub()
  }, [activeTool, drawings, chartRef, toPixel, width, height, seriesRef, setSelectedId, setDrawings])

  const renderLine = (d, color, extend = 'segment', selected = false) => {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    const seg = extendSegment(a, b, width, height, extend)
    if (!seg) return null
    return (
      <line
        key={d.id}
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
      <g key={d.id}>
        <line x1={0} y1={y} x2={width} y2={y} stroke="#f59e0b" strokeWidth={selected ? 2 : STROKE} strokeDasharray="6 4" />
        <text x={6} y={y - 4} fill="#f59e0b" fontSize="10">{Number(d.price).toFixed(4)}</text>
      </g>
    )
  }

  const renderHRay = (d, selected) => {
    const y = seriesRef.current?.priceToCoordinate(d.price)
    const x = toPixel(d.time, d.price)?.x
    if (y == null || x == null) return null
    return (
      <g key={d.id}>
        <line x1={x} y1={y} x2={width} y2={y} stroke="#f59e0b" strokeWidth={selected ? 2 : STROKE} />
        <text x={x + 4} y={y - 4} fill="#f59e0b" fontSize="10">{Number(d.price).toFixed(4)}</text>
      </g>
    )
  }

  const renderVLine = (d, selected) => {
    const x = toPixel(d.time, d.price)?.x
    if (x == null) return null
    return (
      <line key={d.id} x1={x} y1={0} x2={x} y2={height} stroke="#8b5cf6" strokeWidth={selected ? 2 : STROKE} strokeDasharray="4 4" />
    )
  }

  const renderCross = (d, selected) => {
    const pt = toPixel(d.time, d.price)
    if (!pt) return null
    const sw = selected ? 2 : STROKE
    return (
      <g key={d.id}>
        <line x1={0} y1={pt.y} x2={width} y2={pt.y} stroke="#94a3b8" strokeWidth={sw} strokeDasharray="4 4" />
        <line x1={pt.x} y1={0} x2={pt.x} y2={height} stroke="#94a3b8" strokeWidth={sw} strokeDasharray="4 4" />
      </g>
    )
  }

  const renderRect = (d, selected) => {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    const w = Math.abs(b.x - a.x)
    const h = Math.abs(b.y - a.y)
    return (
      <rect
        key={d.id}
        x={x} y={y} width={w} height={h}
        fill="rgba(34,197,94,0.08)"
        stroke="#22c55e"
        strokeWidth={selected ? 2 : STROKE}
      />
    )
  }

  const renderCircle = (d, selected) => {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2
    const rx = Math.abs(b.x - a.x) / 2
    const ry = Math.abs(b.y - a.y) / 2
    return (
      <ellipse
        key={d.id}
        cx={cx} cy={cy} rx={rx} ry={ry}
        fill="rgba(34,197,94,0.08)"
        stroke="#22c55e"
        strokeWidth={selected ? 2 : STROKE}
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
      <g key={d.id}>
        <line x1={left} y1={a.y} x2={right} y2={b.y} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
        {levels.map((level) => {
          const price = d.type === 'fib_extension'
            ? d.p2.price + (d.p2.price - d.p1.price) * level
            : high - range * level
          const y = seriesRef.current?.priceToCoordinate(price)
          if (y == null) return null
          const pct = `${(level * 100).toFixed(1)}%`
          return (
            <g key={`${d.id}-${level}`}>
              <line x1={left} y1={y} x2={right} y2={y} stroke="#a78bfa" strokeWidth={selected ? 2 : 1} strokeDasharray="4 3" />
              <text x={right + 4} y={y + 3} fill="#a78bfa" fontSize="10">{pct}</text>
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
      <g key={d.id}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#06b6d4" strokeWidth={sw} />
        <line x1={off.q1.x} y1={off.q1.y} x2={off.q2.x} y2={off.q2.y} stroke="#06b6d4" strokeWidth={sw} />
        <line x1={a.x} y1={a.y} x2={off.q1.x} y2={off.q1.y} stroke="#06b6d4" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
        <line x1={b.x} y1={b.y} x2={off.q2.x} y2={off.q2.y} stroke="#06b6d4" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
      </g>
    )
  }

  const renderText = (d, selected) => {
    const pt = toPixel(d.time, d.price)
    if (!pt) return null
    return (
      <g key={d.id}>
        <rect x={pt.x - 2} y={pt.y - 14} width={(d.text?.length ?? 1) * 7 + 8} height={18} rx={3} fill="rgba(15,23,42,0.75)" stroke={selected ? '#38bdf8' : '#475569'} />
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
    const label = `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(4)} (${pct}%)`
    return (
      <g key={d.id}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#38bdf8" strokeWidth={selected ? 2 : STROKE} />
        <circle cx={a.x} cy={a.y} r={3} fill="#38bdf8" />
        <circle cx={b.x} cy={b.y} r={3} fill="#38bdf8" />
        <rect x={midX - 50} y={midY - 22} width={100} height={18} rx={3} fill="rgba(15,23,42,0.85)" />
        <text x={midX} y={midY - 10} fill="#38bdf8" fontSize="10" textAnchor="middle">{label}</text>
      </g>
    )
  }

  const renderDrawing = (d) => {
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
      case 'circle': return renderCircle(d, selected)
      case 'fibonacci': return renderFib(d, FIB_RETRACEMENT_LEVELS, selected)
      case 'fib_extension': return renderFib(d, FIB_EXTENSION_LEVELS, selected)
      case 'parallel_channel': return renderChannel(d, selected)
      case 'text': return renderText(d, selected)
      case 'measure': return renderMeasure(d, selected)
      default: return null
    }
  }

  const renderPreview = () => {
    if (!pending.length || !hover) return null
    const tool = getDrawingTool(activeTool)
    if (!tool || tool.clicks < 2) return null

    const preview = { id: 'preview', type: activeTool, p1: pending[0], p2: hover }
    if (pending.length === 2 && tool.clicks === 3) preview.p3 = hover

    const pendingPixels = pending.map((p) => toPixel(p.time, p.price)).filter(Boolean)
    return (
      <g opacity={0.7}>
        {renderDrawing(preview)}
        {pendingPixels.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#2962ff" />
        ))}
      </g>
    )
  }

  const overlayClass = [
    'drawing-overlay',
    isDrawing ? 'draw-mode' : '',
    activeTool === 'cursor' || activeTool === 'eraser' ? 'cursor-mode' : ''
  ].filter(Boolean).join(' ')

  return (
    <svg
      className={overlayClass}
      width={width}
      height={height}
      onClick={isDrawing ? handlePointer : undefined}
      onMouseMove={isDrawing ? handleMove : undefined}
    >
      {drawings.map(renderDrawing)}
      {renderPreview()}
    </svg>
  )
}
