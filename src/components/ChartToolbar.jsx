import React from 'react'
import { BarChart3, TrendingUp, Layers, Activity, LineChart, History } from 'lucide-react'

const INDICATORS = [
  { id: 'SMA', label: 'SMA (20)', icon: TrendingUp },
  { id: 'EMA', label: 'EMA (20)', icon: Activity },
  { id: 'BB', label: 'Bollinger Bands', icon: Layers },
  { id: 'RSI', label: 'RSI (14)', icon: BarChart3 },
  { id: 'MACD', label: 'MACD', icon: LineChart }
]

export default function ChartToolbar({
  indicators,
  onToggleIndicator,
  replayMode,
  onEnterBacktest,
  canBacktest
}) {
  return (
    <div className="chart-toolbar">
      <div className="toolbar-group">
        {INDICATORS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`toolbar-btn ${indicators.includes(id) ? 'active' : ''}`}
            title={label}
            onClick={() => onToggleIndicator(id)}
          >
            <Icon size={14} />
            <span className="toolbar-btn-label">{id}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        {!replayMode && (
          <button
            type="button"
            className="toolbar-btn backtest-btn"
            title="Replay historical candles step-by-step"
            disabled={!canBacktest}
            onClick={onEnterBacktest}
          >
            <History size={14} />
            <span className="toolbar-btn-label">Backtest</span>
          </button>
        )}
      </div>
    </div>
  )
}
