const INTERVAL_MAP = {
  '1m': { interval: '1m', range: '7d' },
  '5m': { interval: '5m', range: '60d' },
  '15m': { interval: '15m', range: '60d' },
  '1h': { interval: '1h', range: '2y' },
  '4h': { interval: '1h', range: '2y', resample4h: true },
  '1d': { interval: '1d', range: '5y' },
  '1w': { interval: '1wk', range: '10y' },
  '1M': { interval: '1mo', range: 'max' }
}

const BACKTEST_DAYS = 124

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

async function fetchYahooCandles(yfSymbol, intervalKey = '1d') {
  const cfg = INTERVAL_MAP[intervalKey] || INTERVAL_MAP['1d']
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}`)
  url.searchParams.set('interval', cfg.interval)
  url.searchParams.set('range', cfg.range)
  url.searchParams.set('includePrePost', 'false')

  const resp = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TradingPanel/1.0)',
      Accept: 'application/json'
    }
  })

  if (!resp.ok) {
    throw new Error(`Yahoo Finance HTTP ${resp.status}`)
  }

  const json = await resp.json()
  const result = json?.chart?.result?.[0]
  if (!result) {
    throw new Error('No chart data from Yahoo Finance')
  }

  const timestamps = result.timestamp || []
  const q = result.indicators?.quote?.[0] || {}
  const candles = []

  for (let i = 0; i < timestamps.length; i++) {
    const open = q.open?.[i]
    const close = q.close?.[i]
    if (open == null || close == null) continue
    candles.push({
      time: timestamps[i],
      open,
      high: q.high?.[i] ?? open,
      low: q.low?.[i] ?? open,
      close,
      volume: q.volume?.[i] ?? 0
    })
  }

  if (!candles.length) return []

  const skipCutoff = intervalKey === '1w' || intervalKey === '1M'
  const cutoff = Math.floor((Date.now() - BACKTEST_DAYS * 24 * 60 * 60 * 1000) / 1000)
  let out = skipCutoff ? candles : candles.filter((c) => c.time >= cutoff)

  if (cfg.resample4h && out.length) {
    out = resample4h(out)
  }

  return out
}

module.exports = { fetchYahooCandles }
