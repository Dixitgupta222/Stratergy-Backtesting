import React, { useEffect, useState } from 'react'
import { tfToSeconds } from '../utils/chartHelpers'
import { formatHMS, getMarketSession } from '../utils/marketHours'

export { tfToSeconds } from '../utils/chartHelpers'

/** Format price to match chart axis precision */
export function formatChartPrice(price) {
  if (price == null || Number.isNaN(price)) return '—'
  const p = Number(price)
  const abs = Math.abs(p)
  let decimals = 2
  if (abs < 0.01) decimals = 6
  else if (abs < 1) decimals = 5
  else if (abs < 100) decimals = 4
  return p.toFixed(decimals)
}

export default function CandleTimer({ timeframe = '1m', variant = 'default', market = 'crypto' }) {
  const [remaining, setRemaining] = useState(0)
  const [session, setSession] = useState(() => getMarketSession(market))

  const is24x7 = session.is24x7
  const marketOpen = session.open

  useEffect(() => {
    let mounted = true
    const updateSession = () => {
      if (mounted) setSession(getMarketSession(market))
    }
    updateSession()
    const sessionId = setInterval(updateSession, 1000)
    return () => {
      mounted = false
      clearInterval(sessionId)
    }
  }, [market])

  useEffect(() => {
    if (!is24x7 && !marketOpen) {
      setRemaining(0)
      return undefined
    }

    let mounted = true
    const intervalSec = tfToSeconds(timeframe)

    const tick = () => {
      const epochSec = Math.floor(Date.now() / 1000)
      const elapsed = epochSec % intervalSec
      const rem = elapsed === 0 ? 0 : intervalSec - elapsed
      if (mounted) setRemaining(rem)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [timeframe, is24x7, marketOpen])

  if (!is24x7 && !marketOpen) {
    const label = session.countdownSec != null
      ? formatHMS(session.countdownSec)
      : 'Closed'
    if (variant === 'scale') {
      const tip = session.countdownSec != null
        ? `${session.label} · Opens in ${formatHMS(session.countdownSec)}`
        : session.label
      return <span className="ps-timer ps-timer--closed" title={tip}>Closed</span>
    }
    return (
      <div className="candle-timer candle-timer--closed" title={session.label}>
        <div className="ct-text">{label}</div>
        <div className="ct-bar">
          <div className="ct-bar-fill ct-bar-fill--idle" style={{ width: '0%' }} />
        </div>
      </div>
    )
  }

  const fmtCountdown = (s) => formatHMS(s)

  if (variant === 'scale') {
    return <span className="ps-timer">{fmtCountdown(remaining)}</span>
  }

  const total = tfToSeconds(timeframe) || 60
  const elapsed = total - remaining
  const pct = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0

  return (
    <div className="candle-timer" title={`Time until next ${timeframe} candle closes`}>
      <div className="ct-text">{fmtCountdown(remaining)}</div>
      <div className="ct-bar">
        <div className="ct-bar-fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

export function getCandleOpenTime(epochSec, timeframe) {
  const intervalSec = tfToSeconds(timeframe)
  return Math.floor(epochSec / intervalSec) * intervalSec
}
