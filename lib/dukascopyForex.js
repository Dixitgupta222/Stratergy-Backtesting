/** Broker-grade forex + metals via Dukascopy (free, no API key). */
const { getHistoricalRates, getRealTimeRates } = require('dukascopy-node')

/** Backtest window — ~4 months for all intraday TFs used in replay */
const BACKTEST_DAYS = 124
const FOREX_1M_BACKTEST_DAYS = BACKTEST_DAYS

const CACHE_TTL_MS = 15 * 60 * 1000
const historyCache = new Map()

const TIMEFRAME_MAP = {
  '1m': 'm1',
  '5m': 'm5',
  '15m': 'm15',
  '1h': 'h1',
  '4h': 'h4',
  '1d': 'd1',
  '1w': 'd1',
  '1M': 'mn1'
}

/** Max history to fetch per timeframe */
const LOOKBACK_DAYS = {
  '1m': FOREX_1M_BACKTEST_DAYS,
  '5m': FOREX_1M_BACKTEST_DAYS,
  '15m': BACKTEST_DAYS,
  '1h': BACKTEST_DAYS,
  '4h': BACKTEST_DAYS,
  '1d': 1825,
  '1w': 3650,
  '1M': 7300
}

/** Fast first paint for dense intervals */
const INITIAL_DAYS = {
  '1m': 14,
  '5m': 30
}

function toDukascopyInstrument(symbol) {
  return String(symbol || '').toUpperCase().trim().replace(/=X$/, '').toLowerCase()
}

function maxLookbackDays(intervalKey) {
  return LOOKBACK_DAYS[intervalKey] ?? BACKTEST_DAYS
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

function resampleWeekly(candles) {
  if (!candles.length) return candles
  const bucketSeconds = 7 * 86400
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

function mapBar(bar) {
  return {
    time: Math.floor(bar.timestamp / 1000),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume ?? 0
  }
}

function sortUnique(candles) {
  const byTime = new Map()
  for (const c of candles) byTime.set(c.time, c)
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time)
}

function trimToDays(candles, days, intervalKey, endMs = Date.now()) {
  if (!candles.length || intervalKey === '1w' || intervalKey === '1M') return candles
  const cutoff = Math.floor((endMs - days * 86400 * 1000) / 1000)
  return candles.filter((c) => c.time >= cutoff)
}

function postProcess(candles, intervalKey) {
  let out = candles
  if (intervalKey === '4h') out = resample4h(out)
  if (intervalKey === '1w') out = resampleWeekly(out)
  return out
}

async function fetchRange(instrument, timeframe, from, to) {
  return getHistoricalRates({
    instrument,
    dates: { from, to },
    timeframe,
    format: 'json',
    priceType: 'bid',
    volumes: true,
    ignoreFlats: true,
    useCache: true,
    batchSize: 12,
    pauseBetweenBatchesMs: 150
  })
}

/**
 * @param {string} symbol
 * @param {string} intervalKey
 * @param {{ days?: number, onProgress?: Function }} [opts]
 */
async function fetchDukascopyCandles(symbol, intervalKey = '15m', opts = {}) {
  const instrument = toDukascopyInstrument(symbol)
  const maxDays = maxLookbackDays(intervalKey)
  const offsetDays = Math.max(0, opts.offsetDays ?? 0)
  const requestedDays = Math.min(opts.days ?? maxDays, maxDays)
  const cacheKey = `${instrument}_${intervalKey}_${requestedDays}_o${offsetDays}_v2`
  const cached = historyCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    opts.onProgress?.({ loaded: 1, total: 1, candles: cached.data.length, cached: true })
    return cached.data
  }

  const timeframe = TIMEFRAME_MAP[intervalKey] || 'm15'
  const to = new Date(Date.now() - offsetDays * 86400 * 1000)
  const from = new Date(to.getTime() - requestedDays * 86400 * 1000)

  // 1m: fetch in weekly chunks so we can report progress and avoid timeouts
  const chunkDays = intervalKey === '1m' ? 7 : requestedDays
  const chunks = []
  let cursor = new Date(from)
  const end = new Date(to)
  while (cursor < end) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + chunkDays * 86400 * 1000, end.getTime()))
    chunks.push({ from: new Date(cursor), to: new Date(chunkEnd) })
    cursor = chunkEnd
  }

  const all = []
  for (let i = 0; i < chunks.length; i++) {
    const { from: chunkFrom, to: chunkTo } = chunks[i]
    const raw = await fetchRange(instrument, timeframe, chunkFrom, chunkTo)
    if (raw?.length) all.push(...raw.map(mapBar))
    opts.onProgress?.({
      loaded: i + 1,
      total: chunks.length,
      candles: all.length,
      cached: false,
      partial: intervalKey === '1m' && all.length > 3000 ? sortUnique(all) : undefined
    })
  }

  let candles = trimToDays(sortUnique(all), requestedDays, intervalKey, to.getTime())
  candles = postProcess(candles, intervalKey)

  historyCache.set(cacheKey, { at: Date.now(), data: candles })
  // Also cache under max days key when full range fetched
  if (requestedDays >= maxDays) {
    historyCache.set(`${instrument}_${intervalKey}_${maxDays}_v2`, { at: Date.now(), data: candles })
  }

  return candles
}

function getForexInitialDays(intervalKey) {
  return INITIAL_DAYS[intervalKey] ?? null
}

function getForexMaxDays(intervalKey) {
  return maxLookbackDays(intervalKey)
}

async function fetchDukascopyQuote(symbol) {
  const instrument = toDukascopyInstrument(symbol)
  const bars = await getRealTimeRates({
    instrument,
    timeframe: 'm1',
    format: 'json',
    last: 2,
    priceType: 'bid',
    volumes: false
  })

  if (!bars?.length) {
    return { price: null, changePct: null, high: null, low: null }
  }

  const last = bars[bars.length - 1]
  const prev = bars.length > 1 ? bars[bars.length - 2] : last
  const price = last.close
  const changePct = prev.close ? ((price - prev.close) / prev.close) * 100 : null

  return {
    price,
    changePct,
    high: last.high ?? price,
    low: last.low ?? price
  }
}

async function fetchDukascopyQuotes(symbols) {
  const out = {}
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        out[sym] = await fetchDukascopyQuote(sym)
      } catch {
        out[sym] = { price: null, changePct: null, high: null, low: null }
      }
    })
  )
  return out
}

module.exports = {
  toDukascopyInstrument,
  fetchDukascopyCandles,
  fetchDukascopyQuote,
  fetchDukascopyQuotes,
  getForexInitialDays,
  getForexMaxDays,
  FOREX_1M_BACKTEST_DAYS,
  BACKTEST_DAYS
}
