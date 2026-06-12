import axios from 'axios'

const BINANCE = 'https://api.binance.com'

const CRYPTO_FALLBACK = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT'
]

let binanceSymbolsCache = null
let binanceCacheAt = 0
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

async function loadBinanceSymbols() {
  if (binanceSymbolsCache && Date.now() - binanceCacheAt < CACHE_TTL_MS) {
    return binanceSymbolsCache
  }
  const resp = await axios.get(`${BINANCE}/api/v3/exchangeInfo`, { timeout: 20000 })
  binanceSymbolsCache = (resp.data.symbols || []).filter((s) => s.status === 'TRADING')
  binanceCacheAt = Date.now()
  return binanceSymbolsCache
}

export async function fetchBinanceSymbols(query = '') {
  const q = query.trim().toUpperCase()

  try {
    const symbols = await loadBinanceSymbols()
    const filtered = symbols
      .filter(
        (s) =>
          !q ||
          s.symbol?.includes(q) ||
          s.baseAsset?.includes(q) ||
          s.quoteAsset?.includes(q)
      )
      .sort((a, b) => {
        if (!q) return 0
        const aStarts = a.symbol.startsWith(q) || a.baseAsset?.startsWith(q) ? 0 : 1
        const bStarts = b.symbol.startsWith(q) || b.baseAsset?.startsWith(q) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return a.symbol.localeCompare(b.symbol)
      })
      .slice(0, 50)
      .map((s) => ({ symbol: s.symbol, base: s.baseAsset, quote: s.quoteAsset }))
    return filtered
  } catch (e) {
    return CRYPTO_FALLBACK.filter((s) => !q || s.includes(q)).map((s) => ({ symbol: s }))
  }
}

export async function fetchAlphaVantageSearch(query = '') {
  const key = import.meta.env.VITE_ALPHA_VANTAGE_KEY || ''
  if (!key) return []
  try {
    const params = new URLSearchParams({ function: 'SYMBOL_SEARCH', keywords: query, apikey: key })
    const resp = await axios.get(`https://www.alphavantage.co/query?${params.toString()}`)
    const matches = resp.data.bestMatches || []
    return matches.slice(0, 20).map((m) => ({ symbol: m['1. symbol'], name: m['2. name'] }))
  } catch (e) {
    return []
  }
}
