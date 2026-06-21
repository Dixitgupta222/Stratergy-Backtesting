import axios from 'axios'
import { BACKTEST_MS, getInitialFetchMs } from '../utils/backtestConfig'
import { tfToSeconds } from '../utils/chartHelpers'

const BINANCE = 'https://api.binance.com'
const MAX_LIMIT = 1000
const PAGE_DELAY_MS = 60
/** Show chart after this many candles while the rest of 1m/5m history streams in */
const EARLY_CHART_CANDLES = 3_000

const cache = new Map()

function cacheKey(symbol, interval, historyMs) {
  return `${symbol}_${interval}_${historyMs}`
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

function sortCandles(byTime) {
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time)
}

async function fetchKlinePages({
  symbol,
  interval,
  targetStartMs,
  endTimeStart,
  onProgress,
  signal,
  initialByTime = null
}) {
  const sym = symbol.replace('/', '').replace('-', '').toUpperCase()
  const intervalMs = tfToSeconds(interval) * 1000
  const historyMs = Date.now() - targetStartMs
  const estimatedCandles = Math.ceil(historyMs / intervalMs)
  const estimatedPages = Math.ceil(estimatedCandles / MAX_LIMIT)

  const byTime = initialByTime ?? new Map()
  let endTime = endTimeStart ?? Date.now()
  let page = 0
  let emittedEarly = false

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

    const partial = sortCandles(byTime)
    const progress = {
      loaded: page,
      total: estimatedPages,
      candles: partial.length,
      cached: false,
      partial: !emittedEarly && partial.length >= EARLY_CHART_CANDLES ? partial : undefined
    }
    if (progress.partial) emittedEarly = true
    onProgress?.(progress)

    const oldestMs = batch[0].time * 1000
    if (oldestMs <= targetStartMs) break
    if (batch.length < MAX_LIMIT) break

    endTime = oldestMs - 1
    await sleep(PAGE_DELAY_MS)
  }

  const data = sortCandles(byTime)
  const trimmed = data.filter((c) => c.time * 1000 >= targetStartMs - intervalMs)
  return trimmed.length ? trimmed : data
}

/**
 * Fetch Binance klines paginated back to the full backtest window.
 * Dense intervals stream partial data for a fast first paint.
 */
export async function fetchCryptoHistory(symbol, interval, historyMs, onProgress, { signal } = {}) {
  const sym = symbol.replace('/', '').replace('-', '').toUpperCase()
  const windowMs = historyMs ?? BACKTEST_MS
  const key = cacheKey(sym, interval, windowMs)
  if (cache.has(key)) {
    const cached = cache.get(key)
    onProgress?.({ loaded: 1, total: 1, candles: cached.length, cached: true })
    return cached
  }

  const targetStartMs = Date.now() - windowMs
  const result = await fetchKlinePages({
    symbol: sym,
    interval,
    targetStartMs,
    onProgress,
    signal
  })

  cache.set(key, result)
  return result
}

/** Load older candles in the background after the fast initial fetch. */
export async function extendCryptoHistory(
  symbol,
  interval,
  existing,
  targetMs = BACKTEST_MS,
  onProgress,
  { signal } = {}
) {
  if (!existing?.length) return existing

  const sym = symbol.replace('/', '').replace('-', '').toUpperCase()
  const fullKey = cacheKey(sym, interval, targetMs)
  if (cache.has(fullKey)) return cache.get(fullKey)

  const targetStartMs = Date.now() - targetMs
  const oldestMs = existing[0].time * 1000
  if (oldestMs <= targetStartMs) {
    cache.set(fullKey, existing)
    return existing
  }

  const byTime = new Map(existing.map((c) => [c.time, c]))
  const result = await fetchKlinePages({
    symbol: sym,
    interval,
    targetStartMs,
    endTimeStart: oldestMs - 1,
    onProgress,
    signal,
    initialByTime: byTime
  })

  cache.set(fullKey, result)
  return result
}

export function clearHistoryCache() {
  cache.clear()
}
