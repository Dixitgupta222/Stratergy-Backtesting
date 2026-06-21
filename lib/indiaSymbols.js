const INDIAN_INDICES = [
  { symbol: 'NIFTY', yf: '^NSEI', name: 'Nifty 50', type: 'index' },
  { symbol: 'SENSEX', yf: '^BSESN', name: 'BSE Sensex', type: 'index' },
  { symbol: 'BANKNIFTY', yf: '^NSEBANK', name: 'Nifty Bank', type: 'index' },
  { symbol: 'FINNIFTY', yf: '^CNXFIN', name: 'Nifty Financial Services', type: 'index' },
  { symbol: 'NIFTYIT', yf: '^CNXIT', name: 'Nifty IT', type: 'index' },
  { symbol: 'NIFTYPHARMA', yf: '^CNXPHARMA', name: 'Nifty Pharma', type: 'index' },
  { symbol: 'NIFTYAUTO', yf: '^CNXAUTO', name: 'Nifty Auto', type: 'index' },
  { symbol: 'NIFTYFMCG', yf: '^CNXFMCG', name: 'Nifty FMCG', type: 'index' },
  { symbol: 'NIFTYMETAL', yf: '^CNXMETAL', name: 'Nifty Metal', type: 'index' },
  { symbol: 'NIFTYREALTY', yf: '^CNXREALTY', name: 'Nifty Realty', type: 'index' },
  { symbol: 'NIFTYENERGY', yf: '^CNXENERGY', name: 'Nifty Energy', type: 'index' },
  { symbol: 'NIFTYINFRA', yf: '^CNXINFRA', name: 'Nifty Infra', type: 'index' },
  { symbol: 'NIFTYPSUBANK', yf: '^CNXPSUBANK', name: 'Nifty PSU Bank', type: 'index' },
  { symbol: 'NIFTYMIDCAP50', yf: '^NSEMDCP50', name: 'Nifty Midcap 50', type: 'index' },
  { symbol: 'NIFTYNEXT50', yf: 'NIFTY_NEXT50.NS', name: 'Nifty Next 50', type: 'index' },
  { symbol: 'INDIAVIX', yf: '^INDIAVIX', name: 'India VIX', type: 'index' }
]

const FALLBACK_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', type: 'stock' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', type: 'stock' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', type: 'stock' },
  { symbol: 'INFY', name: 'Infosys Ltd.', type: 'stock' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', type: 'stock' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', type: 'stock' },
  { symbol: 'ITC', name: 'ITC Ltd.', type: 'stock' },
  { symbol: 'SBIN', name: 'State Bank of India', type: 'stock' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', type: 'stock' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', type: 'stock' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', type: 'stock' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', type: 'stock' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', type: 'stock' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', type: 'stock' },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', type: 'stock' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd.', type: 'stock' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', type: 'stock' },
  { symbol: 'WIPRO', name: 'Wipro Ltd.', type: 'stock' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', type: 'stock' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd.', type: 'stock' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', type: 'stock' }
]

const INDEX_BY_SYMBOL = Object.fromEntries(INDIAN_INDICES.map((i) => [i.symbol, i]))

const SYMBOL_UNIVERSE = [
  ...INDIAN_INDICES.map(({ symbol, name, type }) => ({ symbol, name, type })),
  ...FALLBACK_STOCKS
]

function toYahooSymbol(symbol) {
  const s = String(symbol || '').toUpperCase().trim()
  if (!s) throw new Error('Symbol required')
  if (INDEX_BY_SYMBOL[s]) return INDEX_BY_SYMBOL[s].yf
  if (s.startsWith('^')) return s
  if (s.endsWith('.NS') || s.endsWith('.BO')) return s
  return `${s}.NS`
}

function searchSymbols(query = '', limit = 50) {
  const q = String(query).trim().toUpperCase()
  const cap = Math.min(Math.max(limit, 1), 100)

  if (!q) {
    const popular = new Set(FALLBACK_STOCKS.map((x) => x.symbol))
    const seen = new Set()
    const out = []
    for (const item of SYMBOL_UNIVERSE) {
      if (seen.has(item.symbol)) continue
      if (item.type === 'index' || popular.has(item.symbol)) {
        seen.add(item.symbol)
        out.push(item)
        if (out.length >= cap) return out
      }
    }
    return out
  }

  const results = SYMBOL_UNIVERSE.filter((item) => {
    const sym = item.symbol || ''
    const name = (item.name || '').toUpperCase()
    return sym.includes(q) || name.includes(q) || sym.startsWith(q)
  })

  results.sort((a, b) => {
    const aStart = a.symbol.startsWith(q) ? 0 : 1
    const bStart = b.symbol.startsWith(q) ? 0 : 1
    if (aStart !== bStart) return aStart - bStart
    const aIdx = a.type === 'index' ? 0 : 1
    const bIdx = b.type === 'index' ? 0 : 1
    if (aIdx !== bIdx) return aIdx - bIdx
    return a.symbol.localeCompare(b.symbol)
  })

  return results.slice(0, cap)
}

module.exports = {
  INDIAN_INDICES,
  FALLBACK_STOCKS,
  toYahooSymbol,
  searchSymbols
}
