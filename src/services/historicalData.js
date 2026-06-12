import axios from 'axios'
import { BACKTEST_MS } from '../utils/backtestConfig'
import { tfToSeconds } from '../utils/chartHelpers'

const BINANCE = 'https://api.binance.com'
const MAX_LIMIT = 1000
const PAGE_DELAY_MS = 60

const cache = new Map()

function cacheKey(symbol, interval, monthsMs) {
  return `${symbol}_${interval}_${monthsMs}`
}

function parseKline(k) {
  return {
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5])
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Fetch Binance klines paginated back to at least `monthsBack` months.
 * Binance allows max 1000 candles per request — we page backwards with endTime.
 */
export async function fetchCryptoHistory(symbol, interval, monthsBackMs = BACKTEST_MS, onProgress, { signal } = {}) {
  const sym = symbol.replace('/', '').replace('-', '').toUpperCase()
  const key = cacheKey(sym, interval, monthsBackMs)
  if (cache.has(key)) {
    onProgress?.({ loaded: 1, total: 1, candles: cache.get(key).length, cached: true })
    return cache.get(key)
  }

  const targetStartMs = Date.now() - monthsBackMs
  const intervalMs = tfToSeconds(interval) * 1000
  const estimatedCandles = Math.ceil(monthsBackMs / intervalMs)
  const estimatedPages = Math.ceil(estimatedCandles / MAX_LIMIT)

  const byTime = new Map()
  let endTime = Date.now()
  let page = 0

  while (true) {
    const params = new URLSearchParams({
      symbol: sym,
      interval,
      limit: String(MAX_LIMIT),
      endTime: String(endTime)
    })
    const resp = await axios.get(`${BINANCE}/api/v3/klines?${params.toString()}`, { signal })
    const batch = (resp.data || []).map(parseKline)
    if (!batch.length) break

    batch.forEach((c) => byTime.set(c.time, c))
    page += 1
    onProgress?.({ loaded: page, total: estimatedPages, candles: byTime.size, cached: false })

    const oldestMs = batch[0].time * 1000
    if (oldestMs <= targetStartMs) break
    if (batch.length < MAX_LIMIT) break

    endTime = oldestMs - 1
    await sleep(PAGE_DELAY_MS)
  }

  const data = Array.from(byTime.values()).sort((a, b) => a.time - b.time)

  // Trim to slightly before target (keep all within window)
  const trimmed = data.filter((c) => c.time * 1000 >= targetStartMs - intervalMs)
  const result = trimmed.length ? trimmed : data

  cache.set(key, result)
  return result
}

export function clearHistoryCache() {
  cache.clear()
}
