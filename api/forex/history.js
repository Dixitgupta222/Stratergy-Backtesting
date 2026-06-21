const { applyCors, handleOptions } = require('../../lib/cors')
const { toYahooSymbol } = require('../../lib/forexSymbols')
const { fetchYahooCandles } = require('../../lib/yahooChart')
const { fetchFinnhubCandles, isFinnhubPremiumError } = require('../../lib/finnhubForex')
const { fetchDukascopyCandles, getForexMaxDays } = require('../../lib/dukascopyForex')
const { isMetalSymbol, normalizeForexCandles } = require('../../lib/forexPrecision')

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return
  applyCors(res)

  if (req.method !== 'GET') {
    res.status(405).json({ detail: 'Method not allowed' })
    return
  }

  const symbol = String(req.query.symbol || '').trim()
  const interval = String(req.query.interval || '1d')
  const daysParam = parseInt(String(req.query.days || ''), 10)
  const offsetParam = parseInt(String(req.query.offsetDays || '0'), 10)
  const days = Number.isFinite(daysParam) && daysParam > 0
    ? Math.min(daysParam, getForexMaxDays(interval))
    : undefined
  const offsetDays = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0

  if (!symbol) {
    res.status(400).json({ detail: 'symbol is required' })
    return
  }

  try {
    let candles = []
    let source = 'dukascopy'
    const finnhubKey = process.env.FINNHUB_API_KEY

    if (finnhubKey) {
      try {
        candles = await fetchFinnhubCandles(symbol, interval, finnhubKey)
        if (candles.length) source = 'finnhub'
      } catch (err) {
        if (!isFinnhubPremiumError(err)) {
          console.error('forex/history finnhub error:', err.message)
        }
      }
    }

    if (!candles.length) {
      try {
        candles = await fetchDukascopyCandles(symbol, interval, { days, offsetDays })
        source = 'dukascopy'
      } catch (err) {
        console.error('forex/history dukascopy error:', err.message)
      }
    }

    if (!candles.length && !isMetalSymbol(symbol)) {
      const yfSymbol = toYahooSymbol(symbol)
      candles = await fetchYahooCandles(yfSymbol, interval)
      source = 'yahoo'
    }

    candles = normalizeForexCandles(symbol, candles)

    if (!candles.length) {
      res.status(404).json({ detail: `No data for ${symbol}` })
      return
    }

    res.setHeader('X-Forex-Source', source)
    res.status(200).json(candles)
  } catch (err) {
    console.error('forex/history error:', err)
    res.status(502).json({ detail: err.message || 'Failed to fetch forex data' })
  }
}
