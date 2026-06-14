import React, { useEffect, useState, useRef } from 'react'
import { searchAllSymbols, searchSymbolsInstant } from '../services/symbolSearch'
import { marketLabel } from '../utils/symbolType'

export default function Autocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef()
  const timer = useRef()
  const reqId = useRef(0)

  // Sync from parent only when not actively editing
  useEffect(() => {
    if (!focused) setQuery(value || '')
  }, [value, focused])

  useEffect(() => {
    if (!focused) return

    // Instant local matches (BTC, NIFTY, etc.)
    const instant = searchSymbolsInstant(query)
    setItems(instant)
    setOpen(true)
    setHighlight(0)

    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const id = ++reqId.current
      setLoading(true)
      try {
        const res = await searchAllSymbols(query)
        if (id !== reqId.current) return
        setItems(res.length ? res : instant)
        setOpen(true)
      } catch {
        if (id === reqId.current) {
          setItems(instant)
          setOpen(instant.length > 0)
        }
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer.current)
  }, [query, focused])

  useEffect(() => {
    const onMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return
      if (e.key === 'ArrowDown') setHighlight((h) => Math.min(h + 1, items.length - 1))
      if (e.key === 'ArrowUp') setHighlight((h) => Math.max(h - 1, 0))
      if (e.key === 'Enter') {
        e.preventDefault()
        select(items[highlight])
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setFocused(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, highlight])

  const select = (it) => {
    if (!it) return
    const s = it.symbol || it
    setQuery(s)
    onChange(s, it)
    setOpen(false)
    setFocused(false)
  }

  const commitQuery = () => {
    const s = query.trim().toUpperCase()
    if (s) onChange(s)
  }

  const handleBlur = () => {
    setTimeout(() => {
      commitQuery()
      setFocused(false)
      setOpen(false)
    }, 150)
  }

  return (
    <div className="autocomplete" ref={ref}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!focused) setFocused(true)
        }}
        onFocus={() => {
          setFocused(true)
          const instant = searchSymbolsInstant(query)
          setItems(instant)
          setOpen(true)
        }}
        onBlur={handleBlur}
        placeholder="BTC, NIFTY, EURUSD, XAUUSD…"
        autoComplete="off"
        spellCheck={false}
      />
      {open && focused && (
        <div className="autocomplete-list">
          {loading && items.length === 0 && (
            <div className="autocomplete-status">Searching…</div>
          )}
          {!loading && items.length === 0 && query.trim() && (
            <div className="autocomplete-status">No matches</div>
          )}
          {items.map((it, i) => (
            <div
              key={`${it.market}-${it.symbol}-${i}`}
              className={`autocomplete-item ${i === highlight ? 'highlight' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(it)}
            >
              <div className="a-symbol-row">
                <div className="a-symbol">{it.symbol}</div>
                <span className={`a-market a-market--${it.market}`}>{marketLabel(it.market)}</span>
              </div>
              <div className="a-meta">
                {it.type === 'index' ? 'Index' : it.name || (it.base && it.quote ? `${it.base}/${it.quote}` : '')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
