export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function cloneDrawing(d) {
  return JSON.parse(JSON.stringify(d))
}

const HANDLE_RADIUS = 6
const HANDLE_HIT = 14

function dist(px, py, x, y) {
  return Math.hypot(px - x, y - py)
}

function pointHandle(key, x, y) {
  return { key, x, y, role: 'point' }
}

function edgeHandle(key, x, y) {
  return { key, x, y, role: 'edge' }
}

/** Visible + hit-test handles for selected drawing */
export function getDrawingHandles(d, ctx) {
  const { toPixel, width, height, seriesRef } = ctx
  const handles = []

  if (d.type === 'long_position' || d.type === 'short_position') {
    const entry = toPixel(d.entryTime, d.entryPrice)
    const endX = toPixel(d.endTime, d.entryPrice)?.x
    const tpY = seriesRef.current?.priceToCoordinate(d.tpPrice)
    const slY = seriesRef.current?.priceToCoordinate(d.slPrice)
    const entryY = entry?.y
    if (entry && endX != null && tpY != null && slY != null && entryY != null) {
      const midX = (entry.x + endX) / 2
      handles.push(pointHandle('entry', entry.x, entryY))
      handles.push(pointHandle('tp', midX, tpY))
      handles.push(pointHandle('sl', midX, slY))
      handles.push(edgeHandle('right', endX, entryY))
    }
    return handles
  }

  if (d.type === 'hline') {
    const y = seriesRef.current?.priceToCoordinate(d.price)
    if (y != null) handles.push(pointHandle('price', width / 2, y))
    return handles
  }

  if (d.type === 'hray') {
    const y = seriesRef.current?.priceToCoordinate(d.price)
    const x = toPixel(d.time, d.price)?.x
    if (y != null && x != null) {
      handles.push(pointHandle('anchor', x, y))
      handles.push(pointHandle('price', width * 0.75, y))
    }
    return handles
  }

  if (d.type === 'vline' || d.type === 'cross' || d.type === 'text') {
    const pt = toPixel(d.time, d.price)
    if (pt) handles.push(pointHandle('anchor', pt.x, pt.y))
    return handles
  }

  if (d.p1) handles.push(pointHandle('p1', toPixel(d.p1.time, d.p1.price)?.x, toPixel(d.p1.time, d.p1.price)?.y))
  if (d.p2) handles.push(pointHandle('p2', toPixel(d.p2.time, d.p2.price)?.x, toPixel(d.p2.time, d.p2.price)?.y))
  if (d.p3) handles.push(pointHandle('p3', toPixel(d.p3.time, d.p3.price)?.x, toPixel(d.p3.time, d.p3.price)?.y))

  return handles.filter((h) => h.x != null && h.y != null)
}

export function hitTestHandle(d, px, py, ctx) {
  const handles = getDrawingHandles(d, ctx)
  let best = null
  let bestDist = HANDLE_HIT
  for (const h of handles) {
    const d0 = dist(px, py, h.x, h.y)
    if (d0 <= bestDist) {
      bestDist = d0
      best = h
    }
  }
  return best
}

/** Apply drag delta to a drawing snapshot; returns updated drawing */
export function applyDrawingDrag(d, mode, handleKey, startPt, currentPt) {
  if (!startPt || !currentPt) return d
  const dt = currentPt.time - startPt.time
  const dp = currentPt.price - startPt.price
  const next = cloneDrawing(d)

  if (mode === 'move') {
    if (next.type === 'long_position' || next.type === 'short_position') {
      next.entryTime += dt
      next.endTime += dt
      next.entryPrice += dp
      next.tpPrice += dp
      next.slPrice += dp
      return next
    }
    if (next.type === 'hline') {
      next.price += dp
      return next
    }
    if (next.type === 'hray' || next.type === 'vline' || next.type === 'cross' || next.type === 'text') {
      next.time += dt
      if (next.price != null) next.price += dp
      return next
    }
    if (next.p1) next.p1 = { time: next.p1.time + dt, price: next.p1.price + dp }
    if (next.p2) next.p2 = { time: next.p2.time + dt, price: next.p2.price + dp }
    if (next.p3) next.p3 = { time: next.p3.time + dt, price: next.p3.price + dp }
    return next
  }

  if (mode === 'point') {
    if (next.type === 'long_position' || next.type === 'short_position') {
      if (handleKey === 'entry') {
        next.entryTime = currentPt.time
        next.entryPrice = currentPt.price
      } else if (handleKey === 'tp') {
        next.tpPrice = currentPt.price
      } else if (handleKey === 'sl') {
        next.slPrice = currentPt.price
      } else if (handleKey === 'right') {
        next.endTime = Math.max(next.entryTime + 60, currentPt.time)
      }
      return next
    }
    if (next.type === 'hline' && handleKey === 'price') {
      next.price = currentPt.price
      return next
    }
    if ((next.type === 'hray' || next.type === 'vline' || next.type === 'cross' || next.type === 'text') && handleKey === 'anchor') {
      next.time = currentPt.time
      next.price = currentPt.price
      return next
    }
    if (handleKey === 'p1' && next.p1) next.p1 = { ...currentPt }
    if (handleKey === 'p2' && next.p2) next.p2 = { ...currentPt }
    if (handleKey === 'p3' && next.p3) next.p3 = { ...currentPt }
    if (handleKey === 'price' && next.type === 'hray') next.price = currentPt.price
  }

  return next
}

export function positionMetrics(d) {
  const entry = d.entryPrice
  const risk = Math.abs(entry - d.slPrice)
  const reward = Math.abs(d.tpPrice - entry)
  const rr = risk > 0 ? reward / risk : 0
  const riskPct = entry ? (Math.abs(entry - d.slPrice) / entry) * 100 : 0
  const rewardPct = entry ? (Math.abs(d.tpPrice - entry) / entry) * 100 : 0
  return { risk, reward, rr, riskPct, rewardPct }
}

export { HANDLE_RADIUS }

/** Extend segment to chart bounds */
export function extendSegment(a, b, width, height, mode = 'segment') {
  if (!a || !b) return null
  if (mode === 'segment') return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }

  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }

  const points = []
  const add = (x, y) => {
    if (x >= -1 && x <= width + 1 && y >= -1 && y <= height + 1) points.push({ x, y })
  }

  if (Math.abs(dx) > 0.001) {
    const tLeft = (0 - a.x) / dx
    add(0, a.y + tLeft * dy)
    const tRight = (width - a.x) / dx
    add(width, a.y + tRight * dy)
  }
  if (Math.abs(dy) > 0.001) {
    const tTop = (0 - a.y) / dy
    add(a.x + tTop * dx, 0)
    const tBottom = (height - a.y) / dy
    add(a.x + tBottom * dx, height)
  }

  if (points.length < 2) return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }

  let best = { x1: points[0].x, y1: points[0].y, x2: points[1].x, y2: points[1].y }
  let maxDist = -1
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)
      if (dist > maxDist) {
        maxDist = dist
        best = { x1: points[i].x, y1: points[i].y, x2: points[j].x, y2: points[j].y }
      }
    }
  }

  if (mode === 'forward') {
    const dir = Math.hypot(dx, dy)
    const mid = { x: (best.x1 + best.x2) / 2, y: (best.y1 + best.y2) / 2 }
    const dot = (mid.x - a.x) * dx + (mid.y - a.y) * dy
    if (dot < 0) best = { x1: best.x2, y1: best.y2, x2: best.x1, y2: best.y1 }
    return { x1: a.x, y1: a.y, x2: best.x2, y2: best.y2 }
  }

  return best
}

export function parallelOffset(p1, p2, p3) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const dist = (p3.x - p1.x) * nx + (p3.y - p1.y) * ny
  return {
    q1: { x: p1.x + nx * dist, y: p1.y + ny * dist },
    q2: { x: p2.x + nx * dist, y: p2.y + ny * dist }
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/** Hit test drawing at pixel coords; returns drawing id or null */
export function hitTestDrawing(d, px, py, ctx) {
  const { toPixel, width, height, seriesRef } = ctx
  const threshold = 10

  if (d.type === 'hline') {
    const y = seriesRef.current?.priceToCoordinate(d.price)
    return y != null && Math.abs(py - y) <= threshold ? d.id : null
  }

  if (d.type === 'hray') {
    const y = seriesRef.current?.priceToCoordinate(d.price)
    const x = toPixel(d.time, d.price)?.x
    return y != null && x != null && py >= y - threshold && py <= y + threshold && px >= x - threshold ? d.id : null
  }

  if (d.type === 'vline') {
    const x = toPixel(d.time, d.price)?.x
    return x != null && Math.abs(px - x) <= threshold ? d.id : null
  }

  if (d.type === 'cross') {
    const pt = toPixel(d.time, d.price)
    if (!pt) return null
    const onH = Math.abs(py - pt.y) <= threshold
    const onV = Math.abs(px - pt.x) <= threshold
    return onH || onV ? d.id : null
  }

  if (d.type === 'long_position' || d.type === 'short_position') {
    const entry = toPixel(d.entryTime, d.entryPrice)
    const endX = toPixel(d.endTime, d.entryPrice)?.x
    const tpY = seriesRef.current?.priceToCoordinate(d.tpPrice)
    const slY = seriesRef.current?.priceToCoordinate(d.slPrice)
    const entryY = entry?.y
    if (!entry || endX == null || tpY == null || slY == null || entryY == null) return null
    const left = Math.min(entry.x, endX)
    const right = Math.max(entry.x, endX)
    const top = Math.min(tpY, slY, entryY)
    const bottom = Math.max(tpY, slY, entryY)
    if (px >= left - threshold && px <= right + threshold && py >= top - threshold && py <= bottom + threshold) {
      return d.id
    }
    return null
  }

  if (d.type === 'text') {
    const pt = toPixel(d.time, d.price)
    if (!pt) return null
    const tw = (d.text?.length ?? 4) * 7
    return px >= pt.x && px <= pt.x + tw && py >= pt.y - 14 && py <= pt.y + 4 ? d.id : null
  }

  if (d.type === 'rectangle' || d.type === 'circle') {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    const left = Math.min(a.x, b.x)
    const right = Math.max(a.x, b.x)
    const top = Math.min(a.y, b.y)
    const bottom = Math.max(a.y, b.y)
    if (d.type === 'rectangle') {
      const nearEdge =
        (Math.abs(px - left) <= threshold && py >= top && py <= bottom) ||
        (Math.abs(px - right) <= threshold && py >= top && py <= bottom) ||
        (Math.abs(py - top) <= threshold && px >= left && px <= right) ||
        (Math.abs(py - bottom) <= threshold && px >= left && px <= right)
      return nearEdge ? d.id : null
    }
    const cx = (left + right) / 2
    const cy = (top + bottom) / 2
    const rx = (right - left) / 2
    const ry = (bottom - top) / 2
    if (rx < 1 || ry < 1) return null
    const norm = ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2
    return Math.abs(norm - 1) <= 0.15 ? d.id : null
  }

  if (d.p1 && d.p2) {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    if (!a || !b) return null
    const tool = d.type
    let seg
    if (tool === 'ray') seg = extendSegment(a, b, width, height, 'forward')
    else if (tool === 'extended') seg = extendSegment(a, b, width, height, 'both')
    else seg = { x1: a.x, y1: a.y, x2: b.x, y2: b.y }

    if (distToSegment(px, py, seg.x1, seg.y1, seg.x2, seg.y2) <= threshold) return d.id

    if (d.type === 'fibonacci' || d.type === 'fib_extension' || d.type === 'measure') {
      const high = Math.max(d.p1.price, d.p2.price)
      const low = Math.min(d.p1.price, d.p2.price)
      const x1 = Math.min(a.x, b.x)
      const x2 = Math.max(a.x, b.x)
      for (let i = 0; i <= 6; i++) {
        const price = high - (high - low) * (i / 6)
        const y = seriesRef.current?.priceToCoordinate(price)
        if (y != null && Math.abs(py - y) <= threshold && px >= x1 && px <= x2) return d.id
      }
    }
  }

  if (d.type === 'parallel_channel' && d.p3) {
    const a = toPixel(d.p1.time, d.p1.price)
    const b = toPixel(d.p2.time, d.p2.price)
    const c = toPixel(d.p3.time, d.p3.price)
    if (!a || !b || !c) return null
    const off = parallelOffset(a, b, c)
    if (
      distToSegment(px, py, a.x, a.y, b.x, b.y) <= threshold ||
      distToSegment(px, py, off.q1.x, off.q1.y, off.q2.x, off.q2.y) <= threshold
    ) return d.id
  }

  return null
}
