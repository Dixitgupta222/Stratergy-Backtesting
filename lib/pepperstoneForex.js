/**
 * Pepperstone gold/metals via cTrader Open API (Pepperstone is a cTrader broker).
 * Requires a Pepperstone cTrader account + app at https://openapi.ctrader.com/apps
 */
const { TrendbarPeriod } = require('./pepperstoneTrendbarPeriod')

const METAL_SYMBOLS = new Set(['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'])

const TIMEFRAME_TO_PERIOD = {
  '1m': TrendbarPeriod.M1,
  '5m': TrendbarPeriod.M5,
  '15m': TrendbarPeriod.M15,
  '1h': TrendbarPeriod.H1,
  '4h': null,
  '1d': TrendbarPeriod.D1,
  '1w': TrendbarPeriod.W1,
  '1M': TrendbarPeriod.MN1
}

const HISTORY_PAGE = 500
const HISTORY_PAUSE_MS = 220

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function isPepperstoneConfigured() {
  return Boolean(
    process.env.CTRADER_CLIENT_ID &&
    process.env.CTRADER_CLIENT_SECRET &&
    process.env.CTRADER_ACCESS_TOKEN &&
    process.env.CTRADER_ACCOUNT_ID
  )
}

function isPepperstoneMetal(symbol) {
  const s = String(symbol || '').toUpperCase().trim().replace(/=X$/, '')
  return METAL_SYMBOLS.has(s)
}

function priceFromRelative(raw, digits) {
  if (raw == null || Number.isNaN(Number(raw))) return null
  const factor = 10 ** digits
  return Math.round((Number(raw) / 100000) * factor) / factor
}

function trendbarToCandle(bar, digits) {
  const lowRaw = bar.low ?? 0
  const open = priceFromRelative(lowRaw + (bar.deltaOpen ?? 0), digits)
  const high = priceFromRelative(lowRaw + (bar.deltaHigh ?? 0), digits)
  const low = priceFromRelative(lowRaw, digits)
  const close = priceFromRelative(lowRaw + (bar.deltaClose ?? 0), digits)
  const time = (bar.utcTimestampInMinutes ?? 0) * 60
  if (!time || open == null || close == null) return null
  return {
    time,
    open,
    high: high ?? Math.max(open, close),
    low: low ?? Math.min(open, close),
    close,
    volume: bar.volume ?? 0
  }
}

function resample4h(candles) {
  if (!candles.length) return candles
  const bucketSeconds = 4 * 3600
  const buckets = {}
  for (const c of candles) {
    const key = Math.floor(c.time / bucketSeconds) * bucketSeconds
    const b = buckets[key]
    if (!b) {
      buckets[key] = { ...c, time: key }
    } else {
      b.high = Math.max(b.high, c.high)
      b.low = Math.min(b.low, c.low)
      b.close = c.close
      b.volume = (b.volume || 0) + (c.volume || 0)
    }
  }
  return Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => buckets[k])
}

async function loadClient() {
  const { connect } = await import('ctrader-ts')
  const accountId = Number(process.env.CTRADER_ACCOUNT_ID)
  const environment = process.env.CTRADER_ENVIRONMENT === 'live' ? 'live' : 'demo'
  const ct = await connect({
    clientId: process.env.CTRADER_CLIENT_ID,
    clientSecret: process.env.CTRADER_CLIENT_SECRET,
    accessToken: process.env.CTRADER_ACCESS_TOKEN,
    refreshToken: process.env.CTRADER_REFRESH_TOKEN,
    accountId,
    environment
  })
  return ct
}

async function fetchTrendbarPage(ct, symbol, period, fromMs, toMs) {
  const { trendbars, hasMore } = await ct.getTrendbars(symbol, {
    period,
    fromTimestamp: fromMs,
    toTimestamp: toMs,
    count: HISTORY_PAGE
  })
  return { trendbars: trendbars ?? [], hasMore: Boolean(hasMore) }
}

async function fetchPepperstoneTrendbars(ct, symbol, period, fromMs, toMs, digits) {
  const byTime = new Map()
  let cursorTo = toMs
  let guard = 0

  while (cursorTo > fromMs && guard < 80) {
    guard += 1
    const { trendbars, hasMore } = await fetchTrendbarPage(ct, symbol, period, fromMs, cursorTo)
    if (!trendbars.length) break

    let oldestMin = Infinity
    for (const bar of trendbars) {
      const candle = trendbarToCandle(bar, digits)
      if (!candle) continue
      const ms = candle.time * 1000
      if (ms < fromMs || ms > toMs) continue
      byTime.set(candle.time, candle)
      oldestMin = Math.min(oldestMin, bar.utcTimestampInMinutes ?? Infinity)
    }

    if (!hasMore || trendbars.length < HISTORY_PAGE || !Number.isFinite(oldestMin)) break
    cursorTo = oldestMin * 60 * 1000 - 1
    await sleep(HISTORY_PAUSE_MS)
  }

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time)
}

async function fetchPepperstoneCandles(symbol, intervalKey = '15m', opts = {}) {
  const sym = String(symbol || '').toUpperCase().trim().replace(/=X$/, '')
  if (!METAL_SYMBOLS.has(sym)) {
    throw new Error(`Pepperstone feed supports metals only (${sym})`)
  }
  if (!isPepperstoneConfigured()) {
    throw new Error('Pepperstone/cTrader credentials missing (CTRADER_* env vars)')
  }

  const period = TIMEFRAME_TO_PERIOD[intervalKey]
  if (period == null && intervalKey !== '4h') {
    throw new Error(`Unsupported interval for Pepperstone: ${intervalKey}`)
  }

  const maxDays = opts.days ?? 124
  const toMs = Date.now() - (opts.offsetDays ?? 0) * 86400 * 1000
  const fromMs = toMs - maxDays * 86400 * 1000

  const ct = await loadClient()
  try {
    const info = await ct.getSymbolInfo(sym)
    const digits = info?.digits ?? 2
    const fetchPeriod = intervalKey === '4h' ? TrendbarPeriod.H1 : period
    let candles = await fetchPepperstoneTrendbars(ct, sym, fetchPeriod, fromMs, toMs, digits)
    if (intervalKey === '4h') candles = resample4h(candles)
    return candles
  } finally {
    ct.disconnect()
  }
}

async function fetchPepperstoneQuote(symbol) {
  const sym = String(symbol || '').toUpperCase().trim().replace(/=X$/, '')
  if (!METAL_SYMBOLS.has(sym)) {
    return { price: null, changePct: null, high: null, low: null }
  }
  if (!isPepperstoneConfigured()) {
    return { price: null, changePct: null, high: null, low: null }
  }

  const ct = await loadClient()
  try {
    let latest = null
    const stop = await ct.watchSpots([sym], (price) => {
      latest = price
    })
    await sleep(1500)
    await stop()

    if (!latest?.bidDecimal && !latest?.askDecimal) {
      return { price: null, changePct: null, high: null, low: null }
    }

    const price = latest.bidDecimal ?? latest.askDecimal
    const high = latest.askDecimal ?? price
    const low = latest.bidDecimal ?? price
    return { price, changePct: null, high, low }
  } finally {
    ct.disconnect()
  }
}

async function fetchPepperstoneQuotes(symbols) {
  const out = {}
  for (const sym of symbols) {
    try {
      out[sym] = await fetchPepperstoneQuote(sym)
    } catch {
      out[sym] = { price: null, changePct: null, high: null, low: null }
    }
  }
  return out
}

module.exports = {
  isPepperstoneConfigured,
  isPepperstoneMetal,
  fetchPepperstoneCandles,
  fetchPepperstoneQuote,
  fetchPepperstoneQuotes
}
