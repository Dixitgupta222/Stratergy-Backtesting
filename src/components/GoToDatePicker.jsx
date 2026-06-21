import React, { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { dateInputToTimestamp, timestampToDateInput } from '../utils/chartHelpers'
import { formatChartDate } from '../utils/chartTimezone'

export default function GoToDatePicker({
  onGo,
  minDate = '',
  maxDate = '',
  disabled = false,
  variant = 'toolbar',
  title = 'Go to date'
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const submit = () => {
    if (!value) {
      setError('Pick a date')
      return
    }
    const ts = dateInputToTimestamp(value)
    if (!ts) {
      setError('Invalid date')
      return
    }
    if (minDate && value < minDate) {
      setError(`Before loaded data (${formatChartDate(dateInputToTimestamp(minDate))})`)
      return
    }
    if (maxDate && value > maxDate) {
      setError(`After loaded data (${formatChartDate(dateInputToTimestamp(maxDate, true))})`)
      return
    }
    const ok = onGo?.(value, ts)
    if (ok === false) {
      setError('No candles for this date')
      return
    }
    setError('')
    setOpen(false)
  }

  const openPicker = () => {
    if (disabled) return
    if (!value && maxDate) setValue(maxDate)
    setError('')
    setOpen((o) => !o)
  }

  const isToolbar = variant === 'toolbar'
  const isInline = variant === 'inline'

  if (isInline) {
    return (
      <div className="go-to-date-inline">
        <input
          type="date"
          value={value}
          min={minDate || undefined}
          max={maxDate || undefined}
          onChange={(e) => { setValue(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button type="button" className="btn-primary btn-sm" onClick={submit} disabled={disabled}>Go</button>
        {error && <div className="go-to-date-error">{error}</div>}
      </div>
    )
  }

  return (
    <div className={`go-to-date-wrap ${isToolbar ? 'go-to-date-wrap--toolbar' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className={isToolbar ? 'chart-float-btn' : 'btn-ghost'}
        onClick={openPicker}
        disabled={disabled}
        title={title}
      >
        <Calendar size={isToolbar ? 18 : 14} />
        {!isToolbar && <span className="go-to-date-label">Go to Date</span>}
      </button>

      {open && (
        <div className={`go-to-date-popover ${isToolbar ? 'go-to-date-popover--up' : ''}`}>
          <div className="go-to-date-title">Go to date</div>
          <input
            type="date"
            value={value}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          {minDate && maxDate && (
            <div className="go-to-date-hint">
              Loaded: {formatChartDate(dateInputToTimestamp(minDate))} → {formatChartDate(dateInputToTimestamp(maxDate, true))}
            </div>
          )}
          {error && <div className="go-to-date-error">{error}</div>}
          <div className="go-to-date-actions">
            <button type="button" className="btn-primary btn-sm" onClick={submit}>Go</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function makeGoToDateRequest(dayStartSec) {
  if (!dayStartSec) return null
  return { time: dayStartSec, tick: Date.now() }
}
