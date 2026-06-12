import React, { useState } from 'react'
import { Star, Plus, X } from 'lucide-react'
import { formatChartPrice } from './CandleTimer'

export default function Watchlist({ symbols, tickers, onSelect, onAdd, onRemove, activeSymbol }) {
  const [input, setInput] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      onAdd(input)
      setInput('')
    }
  }

  return (
    <div className="watchlist">
      <div className="watchlist-header">
        <Star size={14} />
        <span>Watchlist</span>
      </div>
      <form className="watchlist-add" onSubmit={submit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Add symbol…"
        />
        <button type="submit" title="Add"><Plus size={14} /></button>
      </form>
      <div className="watchlist-items">
        {symbols.map((sym) => {
          const t = tickers[sym]
          const up = (t?.changePct ?? 0) >= 0
          return (
            <div
              key={sym}
              className={`watchlist-item ${activeSymbol === sym ? 'active' : ''}`}
              onClick={() => onSelect(sym)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(sym)}
            >
              <div className="wl-symbol">{sym.replace('USDT', '')}</div>
              <div className="wl-right">
                <div className="wl-price">{t ? formatChartPrice(t.price) : '—'}</div>
                <div className={`wl-change ${up ? 'up' : 'down'}`}>
                  {t ? `${up ? '+' : ''}${t.changePct.toFixed(2)}%` : '—'}
                </div>
              </div>
              <button
                type="button"
                className="wl-remove"
                onClick={(e) => { e.stopPropagation(); onRemove(sym) }}
                title="Remove"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
