import React from 'react'
import { formatChartPrice } from './CandleTimer'
import { detectSymbolMarket, marketLabel, supportsLiveStream } from '../utils/symbolType'

function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export default function SymbolInfoStrip({ symbol, lastCandle, prevCandle, liveStatus, ticker24h }) {
  const close = lastCandle?.close
  const open = lastCandle?.open
  const high = lastCandle?.high
  const low = lastCandle?.low
  const market = detectSymbolMarket(symbol)

  const ref = prevCandle?.close ?? open
  const changePct = ref && close != null ? ((close - ref) / ref) * 100 : ticker24h?.changePct
  const isUp = (changePct ?? 0) >= 0

  const base = symbol?.replace(/USDT$|USD$/, '') || symbol

  return (
    <div className="symbol-info-strip">
      <div className="sis-left">
        <div className="sis-symbol-row">
          <span className="sis-icon">{base.slice(0, 1)}</span>
          <div>
            <div className="sis-symbol">{symbol}</div>
            <div className="sis-asset">{marketLabel(market)}</div>
          </div>
          {supportsLiveStream(market) && (
            <span className={`live-dot ${liveStatus}`} title={liveStatus} />
          )}
        </div>
        <div className={`sis-price ${isUp ? 'up' : 'down'}`}>
          {close != null ? formatChartPrice(close) : '—'}
          <span className={`sis-change ${isUp ? 'up' : 'down'}`}>{fmtPct(changePct)}</span>
        </div>
      </div>
      <div className="sis-ohlc">
        <div className="sis-ohlc-item"><span>O</span>{open != null ? formatChartPrice(open) : '—'}</div>
        <div className="sis-ohlc-item"><span>H</span>{high != null ? formatChartPrice(high) : '—'}</div>
        <div className="sis-ohlc-item"><span>L</span>{low != null ? formatChartPrice(low) : '—'}</div>
        <div className="sis-ohlc-item"><span>C</span>{close != null ? formatChartPrice(close) : '—'}</div>
      </div>
    </div>
  )
}
