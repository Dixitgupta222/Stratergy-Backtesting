/** Broker-grade forex + metals via Dukascopy (free, no API key). */
const { getHistoricalRates, getRealTimeRates } = require('dukascopy-node')

const BACKTEST_DAYS = 124
const CACHE_TTL_MS = 10 * 60 * 1000
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

const LOOKBACK_DAYS = {
  '1m': 10,
  '5m': 30,
  '15m': 60,
  '1h': 730,
  '4h': 730,
  '1d': 1825,
  '1w': 3650,
  '1M': 7300
}

function toDukascopyInstrument(symbol) {
  return String(symbol || '').toUpperCase().trim().replace(/=X$/, '').toLowerCase()
}

function lookbackDays(intervalKey) {
  return Math.min(LOOKBACK_DAYS[intervalKey] || 60, BACKTEST_DAYS + 30)
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

async function fetchDukascopyCandles(symbol, intervalKey = '15m') {
  const cacheKey = `${toDukascopyInstrument(symbol)}_${intervalKey}`
  const cached = historyCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data
  }

  const instrument = toDukascopyInstrument(symbol)
  const timeframe = TIMEFRAME_MAP[intervalKey] || 'm15'
  const to = new Date()
  const from = new Date(Date.now() - lookbackDays(intervalKey) * 86400 * 1000)

  const raw = await getHistoricalRates({
    instrument,
    dates: { from, to },
    timeframe,
    format: 'json',
    priceType: 'bid',
    volumes: true,
    ignoreFlats: true,
    useCache: true,
    batchSize: 12,
    pauseBetweenBatchesMs: 200
  })

  if (!raw?.length) return []

  let candles = raw.map(mapBar)
  const cutoff = Math.floor((Date.now() - BACKTEST_DAYS * 86400 * 1000) / 1000)
  if (intervalKey !== '1w' && intervalKey !== '1M') {
    candles = candles.filter((c) => c.time >= cutoff)
  }

  if (intervalKey === '4h') candles = resample4h(candles)
  if (intervalKey === '1w') candles = resampleWeekly(candles)

  historyCache.set(cacheKey, { at: Date.now(), data: candles })
  return candles
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
  fetchDukascopyQuotes
}
