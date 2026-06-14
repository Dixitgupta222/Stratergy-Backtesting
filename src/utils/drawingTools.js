export const FIB_RETRACEMENT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
export const FIB_EXTENSION_LEVELS = [0, 0.618, 1, 1.618, 2.618, 3.618]

export const DRAWING_CATEGORIES = [
  {
    id: 'cursors',
    label: 'Cursors',
    tools: [
      { id: 'cursor', label: 'Pointer', clicks: 0, color: '#d1d4dc' },
      { id: 'eraser', label: 'Eraser', clicks: 0, erase: true, color: '#ef4444' }
    ]
  },
  {
    id: 'lines',
    label: 'Lines',
    tools: [
      { id: 'trendline', label: 'Trend Line', clicks: 2, extend: 'segment', color: '#2962ff' },
      { id: 'ray', label: 'Ray', clicks: 2, extend: 'forward', color: '#2962ff' },
      { id: 'extended', label: 'Extended Line', clicks: 2, extend: 'both', color: '#2962ff' },
      { id: 'hline', label: 'Horizontal Line', clicks: 1, color: '#f59e0b' },
      { id: 'hray', label: 'Horizontal Ray', clicks: 1, horizontalRay: true, color: '#f59e0b' },
      { id: 'vline', label: 'Vertical Line', clicks: 1, vertical: true, color: '#8b5cf6' },
      { id: 'cross', label: 'Cross Line', clicks: 1, cross: true, color: '#94a3b8' }
    ]
  },
  {
    id: 'channels',
    label: 'Channels',
    tools: [
      { id: 'parallel_channel', label: 'Parallel Channel', clicks: 3, color: '#06b6d4' }
    ]
  },
  {
    id: 'shapes',
    label: 'Shapes',
    tools: [
      { id: 'rectangle', label: 'Rectangle', clicks: 2, color: '#22c55e' },
      { id: 'circle', label: 'Ellipse', clicks: 2, color: '#22c55e' }
    ]
  },
  {
    id: 'fib',
    label: 'Fibonacci',
    tools: [
      { id: 'fibonacci', label: 'Fib Retracement', clicks: 2, color: '#a78bfa' },
      { id: 'fib_extension', label: 'Fib Extension', clicks: 3, color: '#c084fc' }
    ]
  },
  {
    id: 'positions',
    label: 'Forecast / Measure',
    tools: [
      { id: 'long_position', label: 'Long Position', clicks: 0, position: 'long', dragCreate: true, color: '#089981' },
      { id: 'short_position', label: 'Short Position', clicks: 0, position: 'short', dragCreate: true, color: '#f23645' }
    ]
  },
  {
    id: 'annotation',
    label: 'Annotation',
    tools: [
      { id: 'text', label: 'Text', clicks: 1, text: true, color: '#e2e8f0' },
      { id: 'measure', label: 'Measure', clicks: 2, color: '#38bdf8' }
    ]
  }
]

export const ALL_DRAWING_TOOLS = DRAWING_CATEGORIES.flatMap((c) => c.tools)

export function getDrawingTool(id) {
  return ALL_DRAWING_TOOLS.find((t) => t.id === id) ?? null
}

export function drawingClicksNeeded(toolId) {
  return getDrawingTool(toolId)?.clicks ?? 2
}
