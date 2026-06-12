import React from 'react'
import { LayoutGrid, Sun, Moon, PanelLeftClose, PanelLeft } from 'lucide-react'
import { LAYOUT_PRESETS } from '../utils/layoutPresets'
import { useTheme } from '../context/ThemeContext'
import Watchlist from './Watchlist'

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  layoutId,
  onLayoutChange,
  watchlist,
  onWatchlistSelect,
  activeSymbol
}) {
  const { theme, toggleTheme } = useTheme()

  if (collapsed) {
    return (
      <aside className="sidebar sidebar--collapsed">
        <button type="button" className="sidebar-icon-btn" onClick={onToggleCollapse} title="Expand sidebar">
          <PanelLeft size={18} />
        </button>
        <button type="button" className="sidebar-icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <LayoutGrid size={20} />
        <span>Trading Panel</span>
        <button type="button" className="sidebar-collapse-btn" onClick={onToggleCollapse} title="Collapse">
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Layouts</div>
        <div className="layout-presets">
          {LAYOUT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`layout-preset ${layoutId === p.id ? 'active' : ''}`}
              onClick={() => onLayoutChange(p.id)}
              title={p.label}
            >
              <LayoutPresetIcon preset={p} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section sidebar-section--grow">
        <Watchlist
          symbols={watchlist.symbols}
          tickers={watchlist.tickers}
          onSelect={onWatchlistSelect}
          onAdd={watchlist.addSymbol}
          onRemove={watchlist.removeSymbol}
          activeSymbol={activeSymbol}
        />
      </div>

      <div className="sidebar-footer">
        <button type="button" className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  )
}

function LayoutPresetIcon({ preset }) {
  const cells = preset.count
  const cols = preset.cols
  const rows = Math.ceil(cells / cols)
  return (
    <div className="layout-preset-icon" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {Array.from({ length: cells }, (_, i) => (
        <div key={i} className="layout-preset-cell" />
      ))}
    </div>
  )
}
