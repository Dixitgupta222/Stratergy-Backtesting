import React from 'react'
import { Minus, Plus, ChevronLeft, ChevronRight, RotateCcw, Square } from 'lucide-react'
import { formatSpeedLabel } from '../utils/replayWindow'

export default function ReplayToolbar({
  speedSec = 1,
  isPlaying = false,
  pickMode = false,
  currentLabel = '',
  progress = 0,
  onSpeedDown,
  onSpeedUp,
  onStepBack,
  onStepForward,
  onReselect,
  onStop,
  onSeek
}) {
  return (
    <>
      {pickMode && (
        <div className="replay-pick-hint">
          Click on the chart to choose where replay starts
        </div>
      )}

      <div className="replay-floating-toolbar">
        <button type="button" className="chart-float-btn" onClick={onSpeedDown} title="Slower">
          <Minus size={18} />
        </button>
        <span className="replay-speed-label" title="Seconds per candle">{formatSpeedLabel(speedSec)}</span>
        <button type="button" className="chart-float-btn" onClick={onSpeedUp} title="Faster">
          <Plus size={18} />
        </button>

        <span className="replay-tool-divider" />

        <button type="button" className="chart-float-btn" onClick={onStepBack} title="Previous candle" disabled={pickMode}>
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className={`chart-float-btn ${isPlaying ? 'active' : ''}`}
          onClick={onStepForward}
          title={isPlaying ? 'Pause' : 'Play / next candle'}
          disabled={pickMode}
        >
          <ChevronRight size={18} />
        </button>
        <button type="button" className="chart-float-btn" onClick={onReselect} title="Pick new start on chart">
          <RotateCcw size={16} />
        </button>
        <button type="button" className="chart-float-btn" onClick={onStop} title="Exit backtest">
          <Square size={14} />
        </button>
      </div>

      {!pickMode && (
        <div className="replay-bottom-bar">
          <span className="replay-date-mini">{currentLabel}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="replay-range"
          />
          <span className="replay-pct">{Math.round(progress)}%</span>
        </div>
      )}
    </>
  )
}
