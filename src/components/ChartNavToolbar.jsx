import React from 'react'
import { Minus, Plus, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import GoToDatePicker from './GoToDatePicker'

export default function ChartNavToolbar({
  onZoomOut,
  onZoomIn,
  onPanLeft,
  onPanRight,
  onReset,
  onGoToDate,
  minDate,
  maxDate,
  goToDisabled
}) {
  return (
    <div className="chart-nav-toolbar">
      <GoToDatePicker
        variant="toolbar"
        onGo={onGoToDate}
        minDate={minDate}
        maxDate={maxDate}
        disabled={goToDisabled}
      />
      <button type="button" className="chart-float-btn" onClick={onZoomOut} title="Zoom out">
        <Minus size={18} />
      </button>
      <button type="button" className="chart-float-btn" onClick={onZoomIn} title="Zoom in">
        <Plus size={18} />
      </button>
      <button type="button" className="chart-float-btn" onClick={onPanLeft} title="Scroll left">
        <ChevronLeft size={18} />
      </button>
      <button type="button" className="chart-float-btn" onClick={onPanRight} title="Scroll right">
        <ChevronRight size={18} />
      </button>
      <button type="button" className="chart-float-btn" onClick={onReset} title="Reset chart view">
        <RotateCcw size={16} />
      </button>
    </div>
  )
}
