import axios from 'axios'

const API = '/api/india'
const HISTORY_TIMEOUT_MS = 25000

const historyCache = new Map()

function historyCacheKey(symbol, interval) {
  return `${symbol.trim().toUpperCase()}_${interval}`
}

export async function fetchIndiaSymbols(query = '') {
  try {
    const resp = await axios.get(`${API}/symbols`, { params: { q: query, limit: 50 } })
    return (resp.data || []).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      type: item.type || 'stock',
      base: item.type === 'index' ? 'Index' : 'NSE',
      quote: item.symbol
    }))
  } catch (e) {
    const fallback = [
      { symbol: 'NIFTY', name: 'Nifty 50', type: 'index' },
      { symbol: 'BANKNIFTY', name: 'Nifty Bank', type: 'index' },
      { symbol: 'RELIANCE', name: 'Reliance Industries', type: 'stock' },
      { symbol: 'TCS', name: 'Tata Consultancy Services', type: 'stock' },
      { symbol: 'INFY', name: 'Infosys', type: 'stock' }
    ]
    const q = query.trim().toUpperCase()
    return fallback.filter((s) => !q || s.symbol.includes(q) || s.name.toUpperCase().includes(q))
  }
}

export async function fetchIndiaHistory(symbol, interval = '1d', onProgress, { signal } = {}) {
  const sym = symbol.trim().toUpperCase()
  const key = historyCacheKey(sym, interval)
  if (historyCache.has(key)) {
    const cached = historyCache.get(key)
    onProgress?.({ loaded: 1, total: 1, candles: cached.length, cached: true })
    return cached
  }

  onProgress?.({ loaded: 0, total: 1, cached: false })
  try {
    const resp = await axios.get(`${API}/history`, {
      params: { symbol: sym, interval },
      timeout: HISTORY_TIMEOUT_MS,
      signal
    })
    const data = resp.data || []
    if (data.length) historyCache.set(key, data)
    onProgress?.({ loaded: 1, total: 1, candles: data.length, cached: false })
    return data
  } catch (e) {
    if (axios.isCancel(e) || e.code === 'ERR_CANCELED') throw e
    const msg = e.response?.data?.detail
    if (typeof msg === 'string' && msg) throw new Error(msg)
    if (e.code === 'ECONNABORTED') {
      throw new Error('India data request timed out. Check npm run api is running.')
    }
    if (e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED') {
      throw new Error('India market API offline. Run: npm run api')
    }
    throw new Error(e.message || 'Failed to load India market data')
  }
}

export async function fetchIndiaQuotes(symbols = []) {
  if (!symbols.length) return {}
  try {
    const resp = await axios.get(`${API}/quotes`, {
      params: { symbols: symbols.join(',') },
      timeout: 30000
    })
    return resp.data || {}
  } catch {
    return {}
  }
}
