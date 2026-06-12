const { applyCors, handleOptions } = require('../lib/cors')
const { toYahooSymbol } = require('../lib/indiaSymbols')
const { fetchYahooCandles } = require('../lib/yahooChart')

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return
  applyCors(res)

  if (req.method !== 'GET') {
    res.status(405).json({ detail: 'Method not allowed' })
    return
  }

  const symbol = String(req.query.symbol || '').trim()
  const interval = String(req.query.interval || '1d')

  if (!symbol) {
    res.status(400).json({ detail: 'symbol is required' })
    return
  }

  try {
    const yfSymbol = toYahooSymbol(symbol)
    const candles = await fetchYahooCandles(yfSymbol, interval)

    if (!candles.length) {
      res.status(404).json({ detail: `No data for ${symbol}` })
      return
    }

    res.status(200).json(candles)
  } catch (err) {
    console.error('india/history error:', err)
    res.status(502).json({ detail: err.message || 'Failed to fetch India market data' })
  }
}
