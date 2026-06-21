import React, { useEffect, useState } from 'react'
import Autocomplete from './Autocomplete'
import TimeframePills from './TimeframePills'
import SyncPanel from './SyncPanel'
import MarketStatus from './MarketStatus'
import GoToDatePicker, { makeGoToDateRequest } from './GoToDatePicker'
import { dateInputToTimestamp, timestampToDateInput } from '../utils/chartHelpers'

export default function TopBar({
  sharedSymbol,
  onApplySymbol,
  sharedTimeframe,
  setSharedTimeframe,
  sharedDateRange,
  setSharedDateRange,
  setSharedGoToDate,
  syncSymbol, setSyncSymbol,
  syncInterval, setSyncInterval,
  syncCrosshair, setSyncCrosshair,
  syncTime, setSyncTime,
  syncDateRange, setSyncDateRange,
  syncDrawings, setSyncDrawings,
  syncReplay, setSyncReplay
}) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateOpen, setDateOpen] = useState(false)

  useEffect(() => {
    setDateFrom(timestampToDateInput(sharedDateRange?.from))
    setDateTo(timestampToDateInput(sharedDateRange?.to))
  }, [sharedDateRange])

  const applyDateRange = () => {
    const from = dateInputToTimestamp(dateFrom)
    const to = dateInputToTimestamp(dateTo, true)
    if (from && to && from < to) setSharedDateRange({ from, to })
    setDateOpen(false)
  }

  const clearDateRange = () => {
    setDateFrom('')
    setDateTo('')
    setSharedDateRange(null)
    setDateOpen(false)
  }

  const handleGlobalGoToDate = (_dateStr, dayStartSec) => {
    setSharedGoToDate(makeGoToDateRequest(dayStartSec))
    setDateOpen(false)
    return true
  }

  return (
    <header className="topbar">
      <div className="topbar-section topbar-market">
        <MarketStatus symbol={sharedSymbol} />
      </div>

      <div className="topbar-section topbar-symbol">
        <label className="field-label">Symbol</label>
        <Autocomplete
          value={sharedSymbol}
          onChange={(val) => {
            if (val) onApplySymbol(val)
          }}
        />
        {!syncSymbol && <span className="topbar-hint-sm">Search applies to all charts</span>}
      </div>

      <div className="topbar-section topbar-timeframe">
        {syncInterval ? (
          <>
            <label className="field-label">Interval</label>
            <TimeframePills value={sharedTimeframe} onChange={setSharedTimeframe} size="sm" />
          </>
        ) : (
          <span className="topbar-hint">Interval set per chart</span>
        )}
      </div>

      <div className="topbar-section topbar-actions">
        <div className="date-range-wrap">
          <button type="button" className="btn-ghost" onClick={() => setDateOpen((o) => !o)}>
            Calendar
          </button>
          {dateOpen && (
            <div className="date-range-popover date-range-popover--wide">
              <div className="date-range-section">
                <div className="date-range-section-title">Go to date</div>
                <p className="date-range-section-hint">Jump all charts to a specific day</p>
                <GoToDatePicker
                  variant="inline"
                  onGo={handleGlobalGoToDate}
                  title="Go to date on all charts"
                />
              </div>

              <div className="date-range-divider" />

              <div className="date-range-section">
                <div className="date-range-section-title">Date range</div>
                <p className="date-range-section-hint">Zoom to a from–to window</p>
                <div className="date-range-row">
                  <label>From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="date-range-row">
                  <label>To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="date-range-actions">
                  <button type="button" className="btn-primary" onClick={applyDateRange}>Apply range</button>
                  <button type="button" className="btn-ghost" onClick={clearDateRange}>Reset</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <SyncPanel
          syncSymbol={syncSymbol} setSyncSymbol={setSyncSymbol}
          syncInterval={syncInterval} setSyncInterval={setSyncInterval}
          syncCrosshair={syncCrosshair} setSyncCrosshair={setSyncCrosshair}
          syncTime={syncTime} setSyncTime={setSyncTime}
          syncDateRange={syncDateRange} setSyncDateRange={setSyncDateRange}
          syncDrawings={syncDrawings} setSyncDrawings={setSyncDrawings}
          syncReplay={syncReplay} setSyncReplay={setSyncReplay}
        />
      </div>
    </header>
  )
}
