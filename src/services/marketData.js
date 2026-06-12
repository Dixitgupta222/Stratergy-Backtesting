import { fetchCryptoHistory } from './historicalData'
import { fetchIndiaHistory } from './indiaMarket'
import { fetchAlphaVantage } from './dataFetch'
import { detectSymbolMarket } from '../utils/symbolType'

export async function fetchMarketHistory(symbol, timeframe, onProgress, market = null, options = {}) {
  const m = market || detectSymbolMarket(symbol)
  if (m === 'crypto') {
    return fetchCryptoHistory(symbol, timeframe, undefined, onProgress, options)
  }
  if (m === 'stocks') {
    return fetchIndiaHistory(symbol, timeframe, onProgress, options)
  }
  return fetchAlphaVantage(symbol, timeframe)
}
