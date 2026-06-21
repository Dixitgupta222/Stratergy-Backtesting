import axios from 'axios'

import { filterForexHints } from '../data/forexPairs'
import { getForexMaxDays, shouldExtendForexHistory } from '../utils/forexBacktestConfig'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API = API_BASE ? `${API_BASE}/api/forex` : '/api/forex'
const HISTORY_TIMEOUT_MS = 180000

const historyCache = new Map()

function historyCacheKey(symbol, interval, days) {
  return `v2_${symbol.trim().toUpperCase()}_${interval}_${days ?? 'full'}`
}

export async function fetchForexSymbols(query = '') {
  try {
    const resp = await axios.get(`${API}/symbols`, { params: { q: query, limit: 50 } })
    return (resp.data || []).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      type: item.type || 'major',
      base: item.base,
      quote: item.quote
    }))
  } catch {
    return filterForexHints(query)
  }
}

export async function fetchForexHistory(symbol, interval = '1d', onProgress, { signal, days } = {}) {
  const sym = symbol.trim().toUpperCase().replace(/=X$/, '')
  const fetchDays = days ?? getForexMaxDays(interval)
  const key = historyCacheKey(sym, interval, fetchDays)
  if (historyCache.has(key)) {
    const cached = historyCache.get(key)
    onProgress?.({ loaded: 1, total: 1, candles: cached.length, cached: true })
    return cached
  }

  onProgress?.({ loaded: 0, total: 1, cached: false })
  try {
    const resp = await axios.get(`${API}/history`, {
      params: { symbol: sym, interval, days: fetchDays },
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
    if (typeof msg === 'string' && msg) {
      if (msg === 'Not Found') {
        throw new Error('Forex API route missing. Restart dev server (npm run dev).')
      }
      throw new Error(msg)
    }
    if (e.response?.status === 404 && typeof e.response?.data !== 'object') {
      throw new Error('Forex API not found. Redeploy with Vercel serverless /api routes enabled.')
    }
    if (e.code === 'ECONNABORTED') {
      throw new Error(
        import.meta.env.PROD
          ? 'Forex data request timed out. Try again in a moment.'
          : 'Forex data request timed out. Check npm run api is running.'
      )
    }
    if (e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED') {
      throw new Error(
        import.meta.env.PROD
          ? 'Could not reach forex market API.'
          : 'Forex market API offline. Run: npm run api'
      )
    }
    throw new Error(e.message || 'Failed to load forex data')
  }
}

export async function extendForexHistory(symbol, interval, existing, onProgress, { signal } = {}) {
  const sym = symbol.trim().toUpperCase().replace(/=X$/, '')
  const maxDays = getForexMaxDays(interval)
  const fullKey = historyCacheKey(sym, interval, maxDays)
  if (historyCache.has(fullKey)) return historyCache.get(fullKey)

  const oldestMs = existing?.[0]?.time * 1000
  const targetStartMs = Date.now() - maxDays * 86400 * 1000
  if (existing?.length && oldestMs <= targetStartMs + 86400 * 1000) {
    historyCache.set(fullKey, existing)
    return existing
  }

  return fetchForexHistory(sym, interval, onProgress, { signal, days: maxDays })
}

export { shouldExtendForexHistory }

export async function fetchForexQuotes(symbols = []) {
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

export function clearForexHistoryCache() {
  historyCache.clear()
}
