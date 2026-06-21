const { applyCors, handleOptions } = require('../../lib/cors')
const { toYahooSymbol } = require('../../lib/forexSymbols')
const { fetchFinnhubQuotes, isFinnhubPremiumError } = require('../../lib/finnhubForex')
const { fetchDukascopyQuotes } = require('../../lib/dukascopyForex')
const { normalizeForexQuote } = require('../../lib/forexPrecision')

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
  const finnhubKey = process.env.FINNHUB_API_KEY

  try {
    let out = {}
    let source = 'dukascopy'

    if (finnhubKey) {
      try {
        const finnhub = await fetchFinnhubQuotes(symList, finnhubKey)
        const hasData = symList.some((s) => finnhub[s]?.price != null)
        if (hasData) {
          out = finnhub
          source = 'finnhub'
        }
      } catch (err) {
        if (!isFinnhubPremiumError(err)) {
          console.error('forex/quotes finnhub error:', err.message)
        }
      }
    }

    if (source !== 'finnhub') {
      out = await fetchDukascopyQuotes(symList)
    }

    for (const sym of symList) {
      out[sym] = normalizeForexQuote(sym, out[sym])
    }

    res.setHeader('X-Forex-Source', source)
    res.status(200).json(out)
  } catch (err) {
    console.error('forex/quotes error:', err)
    res.status(502).json({ detail: err.message || 'Failed to fetch forex quotes' })
  }
}
