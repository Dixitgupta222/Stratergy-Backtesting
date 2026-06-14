const { applyCors, handleOptions } = require('../lib/cors')
const { toYahooSymbol } = require('../lib/forexSymbols')

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return
  applyCors(res)

  if (req.method !== 'GET') {
    res.status(405).json({ detail: 'Method not allowed' })
    return
  }

  const raw = String(req.query.symbols || '').trim()
  if (!raw) {
    res.status(400).json({ detail: 'symbols is required' })
    return
  }

  const symList = raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 40)
  const yfSymbols = symList.map((s) => toYahooSymbol(s))
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yfSymbols.join(','))}`

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradingPanel/1.0)',
        Accept: 'application/json'
      }
    })

    if (!resp.ok) {
      res.status(502).json({ detail: `Yahoo Finance HTTP ${resp.status}` })
      return
    }

    const json = await resp.json()
    const quotes = json?.quoteResponse?.result || []
    const byYf = Object.fromEntries(quotes.map((q) => [q.symbol, q]))
    const out = {}

    for (let i = 0; i < symList.length; i++) {
      const sym = symList[i]
      const yf = yfSymbols[i]
      const q = byYf[yf]
      if (!q) {
        out[sym] = { price: null, changePct: null, high: null, low: null }
        continue
      }
      const last = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice ?? null
      const prev = q.regularMarketPreviousClose ?? last
      const changePct = prev ? ((last - prev) / prev) * 100 : null
      out[sym] = {
        price: last,
        changePct,
        high: q.regularMarketDayHigh ?? last,
        low: q.regularMarketDayLow ?? last
      }
    }

    res.status(200).json(out)
  } catch (err) {
    console.error('forex/quotes error:', err)
    res.status(502).json({ detail: err.message || 'Failed to fetch forex quotes' })
  }
}
