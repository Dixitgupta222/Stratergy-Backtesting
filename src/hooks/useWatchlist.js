import { useCallback, useEffect, useState } from 'react'
import { fetch24hTickers } from '../services/ticker'
import { fetchIndiaQuotes } from '../services/indiaMarket'
import { detectSymbolMarket } from '../utils/symbolType'

const STORAGE_KEY = 'trading-panel-watchlist'
const DEFAULT = ['BTCUSDT', 'ETHUSDT', 'NIFTY', 'RELIANCE', 'EURUSD']

function loadList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return DEFAULT
}

export function useWatchlist() {
  const [symbols, setSymbols] = useState(loadList)
  const [tickers, setTickers] = useState({})

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols)) } catch { /* ignore */ }
  }, [symbols])

  useEffect(() => {
    if (!symbols.length) {
      setTickers({})
      return
    }
    let mounted = true
    const poll = async () => {
      const cryptoSyms = symbols.filter((s) => detectSymbolMarket(s) === 'crypto')
      const indiaSyms = symbols.filter((s) => detectSymbolMarket(s) === 'stocks')
      const [crypto, india] = await Promise.all([
        fetch24hTickers(cryptoSyms),
        fetchIndiaQuotes(indiaSyms)
      ])
      if (mounted) setTickers({ ...crypto, ...india })
    }
    poll()
    const id = setInterval(poll, 10000)
    return () => { mounted = false; clearInterval(id) }
  }, [symbols])

  const addSymbol = useCallback((sym) => {
    const s = String(sym).trim().toUpperCase()
    if (!s) return
    setSymbols((prev) => (prev.includes(s) ? prev : [...prev, s]))
  }, [])

  const removeSymbol = useCallback((sym) => {
    setSymbols((prev) => prev.filter((x) => x !== sym))
  }, [])

  return { symbols, tickers, addSymbol, removeSymbol, setSymbols }
}
