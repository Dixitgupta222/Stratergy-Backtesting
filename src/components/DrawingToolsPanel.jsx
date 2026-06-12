import React, { useState } from 'react'
import {
  MousePointer2,
  Eraser,
  TrendingUp,
  ArrowUpRight,
  MoveHorizontal,
  Minus,
  ArrowRight,
  SeparatorVertical,
  Plus,
  Square,
  Circle,
  GitBranch,
  Type,
  Ruler,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil
} from 'lucide-react'
import { DRAWING_CATEGORIES } from '../utils/drawingTools'

const TOOL_ICONS = {
  cursor: MousePointer2,
  eraser: Eraser,
  trendline: TrendingUp,
  ray: ArrowUpRight,
  extended: MoveHorizontal,
  hline: Minus,
  hray: ArrowRight,
  vline: SeparatorVertical,
  cross: Plus,
  parallel_channel: GitBranch,
  rectangle: Square,
  circle: Circle,
  fibonacci: GitBranch,
  fib_extension: GitBranch,
  text: Type,
  measure: Ruler
}

export default function DrawingToolsPanel({
  open,
  onToggle,
  activeTool,
  onSelectTool,
  onClear,
  drawingCount = 0,
  linked = false
}) {
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(DRAWING_CATEGORIES.map((c) => [c.id, true]))
  )

  const toggleCategory = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className={`drawing-tools-panel ${open ? 'open' : ''}`}>
      <button
        type="button"
        className={`drawing-tools-toggle ${open ? 'active' : ''}`}
        onClick={onToggle}
        title="Drawing tools"
      >
        <Pencil size={16} />
      </button>

      {open && (
        <div className="drawing-tools-menu">
          <div className="drawing-tools-header">
            <span>
              Drawing tools
              {linked && <span className="drawing-tools-linked">Linked</span>}
            </span>
            {drawingCount > 0 && (
              <button type="button" className="drawing-tools-clear" onClick={onClear} title="Clear all">
                <Trash2 size={12} />
                <span>{drawingCount}</span>
              </button>
            )}
          </div>

          <div className="drawing-tools-body">
            {DRAWING_CATEGORIES.map((category) => (
              <div key={category.id} className="drawing-tools-category">
                <button
                  type="button"
                  className="drawing-tools-category-head"
                  onClick={() => toggleCategory(category.id)}
                >
                  {expanded[category.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span>{category.label}</span>
                </button>
                {expanded[category.id] && (
                  <div className="drawing-tools-list">
                    {category.tools.map((tool) => {
                      const Icon = TOOL_ICONS[tool.id] ?? TrendingUp
                      const isActive = activeTool === tool.id
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          className={`drawing-tool-item ${isActive ? 'active' : ''}`}
                          title={tool.label}
                          onClick={() => onSelectTool(isActive ? 'cursor' : tool.id)}
                        >
                          <span className="drawing-tool-icon" style={{ color: tool.color }}>
                            <Icon size={15} />
                          </span>
                          <span className="drawing-tool-label">{tool.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="drawing-tools-hint">
            {activeTool === 'cursor' && 'Click drawings to select · Del to remove'}
            {activeTool === 'eraser' && 'Click a drawing to erase it'}
            {activeTool && !['cursor', 'eraser'].includes(activeTool) && 'Click on chart to place points'}
          </div>
        </div>
      )}
    </div>
  )
}
