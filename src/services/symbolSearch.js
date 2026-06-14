import { filterSymbolHints } from '../data/symbolHints'
import { filterForexHints } from '../data/forexPairs'
import { fetchBinanceSymbols } from './symbols'
import { fetchIndiaSymbols } from './indiaMarket'
import { fetchForexSymbols } from './forexMarket'

function mergeResults(...lists) {
  const seen = new Set()
  const out = []
  for (const list of lists) {
    for (const item of list) {
      const key = `${item.market}:${item.symbol}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
      if (out.length >= 50) return out
    }
  }
  return out
}

function rankResults(items, query) {
  const q = query.trim().toUpperCase()
  if (!q) return items

  return [...items].sort((a, b) => {
    const score = (item) => {
      const sym = item.symbol.toUpperCase()
      if (sym === q) return 0
      if (sym.startsWith(q)) return 1
      if (sym.includes(q)) return 2
      if ((item.name || '').toUpperCase().includes(q)) return 3
      return 4
    }
    const diff = score(a) - score(b)
    if (diff !== 0) return diff
    const order = { stocks: 0, forex: 1, crypto: 2 }
    return (order[a.market] ?? 9) - (order[b.market] ?? 9)
  })
}

/**
 * Crypto + NSE + Forex search.
 * Local hints show instantly; API results merge in.
 */
export async function searchAllSymbols(query = '') {
  const q = query.trim()
  const local = [
    ...filterSymbolHints(q).map((x) => ({ ...x })),
    ...filterForexHints(q).map((x) => ({ ...x }))
  ]

  const [cryptoRes, indiaRes, forexRes] = await Promise.allSettled([
    fetchBinanceSymbols(q),
    fetchIndiaSymbols(q),
    fetchForexSymbols(q)
  ])

  const crypto =
    cryptoRes.status === 'fulfilled'
      ? cryptoRes.value.map((x) => ({ ...x, market: 'crypto' }))
      : []
  const india =
    indiaRes.status === 'fulfilled'
      ? indiaRes.value.map((x) => ({ ...x, market: 'stocks' }))
      : []
  const forex =
    forexRes.status === 'fulfilled'
      ? forexRes.value.map((x) => ({ ...x, market: 'forex' }))
      : []

  return rankResults(mergeResults(local, india, forex, crypto), q).slice(0, 50)
}

/** Synchronous instant hints for dropdown while API loads */
export function searchSymbolsInstant(query = '') {
  return [
    ...filterSymbolHints(query),
    ...filterForexHints(query)
  ].slice(0, 50)
}
