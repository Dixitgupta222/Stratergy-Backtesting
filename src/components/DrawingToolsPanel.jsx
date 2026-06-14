import React from 'react'
import {
  MousePointer2,
  Eraser,
  TrendingUp,
  ArrowUpRight,
  Minus,
  SeparatorVertical,
  GitBranch,
  Square,
  Type,
  Ruler,
  Trash2,
  TrendingDown,
  Layers
} from 'lucide-react'

/** TradingView-style left toolbar — icon strip, primary tools always visible */
export const TV_DRAWING_TOOLS = [
  { id: 'cursor', label: 'Pointer', icon: MousePointer2, color: '#d1d4dc' },
  { id: 'trendline', label: 'Trend Line', icon: TrendingUp, color: '#2962ff' },
  { id: 'ray', label: 'Ray', icon: ArrowUpRight, color: '#2962ff' },
  { id: 'hline', label: 'Horizontal Line', icon: Minus, color: '#f59e0b' },
  { id: 'vline', label: 'Vertical Line', icon: SeparatorVertical, color: '#8b5cf6' },
  { id: 'parallel_channel', label: 'Parallel Channel', icon: GitBranch, color: '#06b6d4' },
  { id: 'fibonacci', label: 'Fib Retracement', icon: Layers, color: '#a78bfa' },
  { id: 'long_position', label: 'Long Position', icon: TrendingUp, color: '#089981' },
  { id: 'short_position', label: 'Short Position', icon: TrendingDown, color: '#f23645' },
  { id: 'rectangle', label: 'Rectangle', icon: Square, color: '#22c55e' },
  { id: 'text', label: 'Text', icon: Type, color: '#e2e8f0' },
  { id: 'measure', label: 'Measure', icon: Ruler, color: '#38bdf8' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, color: '#ef4444' }
]

export default function DrawingToolsPanel({
  activeTool,
  onSelectTool,
  onClear,
  drawingCount = 0,
  linked = false
}) {
  return (
    <div className="tv-drawing-toolbar">
      <div className="tv-drawing-toolbar-track">
        {TV_DRAWING_TOOLS.map(({ id, label, icon: Icon, color }) => {
          const isActive = activeTool === id
          return (
            <button
              key={id}
              type="button"
              className={`tv-drawing-tool-btn ${isActive ? 'active' : ''}`}
              title={label}
              aria-label={label}
              onClick={() => onSelectTool(isActive && id !== 'cursor' ? 'cursor' : id)}
            >
              <Icon size={16} strokeWidth={2} style={{ color: isActive ? '#fff' : color }} />
            </button>
          )
        })}
      </div>

      {drawingCount > 0 && (
        <button type="button" className="tv-drawing-clear-btn" onClick={onClear} title="Clear all drawings">
          <Trash2 size={14} />
          <span>{drawingCount}</span>
        </button>
      )}

      {linked && <span className="tv-drawing-linked-badge">Linked</span>}

      <div className="tv-drawing-hint">
        {activeTool === 'cursor' && 'Select · Drag to move · Handles to resize'}
        {activeTool === 'eraser' && 'Click drawing to delete'}
        {activeTool === 'long_position' && 'Click entry, drag to set target & stop · then pointer'}
        {activeTool === 'short_position' && 'Click entry, drag to set target & stop · then pointer'}
        {activeTool && !['cursor', 'eraser', 'long_position', 'short_position'].includes(activeTool) && 'Click chart once to draw · returns to pointer'}
      </div>
    </div>
  )
}
