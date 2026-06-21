const METAL_SYMBOLS = new Set(['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'])

const METAL_DECIMALS = {
  XAUUSD: 2,
  XAGUSD: 3,
  XPTUSD: 2,
  XPDUSD: 2
}

/** Pairs quoted in JPY — 3 decimal places (pip = 0.01) */
const JPY_DECIMALS = 3

/** Standard majors/crosses — 5 decimal places (pip = 0.0001) */
const STANDARD_FOREX_DECIMALS = 5

/** Exotics with wider quotes */
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

export function normalizeForexSymbol(symbol) {
  return String(symbol || '').toUpperCase().trim().replace(/=X$/, '')
}

export function isMetalSymbol(symbol) {
  return METAL_SYMBOLS.has(normalizeForexSymbol(symbol))
}

/** Spot metals need Finnhub OANDA — Yahoo fallback uses COMEX futures (wrong price). */
export function requiresFinnhubForSpot(symbol) {
  return isMetalSymbol(symbol)
}

export function getForexPriceDecimals(symbol) {
  const s = normalizeForexSymbol(symbol)
  if (!s || s.length !== 6) return 2

  if (METAL_DECIMALS[s] != null) return METAL_DECIMALS[s]

  const base = s.slice(0, 3)
  const quote = s.slice(3)

  if (quote === 'JPY' || base === 'JPY') return JPY_DECIMALS
  if (EXOTIC_QUOTE_DECIMALS[quote] != null) return EXOTIC_QUOTE_DECIMALS[quote]

  return STANDARD_FOREX_DECIMALS
}

export function roundForexPrice(symbol, price) {
  if (price == null || Number.isNaN(Number(price))) return price
  const decimals = getForexPriceDecimals(symbol)
  const factor = 10 ** decimals
  return Math.round(Number(price) * factor) / factor
}

export function normalizeForexCandles(symbol, candles) {
  if (!candles?.length) return candles || []
  return candles.map((c) => ({
    ...c,
    open: roundForexPrice(symbol, c.open),
    high: roundForexPrice(symbol, c.high),
    low: roundForexPrice(symbol, c.low),
    close: roundForexPrice(symbol, c.close)
  }))
}

export function getChartPriceFormat(symbol, market = 'forex') {
  if (market !== 'forex') {
    return { type: 'price', precision: 2, minMove: 0.01 }
  }
  const precision = getForexPriceDecimals(symbol)
  const minMove = 10 ** -precision
  return { type: 'price', precision, minMove }
}
