import { filterForexHints } from './forexPairs'

/** Instant local suggestions — no network required */
export const SYMBOL_HINTS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', market: 'crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum', market: 'crypto' },
  { symbol: 'BNBUSDT', name: 'BNB', market: 'crypto' },
  { symbol: 'SOLUSDT', name: 'Solana', market: 'crypto' },
  { symbol: 'XRPUSDT', name: 'Ripple', market: 'crypto' },
  { symbol: 'ADAUSDT', name: 'Cardano', market: 'crypto' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', market: 'crypto' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', market: 'crypto' },
  { symbol: 'NIFTY', name: 'Nifty 50', market: 'stocks', type: 'index' },
  { symbol: 'BANKNIFTY', name: 'Nifty Bank', market: 'stocks', type: 'index' },
  { symbol: 'SENSEX', name: 'BSE Sensex', market: 'stocks', type: 'index' },
  { symbol: 'FINNIFTY', name: 'Nifty Financial Services', market: 'stocks', type: 'index' },
  { symbol: 'NIFTYIT', name: 'Nifty IT', market: 'stocks', type: 'index' },
  { symbol: 'RELIANCE', name: 'Reliance Industries', market: 'stocks' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', market: 'stocks' },
  { symbol: 'INFY', name: 'Infosys', market: 'stocks' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', market: 'stocks' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', market: 'stocks' },
  { symbol: 'SBIN', name: 'State Bank of India', market: 'stocks' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', market: 'stocks' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', market: 'stocks' },
  ...filterForexHints('', 6)
]

export function filterSymbolHints(query = '', limit = 50) {
  const q = query.trim().toUpperCase()
  if (!q) return SYMBOL_HINTS.slice(0, 14)

  return SYMBOL_HINTS.filter((item) => {
    const sym = item.symbol.toUpperCase()
    const name = (item.name || '').toUpperCase()
    return sym.includes(q) || sym.startsWith(q) || name.includes(q)
  }).slice(0, limit)
}
