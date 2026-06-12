import axios from 'axios'

const BINANCE = 'https://api.binance.com'

export async function fetch24hTickers(symbols = []) {
  if (!symbols.length) return {}
  try {
    const params = new URLSearchParams({ symbols: JSON.stringify(symbols.map((s) => s.toUpperCase())) })
    const resp = await axios.get(`${BINANCE}/api/v3/ticker/24hr?${params.toString()}`)
    const map = {}
    ;(resp.data || []).forEach((t) => {
      map[t.symbol] = {
        price: parseFloat(t.lastPrice),
        changePct: parseFloat(t.priceChangePercent),
        high: parseFloat(t.highPrice),
        low: parseFloat(t.lowPrice)
      }
    })
    return map
  } catch {
    return {}
  }
}
