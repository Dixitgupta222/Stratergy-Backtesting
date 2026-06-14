import React, { useState } from 'react'
import { Link2, ChevronDown } from 'lucide-react'

export default function SyncPanel({
  syncSymbol, setSyncSymbol,
  syncInterval, setSyncInterval,
  syncCrosshair, setSyncCrosshair,
  syncTime, setSyncTime,
  syncDateRange, setSyncDateRange,
  syncDrawings, setSyncDrawings,
  syncReplay, setSyncReplay
}) {
  const [open, setOpen] = useState(false)
  const activeCount = [syncSymbol, syncInterval, syncCrosshair, syncTime, syncDateRange, syncDrawings, syncReplay].filter(Boolean).length

  return (
    <div className="sync-panel">
      <button type="button" className={`sync-panel-toggle ${activeCount ? 'has-active' : ''}`} onClick={() => setOpen((o) => !o)}>
        <Link2 size={14} />
        <span>Link Charts</span>
        {activeCount > 0 && <span className="sync-badge">{activeCount}</span>}
        <ChevronDown size={12} className={open ? 'rotated' : ''} />
      </button>
      {open && (
        <div className="sync-panel-body">
          {[
            ['Symbol', syncSymbol, setSyncSymbol],
            ['Interval', syncInterval, setSyncInterval],
            ['Crosshair', syncCrosshair, setSyncCrosshair],
            ['Time', syncTime, setSyncTime],
            ['Date range', syncDateRange, setSyncDateRange],
            ['Drawings', syncDrawings, setSyncDrawings],
            ['Replay', syncReplay, setSyncReplay]
          ].map(([label, val, setter]) => (
            <label key={label} className="switch">
              {label}
              <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} />
              <span className="slider" />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
