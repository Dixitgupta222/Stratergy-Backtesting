/** Forex pair universe — keep in sync with api/lib/forexSymbols.js */
export const FOREX_PAIRS = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', base: 'EUR', quote: 'USD', type: 'major' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', base: 'GBP', quote: 'USD', type: 'major' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', base: 'USD', quote: 'JPY', type: 'major' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', base: 'USD', quote: 'CHF', type: 'major' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', base: 'AUD', quote: 'USD', type: 'major' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', base: 'USD', quote: 'CAD', type: 'major' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', base: 'NZD', quote: 'USD', type: 'major' },
  { symbol: 'EURGBP', name: 'Euro / British Pound', base: 'EUR', quote: 'GBP', type: 'cross' },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen', base: 'EUR', quote: 'JPY', type: 'cross' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', base: 'GBP', quote: 'JPY', type: 'cross' },
  { symbol: 'EURCHF', name: 'Euro / Swiss Franc', base: 'EUR', quote: 'CHF', type: 'cross' },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar', base: 'EUR', quote: 'AUD', type: 'cross' },
  { symbol: 'EURNZD', name: 'Euro / New Zealand Dollar', base: 'EUR', quote: 'NZD', type: 'cross' },
  { symbol: 'EURCAD', name: 'Euro / Canadian Dollar', base: 'EUR', quote: 'CAD', type: 'cross' },
  { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar', base: 'GBP', quote: 'AUD', type: 'cross' },
  { symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar', base: 'GBP', quote: 'CAD', type: 'cross' },
  { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', base: 'GBP', quote: 'CHF', type: 'cross' },
  { symbol: 'GBPNZD', name: 'British Pound / New Zealand Dollar', base: 'GBP', quote: 'NZD', type: 'cross' },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', base: 'AUD', quote: 'JPY', type: 'cross' },
  { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', base: 'AUD', quote: 'CAD', type: 'cross' },
  { symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc', base: 'AUD', quote: 'CHF', type: 'cross' },
  { symbol: 'AUDNZD', name: 'Australian Dollar / New Zealand Dollar', base: 'AUD', quote: 'NZD', type: 'cross' },
  { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen', base: 'CAD', quote: 'JPY', type: 'cross' },
  { symbol: 'CADCHF', name: 'Canadian Dollar / Swiss Franc', base: 'CAD', quote: 'CHF', type: 'cross' },
  { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen', base: 'CHF', quote: 'JPY', type: 'cross' },
  { symbol: 'NZDJPY', name: 'New Zealand Dollar / Japanese Yen', base: 'NZD', quote: 'JPY', type: 'cross' },
  { symbol: 'NZDCAD', name: 'New Zealand Dollar / Canadian Dollar', base: 'NZD', quote: 'CAD', type: 'cross' },
  { symbol: 'NZDCHF', name: 'New Zealand Dollar / Swiss Franc', base: 'NZD', quote: 'CHF', type: 'cross' },
  { symbol: 'USDINR', name: 'US Dollar / Indian Rupee', base: 'USD', quote: 'INR', type: 'exotic' },
  { symbol: 'USDSGD', name: 'US Dollar / Singapore Dollar', base: 'USD', quote: 'SGD', type: 'exotic' },
  { symbol: 'USDHKD', name: 'US Dollar / Hong Kong Dollar', base: 'USD', quote: 'HKD', type: 'exotic' },
  { symbol: 'USDCNH', name: 'US Dollar / Chinese Yuan', base: 'USD', quote: 'CNH', type: 'exotic' },
  { symbol: 'USDMXN', name: 'US Dollar / Mexican Peso', base: 'USD', quote: 'MXN', type: 'exotic' },
  { symbol: 'USDZAR', name: 'US Dollar / South African Rand', base: 'USD', quote: 'ZAR', type: 'exotic' },
  { symbol: 'USDTRY', name: 'US Dollar / Turkish Lira', base: 'USD', quote: 'TRY', type: 'exotic' },
  { symbol: 'USDSEK', name: 'US Dollar / Swedish Krona', base: 'USD', quote: 'SEK', type: 'exotic' },
  { symbol: 'USDNOK', name: 'US Dollar / Norwegian Krone', base: 'USD', quote: 'NOK', type: 'exotic' },
  { symbol: 'USDDKK', name: 'US Dollar / Danish Krone', base: 'USD', quote: 'DKK', type: 'exotic' },
  { symbol: 'USDPLN', name: 'US Dollar / Polish Zloty', base: 'USD', quote: 'PLN', type: 'exotic' },
  { symbol: 'USDBRL', name: 'US Dollar / Brazilian Real', base: 'USD', quote: 'BRL', type: 'exotic' },
  { symbol: 'XAUUSD', name: 'Gold / US Dollar (Spot)', base: 'XAU', quote: 'USD', type: 'metal' },
  { symbol: 'XAGUSD', name: 'Silver / US Dollar (Spot)', base: 'XAG', quote: 'USD', type: 'metal' },
  { symbol: 'XPTUSD', name: 'Platinum / US Dollar (Spot)', base: 'XPT', quote: 'USD', type: 'metal' },
  { symbol: 'XPDUSD', name: 'Palladium / US Dollar (Spot)', base: 'XPD', quote: 'USD', type: 'metal' }
]

export const FOREX_SYMBOL_SET = new Set(FOREX_PAIRS.map((p) => p.symbol))

export const FOREX_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD',
  'INR', 'SGD', 'HKD', 'CNH', 'MXN', 'ZAR', 'TRY', 'SEK',
  'NOK', 'DKK', 'PLN', 'BRL', 'XAU', 'XAG', 'XPT', 'XPD'
])

export function isForexSymbol(symbol) {
  const s = String(symbol || '').toUpperCase().trim().replace(/=X$/, '')
  if (!s || s.length !== 6) return false
  if (FOREX_SYMBOL_SET.has(s)) return true
  const base = s.slice(0, 3)
  const quote = s.slice(3)
  return FOREX_CURRENCIES.has(base) && FOREX_CURRENCIES.has(quote) && base !== quote
}

export function filterForexHints(query = '', limit = 50) {
  const q = query.trim().toUpperCase()
  if (!q) {
    return FOREX_PAIRS.filter((p) => p.type === 'major' || p.type === 'metal')
      .slice(0, 8)
      .map((p) => ({ ...p, market: 'forex' }))
  }
  return FOREX_PAIRS.filter((item) => {
    const sym = item.symbol.toUpperCase()
    const name = (item.name || '').toUpperCase()
    return sym.includes(q) || sym.startsWith(q) || name.includes(q)
  })
    .slice(0, limit)
    .map((p) => ({ ...p, market: 'forex' }))
}
