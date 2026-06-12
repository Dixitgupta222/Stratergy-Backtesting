import React, { useEffect, useState } from 'react'
import Autocomplete from './Autocomplete'
import { dateInputToTimestamp, timestampToDateInput } from '../utils/chartHelpers'

export default function Controls({
  assetClass,
  sharedSymbol,
  setSharedSymbol,
  sharedTimeframe,
  setSharedTimeframe,
  sharedDateRange,
  setSharedDateRange,
  syncSymbol,
  setSyncSymbol,
  syncInterval,
  setSyncInterval,
  syncCrosshair,
  setSyncCrosshair,
  syncTime,
  setSyncTime,
  syncDateRange,
  setSyncDateRange
}) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    setDateFrom(timestampToDateInput(sharedDateRange?.from))
    setDateTo(timestampToDateInput(sharedDateRange?.to))
  }, [sharedDateRange])

  const applyDateRange = () => {
    const from = dateInputToTimestamp(dateFrom)
    const to = dateInputToTimestamp(dateTo, true)
    if (from && to && from < to) setSharedDateRange({ from, to })
  }

  const clearDateRange = () => {
    setDateFrom('')
    setDateTo('')
    setSharedDateRange(null)
  }

  return (
    <div className="controls">
      <div>
        <label>Symbol: </label>
        <Autocomplete
          value={sharedSymbol}
          onChange={(val) => setSharedSymbol(String(val).trim().toUpperCase())}
          assetClass={assetClass}
        />
      </div>
      <div>
        <label>Timeframe: </label>
        <select value={sharedTimeframe} onChange={(e) => setSharedTimeframe(e.target.value)}>
          <option value="1m">1m</option>
          <option value="5m">5m</option>
          <option value="15m">15m</option>
          <option value="1h">1h</option>
          <option value="4h">4h</option>
          <option value="1d">1d</option>
          <option value="1w">1w</option>
          <option value="1M">1M</option>
        </select>
      </div>

      <div className="date-range-group">
        <label>From: </label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <label>To: </label>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button type="button" className="apply-btn" onClick={applyDateRange}>Apply</button>
        <button type="button" className="clear-btn-sm" onClick={clearDateRange}>Reset</button>
      </div>

      <div className="sync-group">
        <div className="sync-title">Sync In Layout</div>
        <label className="switch">Symbol
          <input type="checkbox" checked={syncSymbol} onChange={(e) => setSyncSymbol(e.target.checked)} />
          <span className="slider" />
        </label>
        <label className="switch">Interval
          <input type="checkbox" checked={syncInterval} onChange={(e) => setSyncInterval(e.target.checked)} />
          <span className="slider" />
        </label>
        <label className="switch">Crosshair
          <input type="checkbox" checked={syncCrosshair} onChange={(e) => setSyncCrosshair(e.target.checked)} />
          <span className="slider" />
        </label>
        <label className="switch">Time
          <input type="checkbox" checked={syncTime} onChange={(e) => setSyncTime(e.target.checked)} />
          <span className="slider" />
        </label>
        <label className="switch">Date range
          <input type="checkbox" checked={syncDateRange} onChange={(e) => setSyncDateRange(e.target.checked)} />
          <span className="slider" />
        </label>
      </div>
      <div className="controls-hint">Asset: {assetClass}</div>
    </div>
  )
}
