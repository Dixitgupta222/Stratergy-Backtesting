import { fetchCryptoHistory, extendCryptoHistory } from './historicalData'
import { fetchForexHistory, extendForexHistory, shouldExtendForexHistory } from './forexMarket'
import { fetchIndiaHistory } from './indiaMarket'
import { detectSymbolMarket } from '../utils/symbolType'
import { BACKTEST_MS, shouldExtendHistoryInBackground } from '../utils/backtestConfig'

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

export async function extendMarketHistory(symbol, timeframe, existing, onProgress, market = null, options = {}) {
  const m = market || detectSymbolMarket(symbol)
  if (m === 'crypto' && shouldExtendHistoryInBackground(timeframe)) {
    return extendCryptoHistory(symbol, timeframe, existing, BACKTEST_MS, onProgress, options)
  }
  if (m === 'forex' && shouldExtendForexHistory(timeframe)) {
    return extendForexHistory(symbol, timeframe, existing, onProgress, options)
  }
  return existing
}

export function shouldExtendHistory(timeframe, market = null) {
  if (market === 'forex') return shouldExtendForexHistory(timeframe)
  return shouldExtendHistoryInBackground(timeframe)
}

export { shouldExtendHistoryInBackground, shouldExtendForexHistory }
