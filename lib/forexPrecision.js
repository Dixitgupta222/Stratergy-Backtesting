const METAL_SYMBOLS = new Set(['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'])

const METAL_DECIMALS = {
  XAUUSD: 2,
  XAGUSD: 3,
  XPTUSD: 2,
  XPDUSD: 2
}

const JPY_DECIMALS = 3
const STANDARD_FOREX_DECIMALS = 5

const EXOTIC_QUOTE_DECIMALS = {
  INR: 4,
  TRY: 4,
  ZAR: 4,
  MXN: 4,
  BRL: 4,
  PLN: 4,
  SEK: 4,
  NOK: 4,
  DKK: 4,
  CNH: 4,
  HKD: 4,
  SGD: 4
}

function normalizeForexSymbol(symbol) {
  return String(symbol || '').toUpperCase().trim().replace(/=X$/, '')
}

function isMetalSymbol(symbol) {
  return METAL_SYMBOLS.has(normalizeForexSymbol(symbol))
}

function requiresFinnhubForSpot(symbol) {
  return isMetalSymbol(symbol)
}

function getForexPriceDecimals(symbol) {
  const s = normalizeForexSymbol(symbol)
  if (!s || s.length !== 6) return 2

  if (METAL_DECIMALS[s] != null) return METAL_DECIMALS[s]

  const base = s.slice(0, 3)
  const quote = s.slice(3)

  if (quote === 'JPY' || base === 'JPY') return JPY_DECIMALS
  if (EXOTIC_QUOTE_DECIMALS[quote] != null) return EXOTIC_QUOTE_DECIMALS[quote]

  return STANDARD_FOREX_DECIMALS
}

function roundForexPrice(symbol, price) {
  if (price == null || Number.isNaN(Number(price))) return price
  const decimals = getForexPriceDecimals(symbol)
  const factor = 10 ** decimals
  return Math.round(Number(price) * factor) / factor
}

function normalizeForexCandles(symbol, candles) {
  if (!candles?.length) return candles || []
  return candles.map((c) => ({
    ...c,
    open: roundForexPrice(symbol, c.open),
    high: roundForexPrice(symbol, c.high),
    low: roundForexPrice(symbol, c.low),
    close: roundForexPrice(symbol, c.close)
  }))
}

function normalizeForexQuote(symbol, quote) {
  if (!quote) return quote
  return {
    ...quote,
    price: roundForexPrice(symbol, quote.price),
    high: roundForexPrice(symbol, quote.high),
    low: roundForexPrice(symbol, quote.low)
  }
}

module.exports = {
  isMetalSymbol,
  requiresFinnhubForSpot,
  getForexPriceDecimals,
  roundForexPrice,
  normalizeForexCandles,
  normalizeForexQuote
}
