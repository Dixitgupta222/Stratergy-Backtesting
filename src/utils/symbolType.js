/** @typedef {'crypto' | 'stocks' | 'forex'} SymbolMarket */

export const MARKET_LABELS = {
  crypto: 'Crypto',
  stocks: 'NSE',
  forex: 'Forex'
}

const INDIA_INDICES = new Set([
  'NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT', 'NIFTYPHARMA', 'NIFTYAUTO',
  'NIFTYFMCG', 'NIFTYMETAL', 'NIFTYREALTY', 'NIFTYENERGY', 'NIFTYINFRA', 'NIFTYPSUBANK',
  'NIFTYMIDCAP50', 'NIFTYNEXT50', 'INDIAVIX'
])

const FOREX_PAIRS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD', 'EURCHF', 'GBPAUD',
  'XAUUSD', 'XAGUSD'
])

const CRYPTO_SUFFIXES = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB']

/**
 * Guess market from symbol string (used when loading charts / watchlist).
 * @param {string} symbol
 * @returns {SymbolMarket}
 */
export function detectSymbolMarket(symbol) {
  const s = String(symbol || '').toUpperCase().trim()
  if (!s) return 'crypto'

  if (INDIA_INDICES.has(s) || s.endsWith('.NS') || s.endsWith('.BO')) return 'stocks'
  if (FOREX_PAIRS.has(s)) return 'forex'
  if (CRYPTO_SUFFIXES.some((x) => s.endsWith(x)) && s.length >= 6) return 'crypto'
  if (/^[A-Z]{6}$/.test(s) && (s.startsWith('USD') || s.endsWith('USD') || s.includes('JPY'))) return 'forex'

  // Short tickers without crypto quote suffix → NSE equity
  if (/^[A-Z][A-Z0-9.&-]{0,18}$/.test(s) && s.length <= 15) return 'stocks'

  return 'crypto'
}

export function marketLabel(market) {
  return MARKET_LABELS[market] || market
}

export function supportsLiveStream(market) {
  return market === 'crypto'
}

export function supportsBacktest(market) {
  return market === 'crypto' || market === 'stocks'
}

export function scrollToLiveOnReset(market) {
  return market === 'crypto' || market === 'stocks'
}
