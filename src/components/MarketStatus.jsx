import React, { useEffect, useState } from 'react'
import { detectSymbolMarket } from '../utils/symbolType'
import { formatHMS, getMarketSession } from '../utils/marketHours'

export default function MarketStatus({ symbol = 'BTCUSDT' }) {
  const [status, setStatus] = useState({ open: true, label: 'Open', countdown: null })
  const market = detectSymbolMarket(symbol)

  useEffect(() => {
    let mounted = true
    const tick = () => {
      try {
        const session = getMarketSession(market)
        if (!mounted) return
        setStatus({
          open: session.open,
          label: session.label,
          countdown: session.countdownSec != null ? formatHMS(session.countdownSec) : null
        })
      } catch (e) {
        if (mounted) setStatus({ open: false, label: 'Unknown', countdown: null })
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [market])

  return (
    <div className="market-status">
      <span className={`status-indicator ${status.open ? 'open' : 'closed'}`} />
      <span className="status-text">{status.label}</span>
      {status.countdown && <span className="status-countdown"> — {status.countdown}</span>}
    </div>
  )
}
