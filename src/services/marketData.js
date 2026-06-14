import { fetchCryptoHistory } from './historicalData'
import { fetchIndiaHistory } from './indiaMarket'
import { fetchForexHistory } from './forexMarket'
import { detectSymbolMarket } from '../utils/symbolType'

export async function fetchMarketHistory(symbol, timeframe, onProgress, market = null, options = {}) {
  const m = market || detectSymbolMarket(symbol)
  if (m === 'crypto') {
    return fetchCryptoHistory(symbol, timeframe, undefined, onProgress, options)
  }
  if (m === 'stocks') {
    return fetchIndiaHistory(symbol, timeframe, onProgress, options)
  }
  if (m === 'forex') {
    return fetchForexHistory(symbol, timeframe, onProgress, options)
  }
  throw new Error(`Unsupported market for ${symbol}`)
}
