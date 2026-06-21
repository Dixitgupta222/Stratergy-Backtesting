/** Spot forex + metals via Finnhub OANDA feed (matches broker/TradingView-style prices). */
const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const BACKTEST_DAYS = 124

const RESOLUTION_MAP = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '60',
  '1d': 'D',
  '1w': 'W',
  '1M': 'M'
}

const LOOKBACK_SECONDS = {
  '1m': 60 * 24 * 3600,
  '5m': 60 * 24 * 3600,
  '15m': 60 * 24 * 3600,
  '1h': 730 * 24 * 3600,
  '4h': 730 * 24 * 3600,
  '1d': 5 * 365 * 24 * 3600,
  '1w': 10 * 365 * 24 * 3600,
  '1M': 20 * 365 * 24 * 3600
}

function toFinnhubSymbol(symbol) {
  const s = String(symbol || '').toUpperCase().trim().replace(/=X$/, '')
  if (!s || s.length !== 6) throw new Error(`Invalid forex symbol: ${symbol}`)
  const base = s.slice(0, 3)
  const quote = s.slice(3)
  return `OANDA:${base}_${quote}`
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

async function finnhubGet(path, apiKey) {
  const url = `${FINNHUB_BASE}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(apiKey)}`
  const resp = await fetch(url, {
    headers: { Accept: 'application/json' }
  })
  if (!resp.ok) {
    let detail = ''
    try {
      const body = await resp.json()
      detail = body?.error ? `: ${body.error}` : ''
    } catch {
      /* ignore */
    }
    const err = new Error(`Finnhub HTTP ${resp.status}${detail}`)
    err.status = resp.status
    throw err
  }
  return resp.json()
}

function isFinnhubPremiumError(err) {
  return err?.status === 403 || String(err?.message || '').includes('403')
}

async function fetchFinnhubQuote(symbol, apiKey) {
  const fh = toFinnhubSymbol(symbol)
  const q = await finnhubGet(`/quote?symbol=${encodeURIComponent(fh)}`, apiKey)
  if (!q || q.c == null || q.c === 0) {
    return { price: null, changePct: null, high: null, low: null }
  }
  const changePct = q.pc ? ((q.c - q.pc) / q.pc) * 100 : null
  return {
    price: q.c,
    changePct,
    high: q.h ?? q.c,
    low: q.l ?? q.c
  }
}

async function fetchFinnhubQuotes(symbols, apiKey) {
  const out = {}
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        out[sym] = await fetchFinnhubQuote(sym, apiKey)
      } catch {
        out[sym] = { price: null, changePct: null, high: null, low: null }
      }
    })
  )
  return out
}

async function fetchFinnhubCandles(symbol, intervalKey, apiKey) {
  const resolution = RESOLUTION_MAP[intervalKey] || RESOLUTION_MAP['1d']
  const lookback = LOOKBACK_SECONDS[intervalKey] || LOOKBACK_SECONDS['1d']
  const now = Math.floor(Date.now() / 1000)
  const from = now - lookback
  const fh = toFinnhubSymbol(symbol)

  const data = await finnhubGet(
    `/forex/candle?symbol=${encodeURIComponent(fh)}&resolution=${resolution}&from=${from}&to=${now}`,
    apiKey
  )

  if (data.s !== 'ok' || !data.t?.length) return []

  const candles = data.t.map((t, i) => ({
    time: t,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v?.[i] ?? 0
  }))

  const skipCutoff = intervalKey === '1w' || intervalKey === '1M'
  const cutoff = Math.floor((Date.now() - BACKTEST_DAYS * 24 * 60 * 60 * 1000) / 1000)
  let out = skipCutoff ? candles : candles.filter((c) => c.time >= cutoff)

  if (intervalKey === '4h' && out.length) {
    out = resample4h(out)
  }

  return out
}

module.exports = {
  toFinnhubSymbol,
  fetchFinnhubQuotes,
  fetchFinnhubCandles,
  isFinnhubPremiumError
}
